// A simple centered loading spinner.
export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      <p className="mt-3 text-sm">{label}</p>
    </div>
  );
}
