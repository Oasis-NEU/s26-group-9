import './summarypanel.css';

function normalizeStatus(status) {
    return String(status || '').toLowerCase().replace(/[_\s-]+/g, '');
}

function normalizePriority(priority) {
    return String(priority || '').toLowerCase();
}

function isWithinDays(dateLike, maxDays) {
    const target = new Date(dateLike);
    if (Number.isNaN(target.getTime())) {
        return false;
    }

    const now = new Date();
    const diffDays = Math.ceil((target - now) / 86400000);
    return diffDays >= 0 && diffDays <= maxDays;
}

function computeStreak(sessions = []) {
    const byDate = new Set(
        sessions
            .map((s) => s?.started_at)
            .filter(Boolean)
            .map((value) => new Date(value).toISOString().slice(0, 10))
    );

    let streak = 0;
    const cursor = new Date();

    while (true) {
        const key = cursor.toISOString().slice(0, 10);
        if (!byDate.has(key)) {
            break;
        }
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function dueBadgeClass(daysLeft) {
    if (daysLeft <= 2) {
        return 'summary-panel__deadline-badge summary-panel__deadline-badge--urgent';
    }

    if (daysLeft <= 5) {
        return 'summary-panel__deadline-badge summary-panel__deadline-badge--soon';
    }

    return 'summary-panel__deadline-badge summary-panel__deadline-badge--later';
}

function formatDaysLabel(daysLeft) {
    if (daysLeft <= 0) {
        return 'Due today';
    }

    if (daysLeft === 1) {
        return '1 day left';
    }

    return `${daysLeft} days left`;
}

export default function SummaryPanel({ detailMode = 'overview', activeDetail = {}, tasks = [], sessions = [] }) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    const total = safeTasks.length;
    const completed = safeTasks.filter((t) => normalizeStatus(t?.status) === 'completed').length;
    const inProgress = safeTasks.filter((t) => normalizeStatus(t?.status) === 'inprogress').length;
    const streak = computeStreak(safeSessions);

    const dueSoon = safeTasks
        .filter((t) => isWithinDays(t?.due_date, 7))
        .sort((a, b) => new Date(a?.due_date) - new Date(b?.due_date));

    const pri = { high: 0, medium: 1, low: 2 };
    const focusTask = safeTasks
        .filter((t) => normalizeStatus(t?.status) !== 'completed')
        .sort((a, b) => (pri[normalizePriority(a?.priority)] ?? 1) - (pri[normalizePriority(b?.priority)] ?? 1))[0];

    const subtitle = `${new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    })} • ${dueSoon.length} due in 7 days`;

    if (detailMode === 'overview') {
        return (
            <section className="summary-panel">
                <h1 className="summary-panel__title">My Tasks, In-depth Summary</h1>
                <p className="summary-panel__subtitle">{greeting}. {subtitle}</p>

                <div className="summary-panel__stats-grid">
                    <article className="summary-panel__stat-card">
                        <p className="summary-panel__stat-value">{total}</p>
                        <p className="summary-panel__stat-label">Total Tasks</p>
                    </article>
                    <article className="summary-panel__stat-card">
                        <p className="summary-panel__stat-value">{completed}</p>
                        <p className="summary-panel__stat-label">Completed</p>
                    </article>
                    <article className="summary-panel__stat-card">
                        <p className="summary-panel__stat-value">{inProgress}</p>
                        <p className="summary-panel__stat-label">In Progress</p>
                    </article>
                    <article className="summary-panel__stat-card">
                        <p className="summary-panel__stat-value">{streak}</p>
                        <p className="summary-panel__stat-label">Day Streak</p>
                    </article>
                </div>

                <article className="summary-panel__focus-card">
                    <h2 className="summary-panel__section-title">Focus</h2>
                    {focusTask ? (
                        <>
                            <p className="summary-panel__focus-name">{focusTask.title || 'Untitled Task'}</p>
                            <p className="summary-panel__focus-meta">
                                Priority: {normalizePriority(focusTask.priority) || 'medium'}
                            </p>
                        </>
                    ) : (
                        <p className="summary-panel__text">No active tasks right now.</p>
                    )}
                </article>

                <article className="summary-panel__deadline-card">
                    <h2 className="summary-panel__section-title">Upcoming Deadlines</h2>
                    {dueSoon.length === 0 ? (
                        <p className="summary-panel__text">No tasks due within 7 days.</p>
                    ) : (
                        <ul className="summary-panel__list summary-panel__list--plain">
                            {dueSoon.map((task) => {
                                const dueDate = new Date(task?.due_date);
                                const daysLeft = Math.max(0, Math.ceil((dueDate - new Date()) / 86400000));
                                return (
                                    <li key={task?.id || `${task?.title}-${task?.due_date}`} className="summary-panel__deadline-item">
                                        <span className="summary-panel__deadline-name">{task?.title || 'Untitled Task'}</span>
                                        <span className={dueBadgeClass(daysLeft)}>{formatDaysLabel(daysLeft)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </article>
            </section>
        );
    }

    if (detailMode === 'task') {
        const task = activeDetail || {};
        const tags = Array.isArray(task?.tags) ? task.tags : [];
        const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
        const subtasksDone = subtasks.filter((s) => Boolean(s?.done || s?.is_done)).length;
        const subtasksTotal = subtasks.length;
        const timeLogged = safeSessions
            .filter((s) => (s?.task_id || s?.task) === task?.id)
            .reduce((sum, s) => sum + Number.parseInt(s?.duration_mins ?? s?.duration_minutes ?? s?.minutes ?? 0, 10), 0);
        const dueDate = new Date(task?.due_date);
        const daysLeft = Number.isNaN(dueDate.getTime()) ? null : Math.ceil((dueDate - new Date()) / 86400000);

        return (
            <section className="summary-panel">
                <h1 className="summary-panel__title">{task?.title || 'Task'} - summary</h1>
                <div className="summary-panel__chips">
                    <span className="summary-panel__chip">{task?.status || 'In Progress'}</span>
                    <span className="summary-panel__chip">{task?.priority || 'Medium'} priority</span>
                    {tags.map((tag) => (
                        <span key={tag} className="summary-panel__chip summary-panel__chip--light">{tag}</span>
                    ))}
                </div>

                <div className="summary-panel__stats-grid">
                    <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{subtasksDone}</p><p className="summary-panel__stat-label">Subtasks Done</p></article>
                    <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{subtasksTotal}</p><p className="summary-panel__stat-label">Subtasks Total</p></article>
                    <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{timeLogged}</p><p className="summary-panel__stat-label">Minutes Logged</p></article>
                    <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{daysLeft ?? '-'}</p><p className="summary-panel__stat-label">Days Left</p></article>
                </div>

                <article>
                    <h2 className="summary-panel__section-title">Subtasks</h2>
                    {subtasksTotal === 0 ? (
                        <p className="summary-panel__text">No subtasks yet.</p>
                    ) : (
                        <ul className="summary-panel__list summary-panel__list--plain">
                            {subtasks.map((subtask, index) => (
                                <li key={subtask?.id || `${subtask?.text || subtask?.title}-${index}`} className="summary-panel__subtask-item">
                                    <span className={`summary-panel__checkbox ${subtask?.done || subtask?.is_done ? 'is-done' : ''}`}>✓</span>
                                    <span>{subtask?.text || subtask?.title || `Subtask ${index + 1}`}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </article>

                <article>
                    <h2 className="summary-panel__section-title">Description & Notes</h2>
                    <p className="summary-panel__text">{task?.description || task?.notes || 'No description yet.'}</p>
                </article>
            </section>
        );
    }

    const friendTasks = Array.isArray(activeDetail?.tasks) ? activeDetail.tasks : [];
    const friendName = activeDetail?.name || 'Friend';
    const friendActiveTask = friendTasks.find((t) => normalizeStatus(t?.status) !== 'completed');
    const friendCompleted = friendTasks.filter((t) => normalizeStatus(t?.status) === 'completed').length;
    const friendInProgress = friendTasks.filter((t) => normalizeStatus(t?.status) === 'inprogress').length;
    const highlights = friendTasks.slice(0, 4).map((t) => `${t?.title || t?.name || 'Task'} is ${t?.status || 'active'}`);

    return (
        <section className="summary-panel">
            <header className="summary-panel__friend-header">
                <div className="summary-panel__avatar">{friendName.slice(0, 1).toUpperCase()}</div>
                <div>
                    <h1 className="summary-panel__title">{friendName}, In-depth Summary</h1>
                    <p className="summary-panel__text">Friend detail snapshot</p>
                </div>
            </header>

            <article className="summary-panel__focus-card">
                <h2 className="summary-panel__section-title">Current Task</h2>
                <p className="summary-panel__focus-name">
                    {friendActiveTask ? friendActiveTask?.title : 'Currently idle'}
                </p>
            </article>

            <div className="summary-panel__stats-grid">
                <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{friendTasks.length}</p><p className="summary-panel__stat-label">Total Tasks</p></article>
                <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{friendCompleted}</p><p className="summary-panel__stat-label">Completed</p></article>
                <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{friendInProgress}</p><p className="summary-panel__stat-label">In Progress</p></article>
                <article className="summary-panel__stat-card"><p className="summary-panel__stat-value">{computeStreak(activeDetail?.sessions || [])}</p><p className="summary-panel__stat-label">Day Streak</p></article>
            </div>

            <ul className="summary-panel__list">
                {highlights.length > 0 ? (
                    highlights.map((item, index) => (
                        <li key={`${item}-${index}`} className="summary-panel__item">
                            {item}
                        </li>
                    ))
                ) : (
                    <li className="summary-panel__item">Highlights will appear here.</li>
                )}
            </ul>
        </section>
    );
}
