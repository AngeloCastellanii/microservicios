import { useEffect, useState, type FormEvent } from "react";
import { api, type Item, type Subject } from "../api";

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [subjectForm, setSubjectForm] = useState({ name: "", description: "" });
  const [itemForm, setItemForm] = useState({
    title: "",
    type: "TASK",
    dueAt: "",
  });

  async function reload() {
    const list = await api.listSubjects();
    setSubjects(list);
    const id = selectedId || list[0]?.id || "";
    setSelectedId(id);
    if (id) setItems(await api.listItems({ subjectId: id }));
    else setItems([]);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api
      .listItems({ subjectId: selectedId })
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, [selectedId]);

  async function onCreateSubject(e: FormEvent) {
    e.preventDefault();
    await api.createSubject(subjectForm);
    setSubjectForm({ name: "", description: "" });
    await reload();
  }

  async function onCreateItem(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    await api.createItem({
      subjectId: selectedId,
      title: itemForm.title,
      type: itemForm.type,
      dueAt: itemForm.dueAt ? new Date(itemForm.dueAt).toISOString() : "",
      status: itemForm.type === "EXAM" ? "SCHEDULED" : "PENDING",
    });
    setItemForm({ title: "", type: "TASK", dueAt: "" });
    setItems(await api.listItems({ subjectId: selectedId }));
  }

  const selected = subjects.find((s) => s.id === selectedId);

  return (
    <>
      <section className="hero">
        <h1>Materias</h1>
        <p>Gestiona tareas, proyectos y exámenes por materia.</p>
      </section>
      {error && <p className="error">{error}</p>}

      <div className="split">
        <aside className="panel side-list">
          <h2>Mis materias</h2>
          {subjects.map((s) => (
            <button
              key={s.id}
              className={s.id === selectedId ? "active" : ""}
              onClick={() => setSelectedId(s.id)}
              type="button"
            >
              <strong>{s.name}</strong>
              <div className="meta">{s.description || "Sin descripción"}</div>
            </button>
          ))}
          <form className="form-row" onSubmit={onCreateSubject}>
            <input
              placeholder="Nueva materia"
              value={subjectForm.name}
              onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              required
            />
            <button className="btn" type="submit">
              Agregar
            </button>
          </form>
        </aside>

        <section className="panel">
          {!selected && <p className="empty">Crea una materia para empezar.</p>}
          {selected && (
            <>
              <h2>{selected.name}</h2>
              <p className="meta">{selected.description}</p>
              <div className="list">
                {items.map((item) => (
                  <div className="row" key={item.id}>
                    <div>
                      <strong>
                        {item.type} · {item.title}
                      </strong>
                      <div className="meta">
                        {item.dueAt
                          ? new Date(item.dueAt).toLocaleString("es")
                          : "Sin fecha"}
                      </div>
                    </div>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={async () => {
                        await api.deleteItem(item.id);
                        setItems(await api.listItems({ subjectId: selectedId }));
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              <form className="form-row" onSubmit={onCreateItem}>
                <input
                  placeholder="Título del ítem"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  required
                />
                <select
                  value={itemForm.type}
                  onChange={(e) => setItemForm({ ...itemForm, type: e.target.value })}
                >
                  <option value="TASK">Tarea</option>
                  <option value="PROJECT">Proyecto</option>
                  <option value="EXAM">Examen</option>
                </select>
                <input
                  type="datetime-local"
                  value={itemForm.dueAt}
                  onChange={(e) => setItemForm({ ...itemForm, dueAt: e.target.value })}
                />
                <button className="btn" type="submit">
                  + Agregar ítem
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
