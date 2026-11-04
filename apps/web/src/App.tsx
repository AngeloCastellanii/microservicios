import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BRAND_NAME } from "./brand";
import { DashboardPage } from "./pages/DashboardPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { NotesPage } from "./pages/NotesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { usePeriod } from "./period-context";
import { periodKindLabel } from "./labels";
import { loadProfile, type ProfileSettings } from "./profile-settings";

type ViewId = "inicio" | "cursos" | "horario" | "apuntes" | "perfil";

function pathToView(pathname: string): ViewId {
  if (pathname.startsWith("/cursos") || pathname.startsWith("/materias")) {
    return "cursos";
  }
  if (pathname.startsWith("/horario")) return "horario";
  if (pathname.startsWith("/apuntes")) return "apuntes";
  if (pathname.startsWith("/perfil") || pathname.startsWith("/notificaciones")) {
    return "perfil";
  }
  return "inicio";
}

function ViewPane({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`view-pane ${active ? "is-active" : ""}`}
      aria-hidden={!active}
      inert={!active ? true : undefined}
    >
      {children}
    </div>
  );
}

export function App() {
  const location = useLocation();
  const activeView = pathToView(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const { current } = usePeriod();
  const [profile, setProfile] = useState<ProfileSettings>(() => loadProfile());
  const [mounted, setMounted] = useState(() => new Set<ViewId>([activeView]));
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    window.addEventListener("studyy-profile-updated", sync);
    return () => window.removeEventListener("studyy-profile-updated", sync);
  }, []);

  useEffect(() => {
    setMounted((prev) => {
      if (prev.has(activeView)) return prev;
      const next = new Set(prev);
      next.add(activeView);
      return next;
    });
  }, [activeView]);

  useLayoutEffect(() => {
    const updatePill = () => {
      const nav = navRef.current;
      if (!nav) return;
      const narrow = window.matchMedia("(max-width: 720px)").matches;
      const active = nav.querySelector("a.active") as HTMLElement | null;
      if (!active || narrow || menuOpen) {
        setPill((prev) => ({ ...prev, opacity: 0 }));
        return;
      }
      setPill({
        left: active.offsetLeft,
        width: active.offsetWidth,
        opacity: 1,
      });
    };

    updatePill();
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [location.pathname, menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const pillStyle = {
    "--pill-left": `${pill.left}px`,
    "--pill-width": `${pill.width}px`,
    opacity: pill.opacity,
  } as CSSProperties;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <header className="topbar">
        <div className="topbar-main">
          <NavLink
            to="/"
            className="brand"
            end
            aria-label={`${BRAND_NAME} inicio`}
            onClick={closeMenu}
          >
            <span className="brand-mark" aria-hidden />
            {BRAND_NAME}
          </NavLink>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="nav-principal"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Cerrar" : "Menú"}
          </button>

          <nav
            ref={navRef}
            id="nav-principal"
            className={`nav-links ${menuOpen ? "is-open" : ""}`}
            aria-label="Principal"
          >
            <span className="nav-pill" style={pillStyle} aria-hidden />
            <NavLink to="/" end onClick={closeMenu}>
              Inicio
            </NavLink>
            <NavLink to="/cursos" onClick={closeMenu}>
              Cursos
            </NavLink>
            <NavLink to="/horario" onClick={closeMenu}>
              Horario
            </NavLink>
            <NavLink to="/apuntes" onClick={closeMenu}>
              Apuntes
            </NavLink>
            <NavLink to="/perfil" onClick={closeMenu}>
              Perfil
            </NavLink>
          </nav>
        </div>

        {(current || profile.displayName) && (
          <div className="topbar-meta">
            {profile.displayName && (
              <span className="period-chip">{profile.displayName}</span>
            )}
            {current && (
              <NavLink to="/perfil" className="period-chip period-chip-link">
                {periodKindLabel(current.kind)} · {current.name}
              </NavLink>
            )}
          </div>
        )}
      </header>

      <main id="contenido" className="view-root">
        <div className="view-stack">
          {mounted.has("inicio") && (
            <ViewPane active={activeView === "inicio"}>
              <DashboardPage />
            </ViewPane>
          )}
          {mounted.has("cursos") && (
            <ViewPane active={activeView === "cursos"}>
              <SubjectsPage />
            </ViewPane>
          )}
          {mounted.has("horario") && (
            <ViewPane active={activeView === "horario"}>
              <SchedulePage />
            </ViewPane>
          )}
          {mounted.has("apuntes") && (
            <ViewPane active={activeView === "apuntes"}>
              <NotesPage />
            </ViewPane>
          )}
          {mounted.has("perfil") && (
            <ViewPane active={activeView === "perfil"}>
              <ProfilePage />
            </ViewPane>
          )}
        </div>
      </main>
    </div>
  );
}
