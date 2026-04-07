import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Edit2 } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faX } from '@fortawesome/free-solid-svg-icons';
import './overview.css';

function normalizeStatus(status) {
    return String(status || '').toLowerCase().replace(/[_\s-]+/g, '');
}

function normalizePriority(priority) {
    return String(priority || '').toLowerCase();
}

function formatMinutes(value) {
    const mins = Number.parseInt(value, 10);
    if (!Number.isFinite(mins) || mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
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
    if (Number.isNaN(date.getTime())) return false;
    const days = Math.ceil((date - new Date()) / 86400000);
    return days >= 0 && days <= maxDays;
}

function bestFocusWindow(sessions = []) {
    if (!sessions.length) return 'No focus trend yet';

    const counts = new Array(24).fill(0);
    sessions.forEach((session) => {
        const raw = session?.started_at;
        if (!raw) return;
        const hour = new Date(raw).getHours();
        if (Number.isInteger(hour) && hour >= 0 && hour <= 23) counts[hour] += 1;
    });

    let maxHour = 0;
    for (let i = 1; i < counts.length; i += 1) {
        if (counts[i] > counts[maxHour]) maxHour = i;
    }

    const start = new Date();
    start.setHours(maxHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(maxHour + 2);

    const startText = start.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase();
    const endText = end.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toLowerCase();
    return `${startText}-${endText}`;
}

function taskTimeBreakdown(tasks = [], sessions = []) {
    const colorScale = ['#cd8b5c', '#8b6f5c', '#c8b8a8', '#ac9686'];

    // Prefer task totals for the main overview so the chart always reflects all tasks.
    const fromTasks = tasks
        .map((task) => ({
            name: task?.title || 'Untitled',
            value: Number.parseInt(task?.time_spent_mins ?? 0, 10),
        }))
        .filter((row) => Number.isFinite(row.value) && row.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((row, index) => ({ ...row, color: colorScale[index] || '#c8b8a8' }));

    if (fromTasks.length > 0) {
        return fromTasks;
    }

    // Fallback to sessions if task totals are empty.
    const titleById = new Map(tasks.map((task) => [task?.id, task?.title || 'Untitled']));
    const minutesByTask = new Map();

    sessions.forEach((session) => {
        const taskId = session?.task_id;
        const label = titleById.get(taskId) || 'Other';
        const mins = Number(session?.duration_mins || 0);
        if (!Number.isFinite(mins) || mins <= 0) return;
        minutesByTask.set(label, (minutesByTask.get(label) || 0) + mins);
    });

    const fromSessions = [...minutesByTask.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, value], index) => ({ name, value, color: colorScale[index] || '#c8b8a8' }));

    if (fromSessions.length > 0) {
        return fromSessions;
    }

    return [
        { name: 'Research', value: 1, color: '#cd8b5c' },
        { name: 'Group proj', value: 1, color: '#8b6f5c' },
        { name: 'HW 4', value: 1, color: '#c8b8a8' },
    ];
}

function weekActivity(sessions = []) {
    const days = [];
    const today = new Date();

    for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date(today);
        day.setDate(today.getDate() - offset);
        const dayKey = day.toISOString().slice(0, 10);
        const active = sessions.some((s) => String(s?.started_at || '').startsWith(dayKey));
        days.push({
            day: day.toLocaleDateString('en-US', { weekday: 'narrow' }),
            active,
        });
    }

    return days;
}

