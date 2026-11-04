import { useEffect, useState, type FormEvent } from "react";
import { api, type Item, type Subject } from "../api";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { ViewHero } from "../components/ViewHero";
import { StatusBadge } from "../components/StatusBadge";
import {
  formatWhen,
  itemStatusLabel,
  itemTypeLabel,
  NEXT_STATUS,
  toLocalInput,
} from "../labels";
import { usePeriod } from "../period-context";

const COLORS = ["#0D9488", "#0369A1", "#7C3AED", "#EA580C", "#BE123C", "#15803D"];

export function SubjectsPage() {
  const { current } = usePeriod();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [courseOpen, setCourseOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Subject | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [courseForm, setCourseForm] = useState({
    name: "",
    description: "",
    color: COLORS[0],
  });
  const [itemForm, setItemForm] = useState({
    title: "",
    description: "",
    type: "TASK",
    status: "PENDING",
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

  function openCreateCourse() {
    setEditingCourse(null);
    setCourseForm({ name: "", description: "", color: COLORS[0] });
    setCourseOpen(true);
  }

  function openEditCourse(s: Subject) {
    setEditingCourse(s);
    setCourseForm({
      name: s.name,
      description: s.description,
      color: s.color || COLORS[0],
    });
    setCourseOpen(true);
  }

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({
      title: "",
      description: "",
      type: "TASK",
      status: "PENDING",
      dueAt: "",
    });
    setItemOpen(true);
  }

  function openEditItem(item: Item) {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      dueAt: toLocalInput(item.dueAt),
    });
    setItemOpen(true);
  }

  async function onSaveCourse(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    try {
      setError("");
      if (editingCourse) {
        await api.updateSubject(editingCourse.id, courseForm);
        await reloadSubjects(editingCourse.id);
      } else {
        const created = await api.createSubject({
          ...courseForm,
          periodId: current.id,
        });
        await reloadSubjects(created.id);
      }
      setCourseOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el curso");
    }
  }

  async function onDeleteSubject(id: string) {
    if (!confirm("¿Eliminar este curso y todas sus actividades?")) return;
    try {
      setError("");
      await api.deleteSubject(id);
      setSelectedId("");
      setItems([]);
      await reloadSubjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  async function onSaveItem(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    try {
      setError("");
      const payload = {
        title: itemForm.title,
        description: itemForm.description,
        type: itemForm.type,
        status: itemForm.status,
        dueAt: itemForm.dueAt ? new Date(itemForm.dueAt).toISOString() : "",
      };
      if (editingItem) {
        await api.updateItem(editingItem.id, payload);
      } else {
        await api.createItem({
          subjectId: selectedId,
          ...payload,
          status:
            itemForm.status ||
            (itemForm.type === "EXAM" ? "SCHEDULED" : "PENDING"),
        });
      }
      setItemOpen(false);
      setItems(await api.listItems({ subjectId: selectedId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  }

  async function cycleStatus(item: Item) {
    const next = NEXT_STATUS[item.status] || "PENDING";
    await api.updateItem(item.id, { status: next });
    setItems(await api.listItems({ subjectId: selectedId }));
  }

  const selected = subjects.find((s) => s.id === selectedId);

  if (!current) {
    return (
      <>
        <ViewHero
          eyebrow="Estudio"
          title="Cursos"
          subtitle="Elige un periodo para ver tus cursos."
          stats={[
            { value: "—", label: "cursos" },
            { value: "—", label: "actividades" },
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
        eyebrow="Estudio"
        title="Cursos"
        subtitle={`${current.name}. Elige uno para ver sus actividades.`}
        stats={[
          { value: subjects.length, label: "cursos" },
          { value: items.length, label: "en este curso" },
        ]}
        action={
          <button type="button" className="btn" onClick={openCreateCourse}>
            Nuevo curso
          </button>
        }
      />
      {error && <p className="error">{error}</p>}

      <div className="course-board" aria-label="Lista de cursos">
        {subjects.length === 0 && (
          <p className="empty">Todavía no agregaste ninguno.</p>
        )}
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`course-card ${s.id === selectedId ? "active" : ""}`}
            onClick={() => setSelectedId(s.id)}
            aria-current={s.id === selectedId ? "true" : undefined}
          >
            <span
              className="course-card-bar"
              style={{ background: s.color || COLORS[0] }}
              aria-hidden
            />
            <strong>{s.name}</strong>
            <span className="meta">{s.description || "Sin descripción"}</span>
          </button>
        ))}
      </div>

      <div className="split" style={{ gridTemplateColumns: "1fr" }}>
        <section className="panel" aria-live="polite">
          {!selected && (
            <EmptyState
              title="Elige o crea un curso"
              description="Usa el panel lateral o el botón Nuevo curso."
            />
          )}
          {selected && (
            <>
              <div className="panel-head">
                <div>
                  <h2>
                    <span
                      className="color-swatch"
                      style={{ background: selected.color || COLORS[0] }}
                      aria-hidden
                    />
                    {selected.name}
                  </h2>
                  <p className="meta" style={{ marginTop: "0.35rem" }}>
                    {selected.description || "Sin descripción"}
                  </p>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => openEditCourse(selected)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => void onDeleteSubject(selected.id)}
                  >
                    Eliminar
                  </button>
                  <button type="button" className="btn sm" onClick={openCreateItem}>
                    Nueva actividad
                  </button>
                </div>
              </div>

              <div className="list">
                {items.length === 0 && (
                  <p className="empty">Sin actividades en este curso.</p>
                )}
                {items.map((item) => (
                  <article className="row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <div className="meta">{formatWhen(item.dueAt)}</div>
                      {item.description && (
                        <div className="meta">{item.description}</div>
                      )}
                      <div className="chip-row">
                        <StatusBadge tone="neutral">
                          {itemTypeLabel(item.type)}
                        </StatusBadge>
                        <StatusBadge
                          tone={
                            item.status === "DONE"
                              ? "ok"
                              : item.status === "IN_PROGRESS"
                                ? "warn"
                                : "info"
                          }
                        >
                          {itemStatusLabel(item.status)}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="row-actions">
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={() => void cycleStatus(item)}
                      >
                        Estado
                      </button>
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={() => openEditItem(item)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={async () => {
                          try {
                            setError("");
                            await api.deleteItem(item.id);
                            setItems(
                              await api.listItems({ subjectId: selectedId }),
                            );
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "No se pudo eliminar",
                            );
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        open={courseOpen}
        title={editingCourse ? "Editar curso" : "Nuevo curso"}
        onClose={() => setCourseOpen(false)}
      >
        <form className="form-stack" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }} onSubmit={onSaveCourse}>
          <div className="field">
            <label htmlFor="course-name">Nombre</label>
            <input
              id="course-name"
              value={courseForm.name}
              onChange={(e) =>
                setCourseForm({ ...courseForm, name: e.target.value })
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="course-desc">Descripción</label>
            <input
              id="course-desc"
              value={courseForm.description}
              onChange={(e) =>
                setCourseForm({ ...courseForm, description: e.target.value })
              }
            />
          </div>
          <div className="field">
            <span id="course-color">Color</span>
            <div className="swatch-row" role="radiogroup" aria-labelledby="course-color">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch-btn ${courseForm.color === c ? "is-on" : ""}`}
                  style={{ background: c }}
                  aria-label={c}
                  aria-checked={courseForm.color === c}
                  role="radio"
                  onClick={() => setCourseForm({ ...courseForm, color: c })}
                />
              ))}
            </div>
          </div>
          <button className="btn" type="submit">
            Guardar
          </button>
        </form>
      </Modal>

      <Modal
        open={itemOpen}
        title={editingItem ? "Editar actividad" : "Nueva actividad"}
        onClose={() => setItemOpen(false)}
      >
        <form className="form-stack" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }} onSubmit={onSaveItem}>
          <div className="field">
            <label htmlFor="item-title">Título</label>
            <input
              id="item-title"
              value={itemForm.title}
              onChange={(e) =>
                setItemForm({ ...itemForm, title: e.target.value })
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="item-desc">Descripción</label>
            <textarea
              id="item-desc"
              value={itemForm.description}
              onChange={(e) =>
                setItemForm({ ...itemForm, description: e.target.value })
              }
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
              <label htmlFor="item-status">Estado</label>
              <select
                id="item-status"
                value={itemForm.status}
                onChange={(e) =>
                  setItemForm({ ...itemForm, status: e.target.value })
                }
              >
                <option value="PENDING">Pendiente</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="DONE">Hecho</option>
                <option value="SCHEDULED">Programado</option>
              </select>
            </div>
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
          <button className="btn" type="submit">
            Guardar
          </button>
        </form>
      </Modal>
    </>
  );
}
