
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Note, Tag, NoteTag
from .authentication import get_supabase_user


# ==========================================
# AUTHENTICATION
# ==========================================

def authenticate_request(request):
    user_id, error, error_status = get_supabase_user(request)

    if error:
        return None, Response(
            {"error": error},
            status=error_status
        )

    return user_id, None


# ==========================================
# SERIALIZE NOTE
# ==========================================

def serialize_note(note):
    return {
        "id": note.id,
        "title": note.title,
        "body": note.body,
        "created_at": (
            note.created_at.isoformat()
            if note.created_at else None
        ),
        "tags": list(
            note.tags.order_by("name").values_list("name", flat=True)
        ),
    }


# ==========================================
# GET ALL NOTES AND CREATE NOTE
# ==========================================

@api_view(["GET", "POST"])
def note_list(request):

    user_id, auth_error = authenticate_request(request)

    if auth_error:
        return auth_error

    # --------------------------------------
    # GET ALL NOTES
    # --------------------------------------

    if request.method == "GET":

        notes = Note.objects.filter(
            user_id=user_id
        ).prefetch_related("tags").order_by("-id")

        search = request.query_params.get("search", "").strip()
        tag = request.query_params.get("tag", "").strip()

        if search:
            notes = notes.filter(
                Q(title__icontains=search) |
                Q(body__icontains=search)
            )

        if tag:
            notes = notes.filter(tags__name=tag)

        return Response(
            [serialize_note(note) for note in notes],
            status=status.HTTP_200_OK
        )

    # --------------------------------------
    # CREATE NOTE
    # --------------------------------------

    if request.method == "POST":

        title = request.data.get("title", "")
        body = request.data.get("body", "")
        tag_ids = request.data.get("tag_ids", [])

        if not isinstance(title, str) or not title.strip():
            return Response(
                {"error": "Note title is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(body, str) or not body.strip():
            return Response(
                {"error": "Note content is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(tag_ids, list):
            return Response(
                {"error": "Tags must be provided as a list."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(tag_ids) != len(set(tag_ids)):
            return Response(
                {"error": "Duplicate tags are not allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        selected_tags = list(
            Tag.objects.filter(
                user_id=user_id,
                id__in=tag_ids
            )
        )

        if len(selected_tags) != len(tag_ids):
            return Response(
                {"error": "One or more selected tags do not exist."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():

            note = Note.objects.create(
                user_id=user_id,
                title=title.strip(),
                body=body.strip()
            )

            relationships = [
                NoteTag(note=note, tag=tag)
                for tag in selected_tags
            ]

            if relationships:
                NoteTag.objects.bulk_create(relationships)

        note = Note.objects.prefetch_related("tags").get(
            id=note.id,
            user_id=user_id
        )

        return Response(
            serialize_note(note),
            status=status.HTTP_201_CREATED
        )


# ==========================================
# GET, UPDATE AND DELETE ONE NOTE
# ==========================================

@api_view(["GET", "PATCH", "DELETE"])
def note_detail(request, note_id):

    user_id, auth_error = authenticate_request(request)

    if auth_error:
        return auth_error

    # --------------------------------------
    # FIND NOTE BELONGING TO CURRENT USER
    # --------------------------------------

    try:
        note = Note.objects.prefetch_related("tags").get(
            id=note_id,
            user_id=user_id
        )

    except Note.DoesNotExist:
        return Response(
            {"error": "Note not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # --------------------------------------
    # GET NOTE DETAILS
    # --------------------------------------

    if request.method == "GET":

        return Response(
            serialize_note(note),
            status=status.HTTP_200_OK
        )

    # --------------------------------------
    # UPDATE NOTE
    # --------------------------------------

    if request.method == "PATCH":

        title = request.data.get("title", note.title)
        body = request.data.get("body", note.body)
        tag_ids = request.data.get("tag_ids", None)

        if not isinstance(title, str) or not title.strip():
            return Response(
                {"error": "Note title cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(body, str) or not body.strip():
            return Response(
                {"error": "Note content cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        selected_tags = None

        if tag_ids is not None:

            if not isinstance(tag_ids, list):
                return Response(
                    {"error": "Tags must be provided as a list."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if len(tag_ids) != len(set(tag_ids)):
                return Response(
                    {"error": "Duplicate tags are not allowed."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            selected_tags = list(
                Tag.objects.filter(
                    user_id=user_id,
                    id__in=tag_ids
                )
            )

            if len(selected_tags) != len(tag_ids):
                return Response(
                    {"error": "One or more selected tags do not exist."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        with transaction.atomic():

            note.title = title.strip()
            note.body = body.strip()
            note.save()

            if selected_tags is not None:

                NoteTag.objects.filter(note=note).delete()

                relationships = [
                    NoteTag(note=note, tag=tag)
                    for tag in selected_tags
                ]

                if relationships:
                    NoteTag.objects.bulk_create(relationships)

        note = Note.objects.prefetch_related("tags").get(
            id=note_id,
            user_id=user_id
        )

        return Response(
            serialize_note(note),
            status=status.HTTP_200_OK
        )

    # --------------------------------------
    # DELETE NOTE
    # --------------------------------------

    if request.method == "DELETE":

        note.delete()

        return Response(
            {"message": "Note deleted successfully."},
            status=status.HTTP_200_OK
        )


# ==========================================
# GET ALL TAGS AND CREATE TAG
# ==========================================

@api_view(["GET", "POST"])
def tag_list(request):

    user_id, auth_error = authenticate_request(request)

    if auth_error:
        return auth_error

    # --------------------------------------
    # GET TAGS
    # --------------------------------------

    if request.method == "GET":

        default_categories = [
            "School",
            "Work",
            "Personal",
            "Projects",
            "Business",
            "Technology",
        ]

        # Ensure every user has their own default categories.
        for category_name in default_categories:
            Tag.objects.get_or_create(
                user_id=user_id,
                name=category_name
            )

        tags = Tag.objects.filter(
            user_id=user_id
        ).order_by("name")

        return Response(
            [
                {
                    "id": tag.id,
                    "name": tag.name
                }
                for tag in tags
            ],
            status=status.HTTP_200_OK
        )

    # --------------------------------------
    # CREATE TAG
    # --------------------------------------

    if request.method == "POST":

        name = request.data.get("name", "")

        if not isinstance(name, str) or not name.strip():
            return Response(
                {"error": "Tag name is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        name = name.strip()

        if Tag.objects.filter(
            user_id=user_id,
            name__iexact=name
        ).exists():
            return Response(
                {"error": "This tag already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tag = Tag.objects.create(
                user_id=user_id,
                name=name
            )

        except Exception:
            return Response(
                {"error": "Could not create tag. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "id": tag.id,
                "name": tag.name
            },
            status=status.HTTP_201_CREATED
        )


# ==========================================
# TAG ANALYTICS
# ==========================================

@api_view(["GET"])
def tag_analytics(request):

    user_id, auth_error = authenticate_request(request)

    if auth_error:
        return auth_error

    analytics = Tag.objects.filter(
        user_id=user_id
    ).annotate(
        note_count=Count("notes", distinct=True)
    ).order_by("name")

    result = [
        {
            "tag_id": tag.id,
            "tag_name": tag.name,
            "note_count": tag.note_count
        }
        for tag in analytics
    ]

    return Response(
        result,
        status=status.HTTP_200_OK
    )
