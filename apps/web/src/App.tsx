import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { SchedulePage } from "./pages/SchedulePage";
import { NotesPage } from "./pages/NotesPage";
import { NotificationsPage } from "./pages/NotificationsPage";

export function App() {
  return (
    <div className="app-shell">
      <header className="topnav">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          AcadFlow
        </div>
        <nav className="nav-links">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/materias">Materias</NavLink>
          <NavLink to="/horario">Horario</NavLink>
          <NavLink to="/apuntes">Apuntes</NavLink>
          <NavLink to="/notificaciones">Notificaciones</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/materias" element={<SubjectsPage />} />
        <Route path="/horario" element={<SchedulePage />} />
        <Route path="/apuntes" element={<NotesPage />} />
        <Route path="/notificaciones" element={<NotificationsPage />} />
      </Routes>
    </div>
  );
}
