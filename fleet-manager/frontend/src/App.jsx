// ─────────────────────────────────────────────────────────────
// App routing. Public route: /login. Everything else is wrapped in the
// app shell (Layout) and protected by ProtectedRoute.
// ─────────────────────────────────────────────────────────────
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VehicleList from './pages/VehicleList';
import VehicleDetail from './pages/VehicleDetail';
import VehicleForm from './pages/VehicleForm';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected app shell */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/vehicles" element={<VehicleList />} />
        <Route path="/vehicles/new" element={<VehicleForm />} />
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
      </Route>

      {/* Anything else -> dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
