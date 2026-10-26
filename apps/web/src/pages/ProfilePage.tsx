import { useEffect, useState, type FormEvent } from "react";
import { api, type Notification } from "../api";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { formatWhen, notifKindLabel, periodKindLabel } from "../labels";
import { usePeriod } from "../period-context";
import {
  loadProfile,
  saveProfile,
  type ProfileSettings,
} from "../profile-settings";

export function ProfilePage() {
  const {
    periods,
    current,
    setCurrentId,
    createPeriod,
    removePeriod,
  } = usePeriod();

  const [profile, setProfile] = useState<ProfileSettings>(() => loadProfile());
  const [savedMsg, setSavedMsg] = useState("");
  const [periodForm, setPeriodForm] = useState({
    name: "",
    kind: "TRIMESTER" as "TRIMESTER" | "SEMESTER",
    year: new Date().getFullYear(),
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState("");

  async function reloadNotifications() {
    setNotifications(await api.listNotifications());
  }

  useEffect(() => {
    reloadNotifications().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    setPeriodForm((f) => ({ ...f, kind: profile.preferredKind }));
  }, [profile.preferredKind]);

  function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    saveProfile(profile);
    setSavedMsg("Guardado");
    window.setTimeout(() => setSavedMsg(""), 1800);
  }

  async function onCreatePeriod(e: FormEvent) {
    e.preventDefault();
    await createPeriod(periodForm);
    setPeriodForm({
      name: "",
      kind: profile.preferredKind,
      year: new Date().getFullYear(),
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Cuenta"
        title="Perfil"
        subtitle="Datos, periodos académicos, preferencias y avisos."
      />
      {error && <p className="error">{error}</p>}

      <div className="profile-layout">
        <section className="panel" aria-labelledby="datos-title">
          <div className="panel-head">
            <h2 id="datos-title">Datos personales</h2>
          </div>
          <form className="form-stack" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }} onSubmit={onSaveProfile}>
            <div className="field">
              <label htmlFor="display-name">Nombre</label>
              <input
                id="display-name"
                placeholder="Tu nombre"
                value={profile.displayName}
                onChange={(e) =>
                  setProfile({ ...profile, displayName: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="display-email">Correo</label>
              <input
                id="display-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label htmlFor="preferred-kind">Periodo preferido</label>
              <select
                id="preferred-kind"
                value={profile.preferredKind}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    preferredKind: e.target.value as "TRIMESTER" | "SEMESTER",
                  })
                }
              >
                <option value="TRIMESTER">Trimestre</option>
                <option value="SEMESTER">Semestre</option>
              </select>
            </div>
            <div className="chip-row">
              <button className="btn" type="submit">
                Guardar perfil
              </button>
              {savedMsg && <span className="meta">{savedMsg}</span>}
            </div>
          </form>
        </section>

        <section className="panel" aria-labelledby="periodos-title">
          <div className="panel-head">
            <h2 id="periodos-title">Periodo académico</h2>
          </div>
          <p className="meta" style={{ marginBottom: "0.85rem" }}>
            Elige el periodo activo. Materias, horario y apuntes usan este
            contexto.
          </p>

          <div className="field">
            <label htmlFor="active-period">Periodo activo</label>
            <select
              id="active-period"
              value={current?.id || ""}
              onChange={(e) => setCurrentId(e.target.value)}
            >
              {periods.length === 0 && <option value="">Sin periodos</option>}
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {periodKindLabel(p.kind)} {p.year}
                </option>
              ))}
            </select>
          </div>

          {current && (
            <div className="chip-row" style={{ marginTop: "0.75rem" }}>
              <StatusBadge tone="ok">Activo</StatusBadge>
              <span className="meta">
                {periodKindLabel(current.kind)} · {current.name}
              </span>
              <button
                type="button"
                className="btn ghost sm"
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
                Eliminar periodo
              </button>
            </div>
          )}

          <form className="form-stack" onSubmit={onCreatePeriod}>
            <div className="panel-head" style={{ borderBottom: 0, marginBottom: 0, paddingBottom: 0 }}>
              <h2 style={{ fontSize: "1rem" }}>Nuevo periodo</h2>
            </div>
            <div className="field">
              <label htmlFor="period-name">Nombre</label>
              <input
                id="period-name"
                placeholder="Nombre del periodo"
                value={periodForm.name}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="period-kind">Tipo</label>
                <select
                  id="period-kind"
                  value={periodForm.kind}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
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
                  value={periodForm.year}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
                      year: Number(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>
            <button className="btn" type="submit">
              Crear y activar
            </button>
          </form>
        </section>

        <section className="panel profile-span" aria-labelledby="avisos-title">
          <div className="panel-head">
            <h2 id="avisos-title">Avisos</h2>
          </div>
          {notifications.length === 0 ? (
            <EmptyState
              title="Sin avisos"
              description="Los recordatorios de entregas aparecerán aquí."
            />
          ) : (
            <div className="list">
              {notifications.map((n) => (
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
                    <StatusBadge
                      tone={n.kind === "PERSISTENT" ? "info" : "ok"}
                    >
                      {notifKindLabel(n.kind)}
                    </StatusBadge>
                    {!n.readAt && (
                      <button
                        className="btn ghost sm"
                        type="button"
                        onClick={async () => {
                          await api.markRead(n.id);
                          await reloadNotifications();
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
                        await reloadNotifications();
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
      </div>
    </>
  );
}
