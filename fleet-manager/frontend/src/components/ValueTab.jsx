// ─────────────────────────────────────────────────────────────
// Value tab: shows the vehicle's current value (computed from depreciation,
// or a manual override) and a small chart of purchase value vs depreciated
// value over time. The chart is hand-drawn with SVG — no chart library needed.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { recordsApi } from '../api/records';
import { money } from '../utils/format';
import Spinner from './Spinner';

// Build an SVG polyline from a numeric series.
function points(series, getY, width, height, maxValue) {
  const n = series.length;
  return series
    .map((d, i) => {
      const x = n === 1 ? 0 : (i / (n - 1)) * width;
      const y = height - (getY(d) / maxValue) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function Chart({ series }) {
  const W = 300;
  const H = 140;
  const maxValue = Math.max(...series.map((d) => d.purchase), 1);

  const purchaseLine = points(series, (d) => d.purchase, W, H, maxValue);
  const valueLine = points(series, (d) => d.value, W, H, maxValue);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Value over time">
        {/* purchase reference line (flat) */}
        <polyline
          points={purchaseLine}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        {/* depreciated value line */}
        <polyline
          points={valueLine}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
        />
        {/* dots on the value line */}
        {series.map((d, i) => {
          const x = (i / (series.length - 1)) * W;
          const y = H - (d.value / maxValue) * H;
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#2563eb" />;
        })}
      </svg>
      {/* x-axis labels (first / mid / last) */}
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{series[0]?.label}</span>
        <span>{series[Math.floor(series.length / 2)]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-slate-400" /> Purchase value
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-brand-600" /> Estimated value
        </span>
      </div>
    </div>
  );
}

export default function ValueTab({ vehicleId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    recordsApi
      .value(vehicleId)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [vehicleId]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Current value</div>
          <div className="text-2xl font-bold">{money(data.currentValue)}</div>
          <div className="mt-1 text-xs text-slate-400">
            {data.isManualOverride ? 'Manual override' : 'Estimated from depreciation'}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Purchase price</div>
          <div className="text-2xl font-bold">{money(data.purchasePrice)}</div>
          <div className="mt-1 text-xs text-slate-400">
            {data.yearsOwned} yrs · {Math.round(data.depreciationRate * 100)}%/yr
          </div>
        </div>
      </div>

      {/* If there's an override, show the computed figure for reference. */}
      {data.isManualOverride && (
        <div className="card p-3 text-sm text-slate-600">
          Depreciation would estimate{' '}
          <span className="font-semibold">{money(data.computedValue)}</span>, but
          your manual override of {money(data.currentValue)} is used instead.
        </div>
      )}

      {/* Chart */}
      <div className="card p-4">
        <h3 className="mb-2 font-semibold">Value over time</h3>
        {data.purchasePrice > 0 ? (
          <Chart series={data.series} />
        ) : (
          <p className="text-sm text-slate-500">
            Add a purchase price to the vehicle to see the depreciation chart.
          </p>
        )}
      </div>
    </div>
  );
}
