import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { BRAND_NAME } from "./brand";
import { DashboardPage } from "./pages/DashboardPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { NotesPage } from "./pages/NotesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { usePeriod } from "./period-context";
import { periodKindLabel } from "./labels";
import { loadProfile, type ProfileSettings } from "./profile-settings";

export function App() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { current } = usePeriod();
  const [profile, setProfile] = useState<ProfileSettings>(() => loadProfile());
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
            viewTransition
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
            <NavLink to="/" end viewTransition onClick={closeMenu}>
              Inicio
            </NavLink>
            <NavLink to="/cursos" viewTransition onClick={closeMenu}>
              Cursos
            </NavLink>
            <NavLink to="/horario" viewTransition onClick={closeMenu}>
              Horario
            </NavLink>
            <NavLink to="/apuntes" viewTransition onClick={closeMenu}>
              Apuntes
            </NavLink>
            <NavLink to="/perfil" viewTransition onClick={closeMenu}>
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
              <NavLink
                to="/perfil"
                className="period-chip period-chip-link"
                viewTransition
              >
                {periodKindLabel(current.kind)} · {current.name}
              </NavLink>
            )}
          </div>
        )}
      </header>

      <main id="contenido" className="view-root">
        <div key={location.pathname} className="page-enter">
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/cursos" element={<SubjectsPage />} />
            <Route path="/materias" element={<SubjectsPage />} />
            <Route path="/horario" element={<SchedulePage />} />
            <Route path="/apuntes" element={<NotesPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/notificaciones" element={<ProfilePage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
