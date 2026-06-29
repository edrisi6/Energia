// ─────────────────────────────────────────────────────────────
// Login screen: username field + an on-screen PIN keypad (mobile-friendly).
// On success we go to the dashboard.
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MAX_PIN_LEN = 10;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function pressDigit(d) {
    setError('');
    setPin((p) => (p.length >= MAX_PIN_LEN ? p : p + d));
  }
  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');

    if (!username.trim()) return setError('Please enter your username.');
    if (pin.length < 6) return setError('PIN must be at least 6 digits.');

    setBusy(true);
    try {
      await login(username.trim(), pin);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  // The keypad layout: digits 1-9, then blank, 0, backspace.
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="text-4xl">🚗</div>
          <h1 className="mt-2 text-xl font-semibold">Fleet Manager</h1>
          <p className="text-sm text-slate-500">Sign in with your PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. owner"
            />
          </div>

          <div>
            <label className="label">PIN</label>
            {/* Dots showing how many digits entered (never the digits themselves). */}
            <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50">
              {pin.length === 0 ? (
                <span className="text-sm text-slate-400">Enter your PIN</span>
              ) : (
                pin.split('').map((_, i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-full bg-brand-600"
                  />
                ))
              )}
            </div>
          </div>

          {/* On-screen keypad */}
          <div className="grid grid-cols-3 gap-2">
            {keys.map((k, i) =>
              k === '' ? (
                <div key={i} />
              ) : k === '⌫' ? (
                <button
                  key={i}
                  type="button"
                  onClick={backspace}
                  className="btn-ghost h-14 text-xl"
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => pressDigit(k)}
                  className="btn-ghost h-14 text-xl"
                >
                  {k}
                </button>
              )
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
