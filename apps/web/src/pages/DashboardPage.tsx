import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Item, type Notification } from "../api";

export function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.listItems({ upcomingOnly: true, limit: 5 }),
      api.listNotifications(),
    ])
      .then(([nextItems, nextNotes]) => {
        setItems(nextItems);
        setNotes(nextNotes.slice(0, 5));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Tu semana académica</h1>
        <p>Organiza materias, entregas, horario y recordatorios en un solo lugar.</p>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="grid-2">
        <section className="panel">
          <h2>Próximos</h2>
          <div className="list">
            {items.length === 0 && <p className="empty">Sin próximos ítems.</p>}
            {items.map((item) => (
              <div className="row" key={item.id}>
                <div>
                  <strong>
                    {item.type} · {item.title}
                  </strong>
                  <div className="meta">
                    {item.subjectName}
                    {item.dueAt ? ` · ${new Date(item.dueAt).toLocaleString("es")}` : ""}
                  </div>
                </div>
                <span className="badge">{item.status}</span>
              </div>
            ))}
          </div>
          <p className="meta" style={{ marginTop: "1rem" }}>
            <Link to="/materias">Ver materias →</Link>
          </p>
        </section>

        <section className="panel">
          <h2>Notificaciones</h2>
          <div className="list">
            {notes.length === 0 && <p className="empty">Sin notificaciones.</p>}
            {notes.map((n) => (
              <div className="row" key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <div className="meta">
                    {n.relatedSubjectName || n.body}
                    {n.relatedItemTitle ? ` · ${n.relatedItemTitle}` : ""}
                  </div>
                </div>
                <span className={`badge ${n.kind === "PERSISTENT" ? "persistent" : "normal"}`}>
                  {n.kind === "PERSISTENT" ? "Persistente" : "Normal"}
                </span>
              </div>
            ))}
          </div>
          <p className="meta" style={{ marginTop: "1rem" }}>
            <Link to="/notificaciones">Ver todas →</Link>
          </p>
        </section>
      </div>
    </>
  );
}
