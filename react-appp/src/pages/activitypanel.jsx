import './activitypanel.css';

export default function ActivityPanel({ activity = [], title = 'Time Spent Activity' }) {
    const fallbackColors = ['#DCC9AE', '#BFA88D', '#8A7664', '#746455'];
    const inputItems = Array.isArray(activity) ? activity : [];

    const items = inputItems.map((item, index) => {
        const rawValue = item?.value;
        const numericValue =
            typeof rawValue === 'number'
                ? rawValue
                : Number.parseFloat(String(rawValue ?? '0').replace(/[^\d.]/g, ''));

        const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;

        return {
            label: item?.label || `Category ${index + 1}`,
            color: item?.color || fallbackColors[index % fallbackColors.length],
            numericValue: safeValue,
            displayValue:
                typeof rawValue === 'number'
                    ? `${rawValue}h`
                    : rawValue || '0h',
        };
    });

    const total = items.reduce((sum, item) => sum + item.numericValue, 0);

    let currentAngle = 0;
    const chartSegments =
        total > 0
            ? items
                .filter((item) => item.numericValue > 0)
                .map((item) => {
                    const sweep = (item.numericValue / total) * 360;
                    const start = currentAngle;
                    currentAngle += sweep;
                    return `${item.color} ${start}deg ${currentAngle}deg`;
                })
                .join(', ')
            : '#BFA88D 0deg 360deg';

    const chartStyle = {
        background: `conic-gradient(${chartSegments})`,
    };

    return (
        <section className="activity-panel">
            <h2 className="activity-panel__title">{title}</h2>

            <div className="activity-panel__chart" style={chartStyle} aria-hidden="true" />

            <ul className="activity-panel__legend">
                {items.length > 0 ? (
                    items.map((item, index) => (
                        <li key={`${item.label || 'item'}-${index}`} className="activity-panel__legend-item">
                            <span
                                className="activity-panel__swatch"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="activity-panel__label">{item.label}</span>
                            <span className="activity-panel__value">{item.displayValue}</span>
                        </li>
                    ))
                ) : (
                    <li className="activity-panel__empty">No activity data yet.</li>
                )}
            </ul>
        </section>
    );
}