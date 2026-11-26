
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Note = {
  id: number;
  title: string;
  body: string;
  created_at: string | null;
  tags: string[];
};

type Tag = {
  id: number;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NoteDetails({ id }: { id: string }) {
  const router = useRouter();

  const [note, setNote] = useState<Note | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      router.replace("/login");
      throw new Error("Please log in to continue.");
    }

    return data.session.access_token;
  }

  async function loadNote() {
    try {
      setLoading(true);
      setError("");

      const token = await getAccessToken();

      const [noteResponse, tagsResponse] = await Promise.all([
        fetch(`${API_URL}/notes/${id}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/tags/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (noteResponse.status === 401 || tagsResponse.status === 401) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const noteData = await noteResponse.json();
      const tagsData = await tagsResponse.json();

      if (!noteResponse.ok) {
        throw new Error(noteData.error || "Unable to load note.");
      }

      if (!tagsResponse.ok) {
        throw new Error(tagsData.error || "Unable to load categories.");
      }

      setNote(noteData);
      setTags(tagsData);

      setEditTitle(noteData.title);
      setEditBody(noteData.body);

      const assignedIds = tagsData
        .filter((tag: Tag) => noteData.tags.includes(tag.name))
        .map((tag: Tag) => tag.id);

      setSelectedTagIds(assignedIds);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadNote();
    }
  }, [id]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((previous) =>
      previous.includes(tagId)
        ? previous.filter((id) => id !== tagId)
        : [...previous, tagId]
    );
  }

  function startEditing() {
    if (note) {
      setEditTitle(note.title);
      setEditBody(note.body);

      setSelectedTagIds(
        tags
          .filter((tag) => note.tags.includes(tag.name))
          .map((tag) => tag.id)
      );
    }

    setEditing(true);
    setError("");
    setMessage("");
  }

  async function updateNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const token = await getAccessToken();

      const response = await fetch(`${API_URL}/notes/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
          tag_ids: selectedTagIds,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Could not update note."
        );
      }

      setEditing(false);
      setMessage("Note and tags updated successfully!");

      await loadNote();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update the note."
      );
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    if (note) {
      setEditTitle(note.title);
      setEditBody(note.body);

      setSelectedTagIds(
        tags
          .filter((tag) => note.tags.includes(tag.name))
          .map((tag) => tag.id)
      );
    }

    setEditing(false);
    setError("");
    setMessage("");
  }

  async function deleteNote() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      const token = await getAccessToken();

      const response = await fetch(`${API_URL}/notes/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.status === 401) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Could not delete note.");
      }

      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete note."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">

        <button
          onClick={() => router.push("/")}
          className="mb-6 inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-100 sm:mb-8"
        >
          { "\u2190" } Back to My Notes
        </button>

        {loading ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            Loading note...
          </div>
        ) : error && !note ? (
          <div className="rounded-xl bg-red-100 p-6 text-red-700">
            {error}
          </div>
        ) : note ? (
          <article className="w-full min-w-0 rounded-xl border bg-white p-4 shadow-sm sm:p-8">

            <p className="mb-3 text-sm font-medium text-indigo-600">
              Note Details
            </p>

            {message && (
              <p className="mb-5 rounded-lg bg-green-100 p-3 text-green-700">
                {message}
              </p>
            )}

            {error && (
              <p className="mb-5 rounded-lg bg-red-100 p-3 text-red-700">
                {error}
              </p>
            )}

            {editing ? (
              <form onSubmit={updateNote} className="w-full min-w-0 space-y-2">

                <h1 className="mb-5 text-xl font-bold sm:text-2xl">
                  Edit Note
                </h1>

                <label className="mb-2 block font-medium">
                  Note Title
                </label>

                <input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mb-5 block w-full min-w-0 rounded-lg border border-slate-300 p-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <label className="mb-2 block font-medium">
                  Note Content
                </label>

                <textarea
                  required
                  rows={6}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="mb-6 block w-full min-w-0 resize-y rounded-lg border border-slate-300 p-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <div className="mb-6">
                  <h2 className="mb-2 font-semibold">
                    Manage Tags
                  </h2>

                  <p className="mb-4 text-sm text-slate-500">
                    Select one or more categories for this note.
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition ${
                          selectedTagIds.includes(tag.id)
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTagIds.includes(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                          className="h-4 w-4 accent-indigo-600"
                        />

                        <span className="text-sm font-medium">
                          {tag.name}
                        </span>
                      </label>
                    ))}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    {selectedTagIds.length} tag(s) selected
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="w-full rounded-lg border px-5 py-3 font-medium hover:bg-slate-100 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h1 className="mb-6 text-3xl font-bold">
                  {note.title}
                </h1>

                <p className="whitespace-pre-wrap leading-8 text-slate-600">
                  {note.body}
                </p>

                <div className="mt-8 border-t pt-5">
                  <h2 className="mb-3 font-semibold">Tags</h2>

                  <div className="flex flex-wrap gap-2">
                    {note.tags && note.tags.length > 0 ? (
                      note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        No tags assigned.
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
                  <button
                    onClick={startEditing}
                    className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 sm:w-auto"
                  >
                    Edit Note
                  </button>

                  <button
                    onClick={deleteNote}
                    disabled={deleting}
                    className="w-full rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-50 sm:w-auto"
                  >
                    {deleting ? "Deleting..." : "Delete Note"}
                  </button>
                </div>

                <p className="mt-8 text-sm text-slate-400">
                  Note ID: {note.id}
                </p>
              </>
            )}
          </article>
        ) : null}
      </div>
    </main>
  );
}