export function Overview({ tasks = [], sessions = [], userName = '' }) {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const [currentStatus, setCurrentStatus] = useState('idle');
    const [currentTask, setCurrentTask] = useState('');
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [tempStatus, setTempStatus] = useState('idle');
    const [tempTask, setTempTask] = useState('');

    const statusOptions = [
        { value: 'working', label: 'Working', color: '#CD8B5C' },
        { value: 'break', label: 'On Break', color: '#AC9686' },
        { value: 'idle', label: 'Idle', color: '#C8B8A8' },
        { value: 'offline', label: 'Offline', color: '#8B6F5C' },
    ];

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

    const timeByTask = taskTimeBreakdown(safeTasks, safeSessions);
    const weekData = weekActivity(safeSessions);
    const bestFocus = bestFocusWindow(safeSessions);

    const getStatusDisplay = () => {
        const status = statusOptions.find((item) => item.value === currentStatus);
        if (!status) return 'Not set';
        if (currentStatus === 'working' && currentTask) return `${status.label}: ${currentTask}`;
        return status.label;
    };

    const handleStartEdit = () => {
        setTempStatus(currentStatus);
        setTempTask(currentTask);
        setIsEditingStatus(true);
    };

    const handleSaveStatus = () => {
        setCurrentStatus(tempStatus);
        setCurrentTask(tempTask);
        setIsEditingStatus(false);
    };

    const handleCancelEdit = () => {
        setIsEditingStatus(false);
        setTempStatus(currentStatus);
        setTempTask(currentTask);
    };

    return (
        <div className="overview-layout">
            <div className="overview-main">
                <div className="overview-content">
                    <div className="overview-header">
                        <h1>{greeting}, {userName || 'there'}</h1>
                        <p>{new Date().toLocaleDateString('en-US', { weekday: 'long' })} · {dueThisWeek.length} tasks due this week</p>
                    </div>

                    <div className="overview-status-card">
                        <div className="overview-status-row">
                            <div className="overview-status-body">
                                <h3 className="overview-status-title">YOUR STATUS</h3>
                                {!isEditingStatus ? (
                                    <div className="overview-status-display">
                                        <div
                                            className="overview-status-dot"
                                            style={{ backgroundColor: statusOptions.find((s) => s.value === currentStatus)?.color || '#C8B8A8' }}
                                        />
                                        <span>{getStatusDisplay()}</span>
                                    </div>
                                ) : (
                                    <div className="overview-status-form">
                                        <label>Status</label>
                                        <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)}>
                                            {statusOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        {tempStatus === 'working' && (
                                            <>
                                                <label>What are you working on?</label>
                                                <input
                                                    type="text"
                                                    value={tempTask}
                                                    onChange={(e) => setTempTask(e.target.value)}
                                                    placeholder="e.g., Research paper"
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!isEditingStatus ? (
                                <button type="button" className="overview-icon-btn overview-icon-btn--ghost" onClick={handleStartEdit}>
                                    <Edit2 size={16} />
                                </button>
                            ) : (
                                <div className="overview-status-actions">
                                    <button type="button" className="overview-icon-btn overview-icon-btn--save" onClick={handleSaveStatus}>
                                        <FontAwesomeIcon icon={faCheck} aria-hidden="true" />
                                    </button>
                                    <button type="button" className="overview-icon-btn overview-icon-btn--cancel" onClick={handleCancelEdit}>
                                        <FontAwesomeIcon icon={faX} style={{ color: '#8b6f5c' }} aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>
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
                                {focusTask?.due_date ? `Due ${new Date(focusTask.due_date).toLocaleDateString()}` : 'No due date'}
                                {' · '}
                                {(focusTask?.priority || 'medium').toString()} priority
                                {' · '}
                                {formatMinutes(focusTask?.time_spent_mins)} logged
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
                                        <div key={task?.id || `${task?.title}-${task?.due_date}`} className="overview-deadline-card">
                                            <div>
                                                <h4>{task?.title || 'Untitled task'}</h4>
                                                <p>
                                                    Due {new Date(task?.due_date).toLocaleDateString()} · {formatMinutes(task?.estimated_mins)} est. remaining
                                                </p>
                                            </div>
                                            <div className="overview-days-badge">{daysLeft} day{daysLeft === 1 ? '' : 's'}</div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <aside className="overview-sidebar">
                <div className="overview-panel-block">
                    <h3 className="overview-section-title">TIME BY TASK</h3>
                    <div className="overview-chart-card">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie data={timeByTask} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                                    {timeByTask.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="overview-legend">
                        {timeByTask.map((row) => (
                            <div key={row.name} className="overview-legend-row">
                                <div className="overview-legend-left">
                                    <div className="overview-legend-swatch" style={{ background: row.color }} />
                                    <span>{row.name}</span>
                                </div>
                                <span>{formatMinutes(row.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="overview-panel-block">
                    <h3 className="overview-section-title">THIS WEEK</h3>
                    <div className="overview-week-card">
                        <div className="overview-week-bars">
                            {weekData.map((item, index) => (
                                <div key={`${item.day}-${index}`} className="overview-week-col">
                                    <div className={`overview-week-bar ${item.active ? 'is-active' : ''}`} />
                                    <span>{item.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overview-streak-card">
                    <div className="overview-streak-count">{dayStreak}</div>
                    <div className="overview-streak-label">day streak</div>
                    <div className="overview-streak-dots">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className={`overview-streak-dot ${i <= Math.min(dayStreak, 7) ? 'is-active' : ''}`} />
                        ))}
                    </div>
                </div>

                <div className="overview-focus-hint">
                    <div>Best focus: {bestFocus}</div>
                    <div>{done} tasks completed this week</div>
                </div>
            </aside>
        </div>
    );
}
