import { useEffect, useState, type FormEvent } from "react";
import { api, type Note, type Subject } from "../api";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { usePeriod } from "../period-context";

export function NotesPage() {
  const { current } = usePeriod();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", body: "", subjectId: "" });

  async function reload() {
    if (!current) {
      setNotes([]);
      setSubjects([]);
      return;
    }
    const [n, s] = await Promise.all([
      api.listNotes({ periodId: current.id }),
      api.listSubjects(current.id),
    ]);
    setNotes(n);
    setSubjects(s);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", body: "", subjectId: "" });
    setOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setForm({
      title: note.title,
      body: note.body,
      subjectId: note.subjectId || "",
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    try {
      setError("");
      if (editing) {
        await api.updateNote(editing.id, {
          title: form.title,
          body: form.body,
          subjectId: form.subjectId,
        });
      } else {
        await api.createNote({
          periodId: current.id,
          title: form.title,
          body: form.body,
          subjectId: form.subjectId || undefined,
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
        <PageHeader eyebrow="Memoria" title="Apuntes" />
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
      <PageHeader
        eyebrow="Memoria"
        title="Apuntes"
        subtitle={`Notas de ${current.name}`}
        actions={
          <button type="button" className="btn" onClick={openCreate}>
            Nuevo apunte
          </button>
        }
      />
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <div className="panel-head">
          <h2>Guardados</h2>
        </div>
        {notes.length === 0 ? (
          <EmptyState
            title="Sin apuntes"
            description="Guarda un recordatorio rápido o un resumen de clase."
          />
        ) : (
          <div className="list">
            {notes.map((n) => (
              <article className="row" key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <div className="meta">
                    {n.subjectName || "General"}
                    {n.body ? ` · ${n.body.slice(0, 120)}` : ""}
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    className="btn ghost sm"
                    type="button"
                    onClick={() => openEdit(n)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn ghost sm"
                    type="button"
                    onClick={async () => {
                      await api.deleteNote(n.id);
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
      </section>

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
          <div className="field">
            <label htmlFor="note-subject">Curso</label>
            <select
              id="note-subject"
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            >
              <option value="">General</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="note-body">Contenido</label>
            <textarea
              id="note-body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <button className="btn" type="submit">
            Guardar
          </button>
        </form>
      </Modal>
    </>
  );
}
