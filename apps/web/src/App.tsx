import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { current } = usePeriod();
  const [profile, setProfile] = useState<ProfileSettings>(() => loadProfile());

  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    window.addEventListener("studyy-profile-updated", sync);
    return () => window.removeEventListener("studyy-profile-updated", sync);
  }, []);

  const closeMenu = () => setMenuOpen(false);

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
            id="nav-principal"
            className={`nav-links ${menuOpen ? "is-open" : ""}`}
            aria-label="Principal"
          >
            <NavLink to="/" end onClick={closeMenu}>
              Inicio
            </NavLink>
            <NavLink to="/materias" onClick={closeMenu}>
              Materias
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

      <main id="contenido">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/materias" element={<SubjectsPage />} />
          <Route path="/horario" element={<SchedulePage />} />
          <Route path="/apuntes" element={<NotesPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/notificaciones" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}
