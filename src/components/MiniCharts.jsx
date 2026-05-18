export function Sparkline({ values, tone = "gold", label }) {
  const series = values?.length >= 2 ? values : [values?.[0] || 0, values?.[0] || 0];
  const width = 148;
  const height = 42;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const spread = max - min || 1;
  const points = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * width;
      const y = height - ((value - min) / spread) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className={`sparkline sparkline-${tone}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle
        cx={width}
        cy={height - ((series[series.length - 1] - min) / spread) * (height - 6) - 3}
        r="3"
        fill="currentColor"
      />
    </svg>
  );
}

export function ProgressRail({ value, max = 100, tone = "gold", label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="rail" aria-label={label}>
      <span className={`rail-fill rail-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function WeightBars({ holdings }) {
  const max = Math.max(...holdings.map((item) => item[2]), 1);
  return (
    <div className="weight-bars">
      {holdings.map(([code, name, weight]) => (
        <div className="weight-row" key={code}>
          <div>
            <span className="mono">{code}</span>
            <span className="holding-name">{name}</span>
          </div>
          <div className="weight-track">
            <span style={{ width: `${(weight / max) * 100}%` }} />
          </div>
          <strong>{weight.toFixed(2)}%</strong>
        </div>
      ))}
    </div>
  );
}
