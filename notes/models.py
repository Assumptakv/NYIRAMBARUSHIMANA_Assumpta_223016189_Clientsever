
from django.db import models


class Note(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField(null=True, blank=True)
    title = models.TextField()
    body = models.TextField()
    created_at = models.DateTimeField(null=True, blank=True)

    tags = models.ManyToManyField(
        'Tag',
        through='NoteTag',
        related_name='notes'
    )

    class Meta:
        db_table = 'notes'
        managed = False

    def __str__(self):
        return self.title


class Tag(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField(null=True, blank=True)
    name = models.TextField()
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tags'
        managed = False

    def __str__(self):
        return self.name


class NoteTag(models.Model):
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        db_column='note_id'
    )

    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        db_column='tag_id'
    )

    class Meta:
        db_table = 'note_tags'
        managed = False
        unique_together = (('note', 'tag'),)
