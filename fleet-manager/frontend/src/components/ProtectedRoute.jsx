// ─────────────────────────────────────────────────────────────
// Guards routes that require a logged-in user. While the session is being
// restored we show a spinner; if there's no user, we redirect to /login.
// ─────────────────────────────────────────────────────────────
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Spinner label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
