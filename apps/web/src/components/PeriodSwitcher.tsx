import { useState, type FormEvent } from "react";
import { usePeriod } from "../period-context";

function kindLabel(kind: string) {
  return kind === "SEMESTER" ? "Semestre" : "Trimestre";
}

export function PeriodSwitcher() {
  const { periods, current, setCurrentId, createPeriod, removePeriod } =
    usePeriod();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "TRIMESTER" as "TRIMESTER" | "SEMESTER",
    year: new Date().getFullYear(),
  });

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    await createPeriod(form);
    setForm({
      name: "",
      kind: "TRIMESTER",
      year: new Date().getFullYear(),
    });
    setOpen(false);
  }

  return (
    <div className="period-switcher">
      <label className="period-label" htmlFor="period-select">
        Periodo
      </label>
      <div className="period-controls">
        <select
          id="period-select"
          value={current?.id || ""}
          onChange={(e) => setCurrentId(e.target.value)}
          aria-label="Seleccionar periodo académico"
        >
          {periods.length === 0 && <option value="">Sin periodos</option>}
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {kindLabel(p.kind)} {p.year}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Cerrar" : "Nuevo"}
        </button>
        {current && (
          <button
            type="button"
            className="btn ghost sm"
            aria-label="Eliminar periodo actual"
            onClick={async () => {
              if (
                !confirm(
                  `¿Eliminar «${current.name}» y todo su contenido?`,
                )
              ) {
                return;
              }
              await removePeriod(current.id);
            }}
          >
            Borrar
          </button>
        )}
      </div>

      {open && (
        <form className="period-form" onSubmit={onCreate}>
          <div className="field">
            <label htmlFor="period-name">Nombre</label>
            <input
              id="period-name"
              placeholder="Ej. Trimestre 11 · 2026"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="period-kind">Tipo</label>
              <select
                id="period-kind"
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value as "TRIMESTER" | "SEMESTER",
                  })
                }
              >
                <option value="TRIMESTER">Trimestre</option>
                <option value="SEMESTER">Semestre</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="period-year">Año</label>
              <input
                id="period-year"
                type="number"
                min={2000}
                max={2100}
                value={form.year}
                onChange={(e) =>
                  setForm({ ...form, year: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>
          <button className="btn" type="submit">
            Crear periodo
          </button>
        </form>
      )}
    </div>
  );
}
