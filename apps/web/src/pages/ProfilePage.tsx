import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, type Notification } from "../api";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { exportPeriodJson, importPeriodJson } from "../export-period";
import {
  formatWhen,
  notifKindLabel,
  periodKindLabel,
  STUDY_TYPES,
} from "../labels";
import { usePeriod } from "../period-context";
import { toDateInput } from "../period-progress";
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
    savePeriodDates,
    removePeriod,
    refresh,
  } = usePeriod();

  const [profile, setProfile] = useState<ProfileSettings>(() => loadProfile());
  const [savedMsg, setSavedMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [periodForm, setPeriodForm] = useState({
    name: "",
    kind: "TRIMESTER" as "TRIMESTER" | "SEMESTER" | "CUSTOM",
    year: new Date().getFullYear(),
    startsAt: "",
    endsAt: "",
  });
  const [dates, setDates] = useState({ startsAt: "", endsAt: "" });
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

  useEffect(() => {
    setDates({
      startsAt: toDateInput(current?.startsAt),
      endsAt: toDateInput(current?.endsAt),
    });
  }, [current?.id, current?.startsAt, current?.endsAt]);

  function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    saveProfile(profile);
    setSavedMsg("Guardado");
    window.setTimeout(() => setSavedMsg(""), 1800);
  }

  async function onCreatePeriod(e: FormEvent) {
    e.preventDefault();
    await createPeriod({
      ...periodForm,
      startsAt: periodForm.startsAt
        ? new Date(periodForm.startsAt).toISOString()
        : "",
      endsAt: periodForm.endsAt
        ? new Date(periodForm.endsAt).toISOString()
        : "",
    });
    setPeriodForm({
      name: "",
      kind: profile.preferredKind,
      year: new Date().getFullYear(),
      startsAt: "",
      endsAt: "",
    });
  }

  async function onSaveDates(e: FormEvent) {
    e.preventDefault();
    if (!current) return;
    try {
      setError("");
      await savePeriodDates(
        current.id,
        dates.startsAt ? new Date(dates.startsAt).toISOString() : "",
        dates.endsAt ? new Date(dates.endsAt).toISOString() : "",
      );
      setSavedMsg("Fechas guardadas");
      window.setTimeout(() => setSavedMsg(""), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar las fechas");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Cuenta"
        title="Perfil"
        subtitle="Datos de estudiante, periodos y avisos."
      />
      {error && <p className="error">{error}</p>}

      <div className="profile-layout">
        <section className="panel" aria-labelledby="datos-title">
          <div className="panel-head">
            <h2 id="datos-title">Datos personales</h2>
          </div>
          <form
            className="form-stack"
            style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}
            onSubmit={onSaveProfile}
          >
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
              <label htmlFor="study-type">Tipo de estudio</label>
              <select
                id="study-type"
                value={profile.studyType}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    studyType: e.target.value as ProfileSettings["studyType"],
                  })
                }
              >
                {STUDY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="preferred-kind">Periodo preferido</label>
              <select
                id="preferred-kind"
                value={profile.preferredKind}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    preferredKind: e.target.value as ProfileSettings["preferredKind"],
                  })
                }
              >
                <option value="TRIMESTER">Trimestre</option>
                <option value="SEMESTER">Semestre</option>
                <option value="CUSTOM">Personalizado</option>
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
            <h2 id="periodos-title">Periodo de estudio</h2>
          </div>
          <p className="meta" style={{ marginBottom: "0.85rem" }}>
            Cursos, horario y apuntes usan el periodo activo.
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
            <>
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
              <form className="form-stack" onSubmit={onSaveDates}>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="active-start">Inicio</label>
                    <input
                      id="active-start"
                      type="date"
                      value={dates.startsAt}
                      onChange={(e) =>
                        setDates({ ...dates, startsAt: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="active-end">Fin</label>
                    <input
                      id="active-end"
                      type="date"
                      value={dates.endsAt}
                      onChange={(e) =>
                        setDates({ ...dates, endsAt: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <button className="btn sm" type="submit">
                  Guardar fechas
                </button>
              </form>
            </>
          )}

          <form className="form-stack" onSubmit={onCreatePeriod}>
            <div
              className="panel-head"
              style={{ borderBottom: 0, marginBottom: 0, paddingBottom: 0 }}
            >
              <h2 style={{ fontSize: "1rem" }}>Nuevo periodo</h2>
            </div>
            <div className="field">
              <label htmlFor="period-name">Nombre</label>
              <input
                id="period-name"
                placeholder="Ej. 2026-1, Curso intensivo…"
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
                      kind: e.target.value as typeof periodForm.kind,
                    })
                  }
                >
                  <option value="TRIMESTER">Trimestre</option>
                  <option value="SEMESTER">Semestre</option>
                  <option value="CUSTOM">Personalizado</option>
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
            <div className="form-row">
              <div className="field">
                <label htmlFor="period-start">Inicio</label>
                <input
                  id="period-start"
                  type="date"
                  value={periodForm.startsAt}
                  onChange={(e) =>
                    setPeriodForm({ ...periodForm, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="period-end">Fin</label>
                <input
                  id="period-end"
                  type="date"
                  value={periodForm.endsAt}
                  onChange={(e) =>
                    setPeriodForm({ ...periodForm, endsAt: e.target.value })
                  }
                />
              </div>
            </div>
            <button className="btn" type="submit">
              Crear y activar
            </button>
          </form>
        </section>

        <section className="panel profile-span" aria-labelledby="backup-title">
          <div className="panel-head">
            <h2 id="backup-title">Copia de seguridad</h2>
          </div>
          <p className="meta" style={{ marginBottom: "0.85rem" }}>
            Exporta o importa el periodo en JSON (cursos, actividades, horario y
            apuntes).
          </p>
          <div className="chip-row">
            <button
              type="button"
              className="btn sm"
              disabled={!current || exporting || importing}
              onClick={() => {
                if (!current) return;
                setExporting(true);
                exportPeriodJson(current)
                  .catch((err: Error) => setError(err.message))
                  .finally(() => setExporting(false));
              }}
            >
              {exporting ? "Exportando…" : "Exportar JSON"}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              disabled={importing || exporting}
              onClick={() => importRef.current?.click()}
            >
              {importing ? "Importando…" : "Importar JSON"}
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setImporting(true);
                setError("");
                importPeriodJson(file)
                  .then(async (period) => {
                    await refresh();
                    await setCurrentId(period.id);
                    setSavedMsg(`Importado: ${period.name}`);
                    window.setTimeout(() => setSavedMsg(""), 2200);
                  })
                  .catch((err: Error) => setError(err.message))
                  .finally(() => setImporting(false));
              }}
            />
            {savedMsg && <span className="meta">{savedMsg}</span>}
          </div>
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
