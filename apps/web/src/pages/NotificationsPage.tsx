import { useEffect, useState } from "react";
import { api, type Notification } from "../api";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { formatWhen, notifKindLabel } from "../labels";

export function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");

  async function reload() {
    setItems(await api.listNotifications());
  }

  useEffect(() => {
    reload().catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Recordatorios"
        title="Avisos"
        subtitle="Normales para info puntual. Persistentes hasta que los descartes."
      />
      {error && <p className="error">{error}</p>}

      <section className="panel">
        {items.length === 0 ? (
          <EmptyState
            title="Sin avisos"
            description="Cuando crees un ítem con fecha, Studyy generará un recordatorio persistente."
            actionLabel="Ir a materias"
            actionTo="/materias"
          />
        ) : (
          <div className="list">
            {items.map((n) => (
              <article className="row" key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <div className="meta">
                    {n.body}
                    {n.relatedItemTitle
                      ? ` · ${n.relatedItemTitle}${
                          n.relatedSubjectName
                            ? ` (${n.relatedSubjectName})`
                            : ""
                        }`
                      : ""}
                  </div>
                  <div className="meta" style={{ marginTop: "0.25rem" }}>
                    {formatWhen(n.createdAt)}
                    {n.readAt ? " · leída" : " · sin leer"}
                  </div>
                </div>
                <div className="chip-row">
                  <StatusBadge tone={n.kind === "PERSISTENT" ? "info" : "ok"}>
                    {notifKindLabel(n.kind)}
                  </StatusBadge>
                  {!n.readAt && (
                    <button
                      className="btn ghost sm"
                      type="button"
                      onClick={async () => {
                        await api.markRead(n.id);
                        await reload();
                      }}
                    >
                      Marcar leída
                    </button>
                  )}
                  <button
                    className="btn ghost sm"
                    type="button"
                    onClick={async () => {
                      await api.dismiss(n.id);
                      await reload();
                    }}
                  >
                    Descartar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
