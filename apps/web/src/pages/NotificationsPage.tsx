import { useEffect, useState } from "react";
import { api, type Notification } from "../api";

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
      <section className="hero">
        <h1>Notificaciones</h1>
        <p>Normales (informativas) y persistentes (recordatorios hasta descartar).</p>
      </section>
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <div className="list">
          {items.length === 0 && <p className="empty">No hay notificaciones.</p>}
          {items.map((n) => (
            <div className="row" key={n.id}>
              <div>
                <strong>{n.title}</strong>
                <div className="meta">
                  {n.body}
                  {n.relatedItemTitle
                    ? ` · ${n.relatedItemTitle}${n.relatedSubjectName ? ` (${n.relatedSubjectName})` : ""}`
                    : ""}
                </div>
                <div className="meta">
                  {new Date(n.createdAt).toLocaleString("es")}
                  {n.readAt ? " · leída" : " · sin leer"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <span className={`badge ${n.kind === "PERSISTENT" ? "persistent" : "normal"}`}>
                  {n.kind === "PERSISTENT" ? "Persistente" : "Normal"}
                </span>
                {!n.readAt && (
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={async () => {
                      await api.markRead(n.id);
                      await reload();
                    }}
                  >
                    Leer
                  </button>
                )}
                <button
                  className="btn ghost"
                  type="button"
                  onClick={async () => {
                    await api.dismiss(n.id);
                    await reload();
                  }}
                >
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
