import {
    Bar,
    BarChart,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
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
    const safeTasks = Array.isArray(tasks) ? tasks : [];
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

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekBars = days.map((label, i) => ({
        label,
        value: safeSessions
            .filter((s) => new Date(s?.started_at).getDay() === (i + 1) % 7)
            .reduce((sum, s) => sum + Number.parseInt(s?.duration_mins ?? s?.duration_minutes ?? s?.minutes ?? 0, 10), 0),
    }));

    const todayKey = new Date().toISOString().slice(0, 10);
    const todaySessions = safeSessions.filter((s) => {
        if (!s?.started_at) {
            return false;
        }
        return new Date(s.started_at).toISOString().slice(0, 10) === todayKey;
    });

    const totalEst = safeTasks.reduce((sum, t) => sum + Number.parseInt(t?.estimated_mins ?? 0, 10), 0);
    const totalLogged = safeSessions.reduce(
        (sum, s) => sum + Number.parseInt(s?.duration_mins ?? s?.duration_minutes ?? s?.minutes ?? 0, 10),
        0
    );
    const score = totalEst > 0 ? Math.min(100, Math.round((totalLogged / totalEst) * 100)) : 0;

    const hourlyBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, minutes: 0 }));
    safeSessions.forEach((s) => {
        const started = new Date(s?.started_at);
        if (Number.isNaN(started.getTime())) {
            return;
        }
        const hour = started.getHours();
        hourlyBuckets[hour].minutes += Number.parseInt(s?.duration_mins ?? s?.duration_minutes ?? s?.minutes ?? 0, 10);
    });
    const bestHour = hourlyBuckets.sort((a, b) => b.minutes - a.minutes)[0]?.hour ?? null;

    const weekStart = startOfWeek();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekTotal = safeSessions
        .filter((s) => {
            const d = new Date(s?.started_at);
            return d >= weekStart && d < weekEnd;
        })
        .reduce((sum, s) => sum + Number.parseInt(s?.duration_mins ?? s?.duration_minutes ?? s?.minutes ?? 0, 10), 0);

    const streak = computeStreak(safeSessions);
    const last7Days = Array.from({ length: 7 }, (_, index) => {
        const day = new Date();
        day.setDate(day.getDate() - (6 - index));
        const key = day.toISOString().slice(0, 10);
        return {
            key,
            active: safeSessions.some((s) => s?.started_at && new Date(s.started_at).toISOString().slice(0, 10) === key),
        };
    });

    if (safeSessions.length === 0) {
        return (
            <section className="activity-panel">
                <h2 className="activity-panel__title">{title}</h2>
                <p className="activity-panel__empty">No activity data yet</p>
            </section>
        );
    }

    return (
        <section className="activity-panel">
            <h2 className="activity-panel__title">{title}</h2>

            <div className="activity-panel__grid">
                <article className="activity-panel__card">
                    <h3 className="activity-panel__section-title">Time Per Task</h3>
                    <div className="activity-panel__chart-wrap">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64}>
                                    {pieData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatMinutes(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className="activity-panel__card">
                    <h3 className="activity-panel__section-title">Weekly Time</h3>
                    <div className="activity-panel__chart-wrap">
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={weekBars}>
                                <XAxis dataKey="label" tick={{ fill: '#f8f7f6', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#f8f7f6', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(value) => formatMinutes(value)} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#dcc9ae" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                <article className="activity-panel__card activity-panel__card--score">
                    <h3 className="activity-panel__section-title">Productivity Score</h3>
                    <div
                        className="activity-panel__score-ring"
                        style={{ background: `conic-gradient(#dcc9ae ${score * 3.6}deg, #7f6f60 0deg)` }}
                    >
                        <div className="activity-panel__score-inner">{score}%</div>
                    </div>
                </article>
            </div>

            <article className="activity-panel__card">
                <h3 className="activity-panel__section-title">Today Session Log</h3>
                {todaySessions.length === 0 ? (
                    <p className="activity-panel__empty">No sessions logged today.</p>
                ) : (
                    <ul className="activity-panel__legend">
                        {todaySessions.map((session, index) => (
                            <li key={session?.id || `${session?.started_at}-${index}`} className="activity-panel__legend-item">
                                <span className="activity-panel__label">
                                    {new Date(session?.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="activity-panel__value">
                                    {formatMinutes(session?.duration_mins ?? session?.duration_minutes ?? session?.minutes)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </article>

            <article className="activity-panel__card">
                <h3 className="activity-panel__section-title">Insights</h3>
                <ul className="activity-panel__list">
                    <li className="activity-panel__item">Best focus hour: {bestHour === null ? 'N/A' : `${bestHour}:00`}</li>
                    <li className="activity-panel__item">Total this week: {formatMinutes(weekTotal)}</li>
                    <li className="activity-panel__item">Current streak: {streak} day(s)</li>
                </ul>

                <div className="activity-panel__streak-dots" aria-label="7 day streak">
                    {last7Days.map((day) => (
                        <span key={day.key} className={`activity-panel__dot ${day.active ? 'is-active' : ''}`} />
                    ))}
                </div>
            </article>
        </section>
    );
}