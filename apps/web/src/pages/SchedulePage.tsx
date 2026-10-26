import { useEffect, useState, type FormEvent } from "react";
import { api, type ScheduleSlot, type Subject } from "../api";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { DAYS } from "../labels";
import { usePeriod } from "../period-context";

export function SchedulePage() {
  const { current } = usePeriod();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    subjectId: "",
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "12:00",
    label: "",
  });

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
    setForm((f) => ({
      ...f,
      subjectId: sub.some((x) => x.id === f.subjectId)
        ? f.subjectId
        : sub[0]?.id || "",
    }));
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.upsertSlot(form);
    await reload();
  }

  if (!current) {
    return (
      <>
        <PageHeader eyebrow="Semana" title="Horario" />
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
        eyebrow="Semana"
        title="Horario"
        subtitle={`Bloques de ${current.name}`}
      />
      {error && <p className="error">{error}</p>}

      <div className="schedule-scroll">
        <div className="schedule-grid" role="list">
          {DAYS.map((day) => {
            const daySlots = slots.filter((s) => s.dayOfWeek === day.n);
            return (
              <section
                className="day-col"
                key={day.n}
                role="listitem"
                aria-label={day.label}
              >
                <h3>
                  <span className="day-full">{day.label}</span>
                  <span className="day-short">{day.short}</span>{" "}
                  <span className="count">· {daySlots.length}</span>
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
                        aria-label={`Quitar ${s.subjectName} del ${day.label}`}
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

      <form
        className="panel form-stack"
        style={{ marginTop: "1rem" }}
        onSubmit={onSubmit}
      >
        <div className="panel-head">
          <h2>Agregar bloque</h2>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="slot-subject">Materia</label>
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
          <div className="field">
            <label htmlFor="slot-label">Etiqueta</label>
            <input
              id="slot-label"
              placeholder="Etiqueta"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
        </div>
        <button className="btn" type="submit">
          Agregar al horario
        </button>
      </form>
    </>
  );
}
