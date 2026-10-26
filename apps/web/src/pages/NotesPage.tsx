import { useEffect, useState, type FormEvent } from "react";
import { api, type Note, type Subject } from "../api";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { usePeriod } from "../period-context";

export function NotesPage() {
  const { current } = usePeriod();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    await api.createNote({
      periodId: current.id,
      title: form.title,
      body: form.body,
      subjectId: form.subjectId || undefined,
    });
    setForm({ title: "", body: "", subjectId: "" });
    await reload();
  }

  if (!current) {
    return (
      <>
        <PageHeader eyebrow="Memoria" title="Apuntes" />
        <EmptyState
          title="Selecciona un periodo"
          description="Configura el trimestre o semestre desde Perfil."
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
      />
      {error && <p className="error">{error}</p>}

      <div className="grid-2">
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
                      {n.body ? ` · ${n.body.slice(0, 90)}` : ""}
                    </div>
                  </div>
                  <button
                    className="btn ghost sm"
                    type="button"
                    aria-label={`Eliminar apunte ${n.title}`}
                    onClick={async () => {
                      await api.deleteNote(n.id);
                      await reload();
                    }}
                  >
                    Eliminar
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <form
          className="panel form-stack"
          style={{ marginTop: 0 }}
          onSubmit={onSubmit}
        >
          <div className="panel-head">
            <h2>Nuevo apunte</h2>
          </div>
          <div className="field">
            <label htmlFor="note-title">Título</label>
            <input
              id="note-title"
              placeholder="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="note-subject">Materia</label>
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
              placeholder="Contenido"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <button className="btn" type="submit">
            Guardar apunte
          </button>
        </form>
      </div>
    </>
  );
}
