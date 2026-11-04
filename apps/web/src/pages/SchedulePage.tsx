import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type ScheduleSlot, type Subject } from "../api";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { ViewHero } from "../components/ViewHero";
import { DAYS } from "../labels";
import { usePeriod } from "../period-context";

const emptyForm = {
  id: "",
  subjectId: "",
  dayOfWeek: 1,
  startTime: "10:00",
  endTime: "12:00",
  label: "",
};

function todayDayN() {
  const js = new Date().getDay();
  return js === 0 ? 7 : js;
}

export function SchedulePage() {
  const { current } = usePeriod();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [view, setView] = useState<"week" | "today">("week");
  const today = todayDayN();

  async function reload() {
    if (!current) {
      setSlots([]);
      setSubjects([]);
      return;
    }
    const [s, sub] = await Promise.all([
      api.listSchedule(current.id),
      api.listSubjects(current.id),
    ]);
    setSlots(s);
    setSubjects(sub);
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const visibleDays = useMemo(
    () => (view === "today" ? DAYS.filter((d) => d.n === today) : DAYS),
    [view, today],
  );

  function openCreate(day = today) {
    setForm({
      ...emptyForm,
      dayOfWeek: day,
      subjectId: subjects[0]?.id || "",
    });
    setOpen(true);
  }

  function openEdit(slot: ScheduleSlot) {
    setForm({
      id: slot.id,
      subjectId: slot.subjectId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: slot.label,
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      setError("");
      await api.upsertSlot({
        ...(form.id ? { id: form.id } : {}),
        subjectId: form.subjectId,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        label: form.label,
      });
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
          eyebrow="Semana"
          title="Horario"
          subtitle="Elige un periodo para armar la semana."
          stats={[
            { value: "—", label: "bloques" },
            { value: "—", label: "días con clase" },
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
        eyebrow="Semana"
        title="Horario"
        subtitle={`Bloques de ${current.name}.`}
        stats={[
          { value: slots.length, label: "bloques" },
          {
            value: new Set(slots.map((slot) => slot.dayOfWeek)).size,
            label: "días con clase",
          },
        ]}
        action={
          <button type="button" className="btn" onClick={() => openCreate()}>
            Nuevo bloque
          </button>
        }
      />
      {error && <p className="error">{error}</p>}

      <div className="schedule-toolbar" role="tablist" aria-label="Vista del horario">
        <button
          type="button"
          className={`filter-chip ${view === "today" ? "is-on" : ""}`}
          onClick={() => setView("today")}
        >
          Hoy
        </button>
        <button
          type="button"
          className={`filter-chip ${view === "week" ? "is-on" : ""}`}
          onClick={() => setView("week")}
        >
          Semana
        </button>
      </div>

      <div className="schedule-scroll">
        <div
          className={`schedule-grid ${view === "today" ? "is-today-view" : ""}`}
          role="list"
        >
          {visibleDays.map((day) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === day.n);
            return (
              <section
                className={`day-col ${day.n === today ? "is-today" : ""}`}
                key={day.n}
                role="listitem"
                aria-label={day.label}
              >
                <h3>
                  <span className="day-full">{day.label}</span>
                  <span className="day-short">{day.short}</span>{" "}
                  <span className="count">· {daySlots.length}</span>
                  {day.n === today && <span className="meta"> · hoy</span>}
                </h3>
                {daySlots.length === 0 && <p className="empty">Libre</p>}
                {daySlots.map((s) => (
                  <div className="slot" key={s.id}>
                    <strong>{s.subjectName}</strong>
                    <div className="meta">
                      {s.startTime}–{s.endTime}
                      {s.label ? ` · ${s.label}` : ""}
                    </div>
                    <div className="actions">
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={() => openEdit(s)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={async () => {
                          await api.deleteSlot(s.id);
                          await reload();
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      </div>

      <Modal
        open={open}
        title={form.id ? "Editar bloque" : "Nuevo bloque"}
        onClose={() => setOpen(false)}
      >
        <form
          className="form-stack"
          style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}
          onSubmit={onSubmit}
        >
          <div className="field">
            <label htmlFor="slot-subject">Curso</label>
            <select
              id="slot-subject"
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              required
            >
              <option value="">Elegir</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="slot-day">Día</label>
              <select
                id="slot-day"
                value={form.dayOfWeek}
                onChange={(e) =>
                  setForm({ ...form, dayOfWeek: Number(e.target.value) })
                }
              >
                {DAYS.map((d) => (
                  <option key={d.n} value={d.n}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="slot-start">Inicio</label>
              <input
                id="slot-start"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="slot-end">Fin</label>
              <input
                id="slot-end"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="slot-label">Etiqueta</label>
            <input
              id="slot-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
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
