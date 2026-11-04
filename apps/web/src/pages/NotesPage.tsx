import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Item, type Note, type Subject } from "../api";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { PhotoLightbox } from "../components/PhotoLightbox";
import { ViewHero } from "../components/ViewHero";
import { usePeriod } from "../period-context";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

type DraftPhoto = { id: string; dataUrl: string; data: string };

function NotePhoto({
  id,
  onOpen,
}: {
  id: string;
  onOpen?: (src: string) => void;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .getNoteImage(id)
      .then((image) => {
        if (!alive || !image.data) return;
        setSrc(`data:${image.mime || "image/jpeg"};base64,${image.data}`);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [id]);

  if (!src) return <span className="photo-placeholder" aria-hidden />;
  if (!onOpen) return <img src={src} alt="" />;
  return (
    <button
      type="button"
      className="photo-open"
      onClick={() => onOpen(src)}
      aria-label="Ver foto ampliada"
    >
      <img src={src} alt="" />
    </button>
  );
}

async function compressImage(file: File): Promise<DraftPhoto> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Cada foto debe pesar menos de 8 MB antes de comprimir");
  }
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  let data = dataUrl.split(",")[1] ?? "";
  while (data.length * 0.75 > MAX_PHOTO_BYTES && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    data = dataUrl.split(",")[1] ?? "";
  }
  bitmap.close();
  if (data.length * 0.75 > MAX_PHOTO_BYTES) {
    throw new Error("La foto supera el tope de 2 MB tras comprimir");
  }
  return { id: crypto.randomUUID(), dataUrl, data };
}

