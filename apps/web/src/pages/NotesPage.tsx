import { useEffect, useState, type FormEvent } from "react";
import { api, type Note, type Subject } from "../api";

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", body: "", subjectId: "" });

  async function reload() {
    const [n, s] = await Promise.all([api.listNotes(), api.listSubjects()]);
    setNotes(n);
    setSubjects(s);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.createNote({
      title: form.title,
      body: form.body,
      subjectId: form.subjectId || undefined,
    });
    setForm({ title: "", body: "", subjectId: "" });
    await reload();
  }

  return (
    <>
      <section className="hero">
        <h1>Apuntes</h1>
        <p>Notas generales o asociadas a una materia.</p>
      </section>
      {error && <p className="error">{error}</p>}

      <div className="grid-2">
        <section className="panel">
          <h2>Lista</h2>
          <div className="list">
            {notes.length === 0 && <p className="empty">Sin apuntes aún.</p>}
            {notes.map((n) => (
              <div className="row" key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <div className="meta">
                    {n.subjectName || "General"} · {n.body.slice(0, 80)}
                  </div>
                </div>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={async () => {
                    await api.deleteNote(n.id);
                    await reload();
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </section>

        <form className="panel" onSubmit={onSubmit}>
          <h2>Nuevo apunte</h2>
          <div className="form-row">
            <input
              placeholder="Título"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <select
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
          <textarea
            style={{ marginTop: "0.65rem" }}
            placeholder="Contenido"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <button className="btn" type="submit" style={{ marginTop: "0.75rem" }}>
            Guardar
          </button>
        </form>
      </div>
    </>
  );
}
