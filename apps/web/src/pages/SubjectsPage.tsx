import { useEffect, useState, type FormEvent } from "react";
import { api, type Item, type Subject } from "../api";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import {
  formatWhen,
  itemStatusLabel,
  itemTypeLabel,
} from "../labels";
import { usePeriod } from "../period-context";

export function SubjectsPage() {
  const { current } = usePeriod();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [subjectForm, setSubjectForm] = useState({ name: "", description: "" });
  const [itemForm, setItemForm] = useState({
    title: "",
    type: "TASK",
    dueAt: "",
  });

  async function reloadSubjects(preferId?: string) {
    if (!current) {
      setSubjects([]);
      setSelectedId("");
      setItems([]);
      return;
    }
    const list = await api.listSubjects(current.id);
    setSubjects(list);
    const id =
      (preferId && list.some((s) => s.id === preferId) ? preferId : "") ||
      (selectedId && list.some((s) => s.id === selectedId) ? selectedId : "") ||
      list[0]?.id ||
      "";
    setSelectedId(id);
    if (id) setItems(await api.listItems({ subjectId: id }));
    else setItems([]);
  }

  useEffect(() => {
    reloadSubjects().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  useEffect(() => {
    if (!selectedId) return;
    api
      .listItems({ subjectId: selectedId })
      .then(setItems)
      .catch((err: Error) => setError(err.message));
  }, [selectedId]);

  async function onCreateSubject(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    const created = await api.createSubject({
      ...subjectForm,
      periodId: current.id,
    });
    setSubjectForm({ name: "", description: "" });
    await reloadSubjects(created.id);
  }

  async function onDeleteSubject(id: string) {
    if (!confirm("¿Eliminar esta materia y todos sus ítems?")) return;
    await api.deleteSubject(id);
    setSelectedId("");
    await reloadSubjects();
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

  if (!current) {
    return (
      <>
        <PageHeader eyebrow="Organización" title="Materias" />
        <EmptyState
          title="Selecciona un periodo"
          description="Crea o elige un trimestre/semestre arriba para gestionar materias."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Organización"
        title="Materias"
        subtitle={`Periodo activo: ${current.name}`}
      />
      {error && <p className="error">{error}</p>}

      <div className="split">
        <aside className="panel" aria-label="Lista de materias">
          <div className="panel-head">
            <h2>Tus materias</h2>
          </div>
          <div className="side-list">
            {subjects.length === 0 && (
              <p className="empty">Todavía no agregaste ninguna.</p>
            )}
            {subjects.map((s) => (
              <div
                key={s.id}
                className={`side-item ${s.id === selectedId ? "active" : ""}`}
              >
                <div className="side-item-top">
                  <button
                    type="button"
                    className="side-pick"
                    onClick={() => setSelectedId(s.id)}
                    aria-current={s.id === selectedId ? "true" : undefined}
                  >
                    <strong>{s.name}</strong>
                    <div className="meta">{s.description || "Sin descripción"}</div>
                  </button>
                  <button
                    className="btn ghost sm"
                    type="button"
                    aria-label={`Eliminar ${s.name}`}
                    onClick={() => onDeleteSubject(s.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form className="form-stack" onSubmit={onCreateSubject}>
            <div className="field">
              <label htmlFor="subject-name">Nueva materia</label>
              <input
                id="subject-name"
                placeholder="Ej. Sistemas Distribuidos"
                value={subjectForm.name}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="subject-desc">Descripción</label>
              <input
                id="subject-desc"
                placeholder="Opcional"
                value={subjectForm.description}
                onChange={(e) =>
                  setSubjectForm({ ...subjectForm, description: e.target.value })
                }
              />
            </div>
            <button className="btn" type="submit">
              Agregar materia
            </button>
          </form>
        </aside>

        <section className="panel" aria-live="polite">
          {!selected && (
            <EmptyState
              title="Elige o crea una materia"
              description="Usa el panel lateral para empezar a cargar entregas."
            />
          )}
          {selected && (
            <>
              <div className="panel-head">
                <div>
                  <h2>{selected.name}</h2>
                  <p className="meta" style={{ marginTop: "0.35rem" }}>
                    {selected.description || "Sin descripción"}
                  </p>
                </div>
              </div>

              <div className="list">
                {items.length === 0 && (
                  <p className="empty">Sin ítems todavía en esta materia.</p>
                )}
                {items.map((item) => (
                  <article className="row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <div className="meta">{formatWhen(item.dueAt)}</div>
                      <div className="chip-row">
                        <StatusBadge tone="neutral">
                          {itemTypeLabel(item.type)}
                        </StatusBadge>
                        <StatusBadge tone="ok">
                          {itemStatusLabel(item.status)}
                        </StatusBadge>
                      </div>
                    </div>
                    <button
                      className="btn ghost sm"
                      type="button"
                      aria-label={`Eliminar ${item.title}`}
                      onClick={async () => {
                        await api.deleteItem(item.id);
                        setItems(await api.listItems({ subjectId: selectedId }));
                      }}
                    >
                      Eliminar
                    </button>
                  </article>
                ))}
              </div>

              <form className="form-stack" onSubmit={onCreateItem}>
                <div className="field">
                  <label htmlFor="item-title">Nuevo ítem</label>
                  <input
                    id="item-title"
                    placeholder="Título"
                    value={itemForm.title}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="item-type">Tipo</label>
                    <select
                      id="item-type"
                      value={itemForm.type}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, type: e.target.value })
                      }
                    >
                      <option value="TASK">Tarea</option>
                      <option value="PROJECT">Proyecto</option>
                      <option value="EXAM">Examen</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="item-due">Fecha</label>
                    <input
                      id="item-due"
                      type="datetime-local"
                      value={itemForm.dueAt}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, dueAt: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button className="btn" type="submit">
                  Agregar ítem
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}
