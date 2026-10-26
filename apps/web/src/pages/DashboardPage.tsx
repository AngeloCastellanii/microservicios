import { useEffect, useState } from "react";
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
import { usePeriod } from "../period-context";

export function DashboardPage() {
  const { current, loading: periodLoading } = usePeriod();
  const [items, setItems] = useState<Item[]>([]);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!current) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.listItems({ periodId: current.id, upcomingOnly: true, limit: 6 }),
      api.listNotifications(),
    ])
      .then(([nextItems, nextNotes]) => {
        setItems(nextItems);
        setNotes(nextNotes.slice(0, 5));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [current]);

  const persistentCount = notes.filter((n) => n.kind === "PERSISTENT").length;
  const busy = loading || periodLoading;

  return (
    <>
      <section className="hero-panel" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">{BRAND_NAME}</p>
          <h1 id="hero-title" className="hero-brand">
            Estudia con el semestre bajo control
          </h1>
          <p className="lede">{BRAND_TAGLINE}</p>
          {current && (
            <p className="lede period-hero-meta">
              Viendo: {periodKindLabel(current.kind)} · {current.name}
            </p>
          )}
        </div>
        <div className="hero-stats" aria-label="Resumen rápido">
          <div className="stat-pill">
            <strong>{busy ? "—" : items.length}</strong>
            <span>próximas entregas</span>
          </div>
          <div className="stat-pill">
            <strong>{busy ? "—" : persistentCount}</strong>
            <span>avisos persistentes</span>
          </div>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      {!current && !periodLoading && (
        <EmptyState
          title="Configura un periodo"
          description="Ve a Perfil para crear o activar un trimestre o semestre."
          actionLabel="Ir a perfil"
          actionTo="/perfil"
        />
      )}

      {current && (
        <div className="grid-2">
          <section className="panel" aria-labelledby="proximos-title">
            <div className="panel-head">
              <h2 id="proximos-title">Próximos</h2>
            </div>
            {busy && (
              <>
                <div className="loading-line" />
                <div className="loading-line" />
              </>
            )}
            {!busy && items.length === 0 && (
              <EmptyState
                title="Sin entregas a la vista"
                description="Crea tareas, proyectos o exámenes desde Materias."
                actionLabel="Ir a materias"
                actionTo="/materias"
              />
            )}
            {!busy && items.length > 0 && (
              <div className="list">
                {items.map((item) => (
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
                                : "ok"
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
            <Link className="link-more" to="/materias">
              Gestionar materias →
            </Link>
          </section>

          <section className="panel" aria-labelledby="avisos-title">
            <div className="panel-head">
              <h2 id="avisos-title">Avisos</h2>
            </div>
            {!busy && notes.length === 0 && (
              <EmptyState
                title="Todo tranquilo"
                description="Cuando crees un ítem con fecha, aparecerá un recordatorio aquí."
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
      )}
    </>
  );
}