export function NotesPage() {
  const { current } = usePeriod();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [form, setForm] = useState({
    title: "",
    body: "",
    subjectId: "",
    itemId: "",
  });

  async function reload() {
    if (!current) {
      setNotes([]);
      setSubjects([]);
      setItems([]);
      return;
    }
    const [n, s, i] = await Promise.all([
      api.listNotes({ periodId: current.id }),
      api.listSubjects(current.id),
      api.listItems({ periodId: current.id }),
    ]);
    setNotes(n);
    setSubjects(s);
    setItems(i);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    const subjectId = searchParams.get("subjectId") || "";
    const itemId = searchParams.get("itemId") || "";
    const wantNew = searchParams.get("new") === "1";
    if (!wantNew && !subjectId && !itemId) return;
    const item = items.find((row) => row.id === itemId);
    setEditing(null);
    setPhotos([]);
    setForm({
      title: "",
      body: "",
      subjectId: item?.subjectId || subjectId,
      itemId: itemId || "",
    });
    if (subjectId) setFilter(subjectId);
    setOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, items, setSearchParams]);

  const courseItems = useMemo(
    () => items.filter((item) => !form.subjectId || item.subjectId === form.subjectId),
    [items, form.subjectId],
  );

  const q = query.trim().toLowerCase();
  const visible = notes.filter((note) => {
    if (filter === "general" && note.subjectId) return false;
    if (filter !== "all" && filter !== "general" && note.subjectId !== filter) {
      return false;
    }
    if (!q) return true;
    return (
      note.title.toLowerCase().includes(q) ||
      note.body.toLowerCase().includes(q) ||
      note.subjectName.toLowerCase().includes(q) ||
      note.itemTitle.toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setEditing(null);
    setPhotos([]);
    setForm({ title: "", body: "", subjectId: "", itemId: "" });
    setOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setPhotos([]);
    setForm({
      title: note.title,
      body: note.body,
      subjectId: note.subjectId || "",
      itemId: note.itemId || "",
    });
    setOpen(true);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      const next = await Promise.all([...files].map(compressImage));
      setPhotos((currentPhotos) => [...currentPhotos, ...next]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la foto");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    try {
      setError("");
      const payload = {
        title: form.title,
        body: form.body,
        subjectId: form.subjectId,
        itemId: form.itemId,
      };
      const saved = editing
        ? await api.updateNote(editing.id, payload)
        : await api.createNote({
            periodId: current.id,
            ...payload,
            subjectId: form.subjectId || undefined,
            itemId: form.itemId || undefined,
          });
      for (const photo of photos) {
        await api.addNoteImage(saved.id, {
          mime: "image/jpeg",
          data: photo.data,
        });
      }
      setOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  if (!current) {
    return (
      <>
        <ViewHero
          eyebrow="Memoria"
          title="Apuntes"
          subtitle="Elige un periodo para guardar notas y fotos."
          stats={[
            { value: "—", label: "apuntes" },
            { value: "—", label: "fotos" },
          ]}
        />
        <EmptyState
          title="Selecciona un periodo"
          description="Configura tu periodo desde Perfil."
          actionLabel="Ir a perfil"
          actionTo="/perfil"
        />
      </>
    );
  }

  return (
    <>
      <ViewHero
        eyebrow="Memoria"
        title="Apuntes"
        subtitle="Notas de un curso o de una actividad, con las fotos que hagan falta."
        stats={[
          { value: notes.length, label: "apuntes" },
          {
            value: notes.reduce((sum, note) => sum + note.images.length, 0),
            label: "fotos",
          },
        ]}
        action={
          <button type="button" className="btn" onClick={openCreate}>
            Nuevo apunte
          </button>
        }
      />
      {error && <p className="error">{error}</p>}

      <div className="search-field">
        <label className="sr-only" htmlFor="note-search">
          Buscar apuntes
        </label>
        <input
          id="note-search"
          placeholder="Buscar por título, curso o actividad…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="filter-scroll" role="tablist" aria-label="Filtrar apuntes">
        <button
          type="button"
          className={`filter-chip ${filter === "all" ? "is-on" : ""}`}
          onClick={() => setFilter("all")}
        >
          Todos
        </button>
        <button
          type="button"
          className={`filter-chip ${filter === "general" ? "is-on" : ""}`}
          onClick={() => setFilter("general")}
        >
          Generales
        </button>
        {subjects.map((subject) => (
          <button
            key={subject.id}
            type="button"
            className={`filter-chip ${filter === subject.id ? "is-on" : ""}`}
            onClick={() => setFilter(subject.id)}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Sin apuntes"
          description="Guarda notas de una tarea o de un curso, y adjunta las fotos que necesites."
        />
      ) : (
        <div className="notes-grid">
          {visible.map((note) => (
            <article className="note-card" key={note.id}>
              <div className="chip-row">
                <span className="badge tone-neutral">
                  {note.subjectName || "General"}
                </span>
                {note.itemTitle && (
                  <span className="badge tone-info">{note.itemTitle}</span>
                )}
              </div>
              <h2>{note.title}</h2>
              {note.body && <p>{note.body}</p>}
              {note.images.length > 0 && (
                <div className="photo-grid">
                  {note.images.map((image) => (
                    <NotePhoto
                      key={image.id}
                      id={image.id}
                      onOpen={setLightboxSrc}
                    />
                  ))}
                </div>
              )}
              <div className="row-actions">
                <button
                  className="btn ghost sm"
                  type="button"
                  onClick={() => openEdit(note)}
                >
                  Editar
                </button>
                <button
                  className="btn ghost sm"
                  type="button"
                  onClick={async () => {
                    await api.deleteNote(note.id);
                    await reload();
                  }}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? "Editar apunte" : "Nuevo apunte"}
        onClose={() => setOpen(false)}
      >
        <form
          className="form-stack"
          style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}
          onSubmit={onSubmit}
        >
          <div className="field">
            <label htmlFor="note-title">Título</label>
            <input
              id="note-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="note-subject">Curso</label>
              <select
                id="note-subject"
                value={form.subjectId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subjectId: e.target.value,
                    itemId: "",
                  })
                }
              >
                <option value="">General</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="note-item">Actividad</label>
              <select
                id="note-item"
                value={form.itemId}
                onChange={(e) => {
                  const item = items.find((row) => row.id === e.target.value);
                  setForm({
                    ...form,
                    itemId: e.target.value,
                    subjectId: item?.subjectId || form.subjectId,
                  });
                }}
              >
                <option value="">Ninguna</option>
                {courseItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="note-body">Contenido</label>
            <textarea
              id="note-body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="note-photos">Fotos (máx. 2 MB c/u)</label>
            <input
              id="note-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                void onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {(editing?.images.length || photos.length > 0) && (
            <div className="photo-grid">
              {editing?.images.map((image) => (
                <div className="photo-tile" key={image.id}>
                  <NotePhoto id={image.id} onOpen={setLightboxSrc} />
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={async () => {
                      await api.deleteNoteImage(image.id);
                      setEditing({
                        ...editing,
                        images: editing.images.filter((row) => row.id !== image.id),
                      });
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              {photos.map((photo) => (
                <div className="photo-tile" key={photo.id}>
                  <button
                    type="button"
                    className="photo-open"
                    onClick={() => setLightboxSrc(photo.dataUrl)}
                    aria-label="Ver foto ampliada"
                  >
                    <img src={photo.dataUrl} alt="" />
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() =>
                      setPhotos((currentPhotos) =>
                        currentPhotos.filter((row) => row.id !== photo.id),
                      )
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
          <button className="btn" type="submit">
            Guardar
          </button>
        </form>
      </Modal>

      {lightboxSrc && (
        <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc("")} />
      )}
    </>
  );
}
