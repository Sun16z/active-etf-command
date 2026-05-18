export function MetricTile({ icon: Icon, label, value, sub, tone = "neutral" }) {
  return (
    <section className={`metric metric-${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </section>
  );
}
