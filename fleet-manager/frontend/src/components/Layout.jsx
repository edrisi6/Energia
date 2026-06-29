// ─────────────────────────────────────────────────────────────
// The app shell shown to logged-in users: a top bar with the app name and
// the current user, plus a bottom navigation bar (mobile-first). The active
// page renders in the middle via <Outlet/>.
// ─────────────────────────────────────────────────────────────
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Friendly labels for the role codes.
const ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  service_operator: 'Service Operator',
};

function BottomTab({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
          isActive ? 'text-brand-600' : 'text-slate-400'
        }`
      }
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚗</span>
          <span className="font-semibold">Fleet Manager</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-slate-400">
              {ROLE_LABELS[user?.role] || user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl border-t border-slate-200 bg-white">
        <BottomTab to="/" end label="Dashboard" icon="🏠" />
        <BottomTab to="/vehicles" label="Vehicles" icon="🚙" />
      </nav>
    </div>
  );
}
