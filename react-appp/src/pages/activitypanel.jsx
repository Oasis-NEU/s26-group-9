import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
} from 'recharts';
import './activitypanel.css';

function formatMinutes(totalMinutes) {
    const mins = Number.parseInt(totalMinutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) {
        return '0m';
    }

    const hours = Math.floor(mins / 60);
    const rem = mins % 60;

    if (hours === 0) {
        return `${rem}m`;
    }

    if (rem === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${rem}m`;
}

function startOfWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function computeStreak(sessions = []) {
    const activeDays = new Set(
        sessions
            .map((s) => s?.started_at)
            .filter(Boolean)
            .map((v) => new Date(v).toISOString().slice(0, 10))
    );

    let streak = 0;
    const day = new Date();

    while (activeDays.has(day.toISOString().slice(0, 10))) {
        streak += 1;
        day.setDate(day.getDate() - 1);
    }

    return streak;
}

export default function ActivityPanel({ activity = [], sessions = [], tasks = [], title = 'Time Spent Activity' }) {
    const fallbackColors = ['#DCC9AE', '#BFA88D', '#8A7664', '#746455'];
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const inputItems = Array.isArray(activity) ? activity : [];

    const pieData = inputItems
        .map((item, index) => {
            const numericValue = Number.parseFloat(String(item?.value ?? 0));
            const value = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
            return {
                name: item?.label || `Task ${index + 1}`,
                value,
                color: item?.color || fallbackColors[index % fallbackColors.length],
            };
        })
        .filter((item) => item.value > 0);

    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const weekData = weekDays.map((day, index) => {
        const jsDay = (index + 1) % 7;
        const total = safeSessions
            .filter((s) => new Date(s?.started_at).getDay() === jsDay)
            .reduce((sum, s) => sum + Number.parseInt(s?.duration_mins ?? s?.duration_minutes ?? s?.minutes ?? 0, 10), 0);
        return { day, active: total > 0 };
    });

    const streak = computeStreak(safeSessions);
    const timeData = pieData.length > 0 ? pieData : [{ name: 'No data', value: 1, color: '#C8B8A8' }];

    return (
        <section className="activity-panel">
            <h2 className="activity-panel__title">{title}</h2>

            <div className="activity-panel__section">
                <h3 className="activity-panel__section-title">TIME BY TASK</h3>
                <article className="activity-panel__card activity-panel__card--light">
                    <div className="activity-panel__chart-wrap activity-panel__chart-wrap--light">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={timeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                                    {timeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="activity-panel__legend-row">
                            <span>{pieData.length > 0 ? (pieData[0]?.name || 'Task') : 'No task activity yet'}</span>
                            <span>{pieData.length > 0 ? formatMinutes(pieData[0]?.value) : '0m'}</span>
                        </div>
                    </div>
                </article>
            </div>

            <div className="activity-panel__section">
                <h3 className="activity-panel__section-title">THIS WEEK</h3>
                <article className="activity-panel__card activity-panel__card--light">
                    <div className="activity-panel__week-box">
                        {weekData.map((item, i) => (
                            <div key={`${item.day}-${i}`} className="activity-panel__week-col">
                                <div className={`activity-panel__week-bar ${item.active ? 'is-active' : ''}`} />
                                <span>{item.day}</span>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            <div className="activity-panel__section">
                <h3 className="activity-panel__section-title">DAY STREAK</h3>
                <article className="activity-panel__card activity-panel__card--light activity-panel__card--streak">
                    <div className="activity-panel__streak-number">{streak}</div>
                    <div className="activity-panel__streak-label">day streak</div>
                    <div className="activity-panel__streak-dots" aria-label="7 day streak">
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                            <span key={day} className={`activity-panel__dot ${day <= streak ? 'is-active' : ''}`} />
                        ))}
                    </div>
                </article>
            </div>
        </section>
    );
}