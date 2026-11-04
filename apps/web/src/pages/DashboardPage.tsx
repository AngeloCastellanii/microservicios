import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Item, type Notification } from "../api";
import { BRAND_NAME, BRAND_TAGLINE } from "../brand";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import {
  formatWhen,
  itemStatusLabel,
  itemTypeLabel,
  notifKindLabel,
  periodKindLabel,
} from "../labels";
import { periodProgress } from "../period-progress";
import { usePeriod } from "../period-context";

export function DashboardPage() {
  const { current, loading: periodLoading } = usePeriod();
  const [items, setItems] = useState<Item[]>([]);
  const [upcoming, setUpcoming] = useState<Item[]>([]);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusCourse, setFocusCourse] = useState("");

  useEffect(() => {
    if (!current) {
      setItems([]);
      setUpcoming([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFocusCourse("");
    Promise.all([
      api.listItems({ periodId: current.id }),
      api.listItems({ periodId: current.id, upcomingOnly: true, limit: 6 }),
      api.listNotifications(),
    ])
      .then(([allItems, nextItems, nextNotes]) => {
        setItems(allItems);
        setUpcoming(nextItems);
        setNotes(nextNotes.slice(0, 5));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [current]);

  const persistentCount = notes.filter((n) => n.kind === "PERSISTENT").length;
  const busy = loading || periodLoading;
  const calendar = periodProgress(current?.startsAt, current?.endsAt);
  const doneCount = items.filter((item) => item.status === "DONE").length;
  const activeCount = items.filter(
    (item) => item.status === "IN_PROGRESS" || item.status === "PENDING",
  ).length;
  const workPercent = items.length
    ? Math.round((doneCount / items.length) * 100)
    : 0;
  const courses = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const item of items) {
      const name = item.subjectName || "Sin curso";
      const row = map.get(name) ?? { total: 0, done: 0 };
      row.total += 1;
      if (item.status === "DONE") row.done += 1;
      map.set(name, row);
    }
    return [...map.entries()];
  }, [items]);
  const visibleUpcoming = focusCourse
    ? upcoming.filter((item) => item.subjectName === focusCourse)
    : upcoming;

  return (
    <>
      <section className="hero-panel" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">{BRAND_NAME}</p>
          <h1 id="hero-title" className="hero-brand">
            Tu estudio, en orden
          </h1>
          <p className="lede">{BRAND_TAGLINE}</p>
          {current && (
            <p className="lede period-hero-meta">
              Periodo: {periodKindLabel(current.kind)} · {current.name}
            </p>
          )}
        </div>
        <div className="hero-stats" aria-label="Resumen rápido">
          <div className="stat-pill">
            <strong>{busy ? "—" : upcoming.length}</strong>
            <span>próximas entregas</span>
          </div>
          <div className="stat-pill">
            <strong>{busy ? "—" : persistentCount}</strong>
            <span>avisos activos</span>
          </div>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      {!current && !periodLoading && (
        <EmptyState
          title="Configura un periodo"
          description="Ve a Perfil para crear o activar tu trimestre, semestre u otro periodo."
          actionLabel="Ir a perfil"
          actionTo="/perfil"
        />
      )}

      {current && (
        <>
          <div className="dash-grid">
            <section className="panel" aria-labelledby="calendario-title">
              <div className="panel-head">
                <h2 id="calendario-title">Avance del periodo</h2>
              </div>
              {!calendar && (
                <EmptyState
                  title="Faltan las fechas"
                  description="Indica el inicio y el fin del trimestre o semestre en Perfil."
                  actionLabel="Ir a perfil"
                  actionTo="/perfil"
                />
              )}
              {calendar && (
                <>
                  <p className="meta">
                    Semana actual: {calendar.currentWeek}/{calendar.totalWeeks}
                    {calendar.finished ? " · periodo terminado" : ""}
                    {!calendar.started ? " · aún no inicia" : ""}
                  </p>
                  <div
                    className="meter"
                    role="progressbar"
                    aria-valuenow={calendar.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progreso del periodo"
                  >
                    <span
                      className="meter-fill"
                      style={{ width: `${calendar.percent}%` }}
                    />
                  </div>
                  <div className="dash-kpis">
                    <div className="dash-kpi">
                      <strong>{calendar.percent}%</strong>
                      <span className="meta">recorrido</span>
                    </div>
                    <div className="dash-kpi">
                      <strong>{calendar.remainingDays}</strong>
                      <span className="meta">días restantes</span>
                    </div>
                    <div className="dash-kpi">
                      <strong>
                        {calendar.currentWeek}/{calendar.totalWeeks}
                      </strong>
                      <span className="meta">semana</span>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="panel" aria-labelledby="desempeno-title">
              <div className="panel-head">
                <h2 id="desempeno-title">Desempeño</h2>
              </div>
              <p className="meta">
                {doneCount} de {items.length} actividades hechas
              </p>
              <div
                className="meter"
                role="progressbar"
                aria-valuenow={workPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Actividades completadas"
              >
                <span
                  className="meter-fill gold"
                  style={{ width: `${workPercent}%` }}
                />
              </div>
              <div className="dash-kpis">
                <div className="dash-kpi">
                  <strong>{doneCount}</strong>
                  <span className="meta">hechas</span>
                </div>
                <div className="dash-kpi">
                  <strong>{activeCount}</strong>
                  <span className="meta">en curso</span>
                </div>
                <div className="dash-kpi">
                  <strong>{workPercent}%</strong>
                  <span className="meta">avance</span>
                </div>
              </div>
              <div style={{ marginTop: "0.8rem" }}>
                {courses.map(([name, row]) => {
                  const pct = row.total
                    ? Math.round((row.done / row.total) * 100)
                    : 0;
                  return (
                    <button
                      key={name}
                      type="button"
                      className={`course-meter ${focusCourse === name ? "is-on" : ""}`}
                      onClick={() =>
                        setFocusCourse((currentName) =>
                          currentName === name ? "" : name,
                        )
                      }
                    >
                      <span className="course-meter-top">
                        <span>{name}</span>
                        <span>
                          {row.done}/{row.total}
                        </span>
                      </span>
                      <span className="meter" aria-hidden>
                        <span
                          className="meter-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

        <div className="grid-2">
          <section className="panel" aria-labelledby="proximos-title">
            <div className="panel-head">
              <h2 id="proximos-title">Próximos</h2>
              <Link className="btn sm" to="/cursos">
                Nueva actividad
              </Link>
            </div>
            {busy && (
              <>
                <div className="loading-line" />
                <div className="loading-line" />
              </>
            )}
            {!busy && visibleUpcoming.length === 0 && (
              <EmptyState
                title="Sin entregas a la vista"
                description="Crea tareas, proyectos o exámenes desde Cursos."
                actionLabel="Ir a cursos"
                actionTo="/cursos"
              />
            )}
            {!busy && visibleUpcoming.length > 0 && (
              <div className="list">
                {visibleUpcoming.map((item) => (
                  <article className="row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <div className="meta">
                        {item.subjectName} · {formatWhen(item.dueAt)}
                      </div>
                      <div className="chip-row">
                        <StatusBadge tone="neutral">
                          {itemTypeLabel(item.type)}
                        </StatusBadge>
                        <StatusBadge
                          tone={
                            item.status === "IN_PROGRESS"
                              ? "warn"
                              : item.status === "SCHEDULED"
                                ? "info"
                                : item.status === "DONE"
                                  ? "ok"
                                  : "neutral"
                          }
                        >
                          {itemStatusLabel(item.status)}
                        </StatusBadge>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <Link className="link-more" to="/cursos">
              Gestionar cursos →
            </Link>
          </section>

          <section className="panel" aria-labelledby="avisos-title">
            <div className="panel-head">
              <h2 id="avisos-title">Avisos</h2>
            </div>
            {!busy && notes.length === 0 && (
              <EmptyState
                title="Todo tranquilo"
                description="Cuando crees una actividad con fecha, aparecerá un recordatorio aquí."
              />
            )}
            {!busy && notes.length > 0 && (
              <div className="list">
                {notes.map((n) => (
                  <article className="row" key={n.id}>
                    <div>
                      <strong>{n.title}</strong>
                      <div className="meta">
                        {n.relatedSubjectName || n.body}
                        {n.relatedItemTitle ? ` · ${n.relatedItemTitle}` : ""}
                      </div>
                    </div>
                    <StatusBadge
                      tone={n.kind === "PERSISTENT" ? "info" : "ok"}
                    >
                      {notifKindLabel(n.kind)}
                    </StatusBadge>
                  </article>
                ))}
              </div>
            )}
            <Link className="link-more" to="/perfil">
              Ver avisos en perfil →
            </Link>
          </section>
        </div>
        </>
      )}
    </>
  );
}
