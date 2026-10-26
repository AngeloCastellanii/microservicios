import { useEffect, useState, type FormEvent } from "react";
import { api, type ScheduleSlot, type Subject } from "../api";

const DAYS = [
  { n: 1, label: "Lunes" },
  { n: 2, label: "Martes" },
  { n: 3, label: "Miércoles" },
  { n: 4, label: "Jueves" },
  { n: 5, label: "Viernes" },
];

export function SchedulePage() {
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
    const [s, sub] = await Promise.all([api.listSchedule(), api.listSubjects()]);
    setSlots(s);
    setSubjects(sub);
    if (!form.subjectId && sub[0]) {
      setForm((f) => ({ ...f, subjectId: sub[0].id }));
    }
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.upsertSlot(form);
    await reload();
  }

  return (
    <>
      <section className="hero">
        <h1>Horario</h1>
        <p>Arma tu semana con bloques por materia.</p>
      </section>
      {error && <p className="error">{error}</p>}

      <div className="schedule-grid">
        {DAYS.map((day) => (
          <div className="day-col" key={day.n}>
            <h3>{day.label}</h3>
            {slots
              .filter((s) => s.dayOfWeek === day.n)
              .map((s) => (
                <div className="slot" key={s.id}>
                  <strong>{s.subjectName}</strong>
                  <div className="meta">
                    {s.startTime}–{s.endTime}
                    {s.label ? ` · ${s.label}` : ""}
                  </div>
                  <button
                    className="btn ghost"
                    type="button"
                    style={{ marginTop: "0.4rem", padding: "0.35rem 0.6rem" }}
                    onClick={async () => {
                      await api.deleteSlot(s.id);
                      await reload();
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
          </div>
        ))}
      </div>

      <form className="panel form-row" style={{ marginTop: "1rem" }} onSubmit={onSubmit}>
        <select
          value={form.subjectId}
          onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
          required
        >
          <option value="">Materia</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={form.dayOfWeek}
          onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
        >
          {DAYS.map((d) => (
            <option key={d.n} value={d.n}>
              {d.label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={form.startTime}
          onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          required
        />
        <input
          type="time"
          value={form.endTime}
          onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          required
        />
        <input
          placeholder="Etiqueta (opcional)"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <button className="btn" type="submit">
          Agregar bloque
        </button>
      </form>
    </>
  );
}
