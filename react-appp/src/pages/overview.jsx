import './overview.css';

function normalizeStatus(status) {
    return String(status || '').toLowerCase().replace(/[_\s-]+/g, '');
}

function normalizePriority(priority) {
    return String(priority || '').toLowerCase();
}

function formatMinutes(value) {
    const mins = Number.parseInt(value, 10);
    if (!Number.isFinite(mins) || mins <= 0) {
        return '0m';
    }

    const h = Math.floor(mins / 60);
    const m = mins % 60;

    if (h === 0) {
        return `${m}m`;
    }

    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function computeStreak(sessions = []) {
    const activeDays = new Set(
        sessions
            .map((s) => s?.started_at)
            .filter(Boolean)
            .map((value) => new Date(value).toISOString().slice(0, 10))
    );

    let streak = 0;
    const cursor = new Date();

    while (activeDays.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function isDueInDays(task, maxDays = 7) {
    const date = new Date(task?.due_date);
    if (Number.isNaN(date.getTime())) {
        return false;
    }

    const days = Math.ceil((date - new Date()) / 86400000);
    return days >= 0 && days <= maxDays;
}

export function Overview({ tasks = [], sessions = [], userName = '' }) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    const total = safeTasks.length;
    const done = safeTasks.filter((t) => ['completed', 'done'].includes(normalizeStatus(t?.status))).length;
    const inProgress = safeTasks.filter((t) => normalizeStatus(t?.status) === 'inprogress').length;
    const dayStreak = computeStreak(safeSessions);

    const stats = [
        { label: 'Total', value: total },
        { label: 'Done', value: done },
        { label: 'In progress', value: inProgress },
        { label: 'Day streak', value: dayStreak },
    ];

    const dueThisWeek = safeTasks
        .filter((t) => isDueInDays(t, 7))
        .sort((a, b) => new Date(a?.due_date) - new Date(b?.due_date));

    const pri = { high: 0, medium: 1, low: 2 };
    const focusTask = safeTasks
        .filter((t) => !['completed', 'done'].includes(normalizeStatus(t?.status)))
        .sort((a, b) => (pri[normalizePriority(a?.priority)] ?? 1) - (pri[normalizePriority(b?.priority)] ?? 1))[0];

    return (
        <div className="overview-layout">
            <div className="overview-main">
                <div className="overview-content">
                    <div className="overview-header">
                        <h1>{greeting}, {userName || 'there'}</h1>
                        <p>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long' })} · {dueThisWeek.length} tasks due this week
                        </p>
                    </div>

                    <div className="overview-stats-grid">
                        {stats.map((stat) => (
                            <div key={stat.label} className="overview-stat-card">
                                <div className="overview-stat-value">{stat.value}</div>
                                <div className="overview-stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="overview-focus-card">
                        <div className="overview-focus-dot" />
                        <div className="overview-focus-body">
                            <h3>Focus: {focusTask?.title || 'No active task'}</h3>
                            <p>
                                {focusTask?.due_date ? `Due ${new Date(focusTask.due_date).toLocaleDateString()}` : 'No due date'} ·
                                {' '}{focusTask?.priority || 'Medium'} priority
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 className="overview-section-title">UPCOMING DEADLINES</h2>
                        <div className="overview-deadline-list">
                            {dueThisWeek.length === 0 ? (
                                <div className="overview-deadline-card">
                                    <div>
                                        <h4>No upcoming tasks</h4>
                                        <p>Add a task to get started</p>
                                    </div>
                                    <div className="overview-days-badge">-</div>
                                </div>
                            ) : (
                                dueThisWeek.slice(0, 4).map((task) => {
                                    const daysLeft = Math.max(0, Math.ceil((new Date(task?.due_date) - new Date()) / 86400000));
                                    return (
                                        <DeadlineCard
                                            key={task?.id || `${task?.title}-${task?.due_date}`}
                                            title={task?.title || 'Untitled task'}
                                            due={`Due ${new Date(task?.due_date).toLocaleDateString()} · ${formatMinutes(task?.estimated_mins) || 'Not started'}`}
                                            daysLeft={`${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DeadlineCard({ title, due, daysLeft }) {
    return (
        <div className="overview-deadline-card">
            <div>
                <h4>{title}</h4>
                <p>{due}</p>
            </div>
            <div className="overview-days-badge">{daysLeft}</div>
        </div>
    );
}
