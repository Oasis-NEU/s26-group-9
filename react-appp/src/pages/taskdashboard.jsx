import { useState } from "react";
import "./taskdashboard.css";

function formatTimeSpent(task) {
  const rawMinutes = task?.time_spent_mins ?? task?.minutes ?? task?.duration_mins;
  const parsedMinutes = Number.parseInt(rawMinutes, 10);

  if (Number.isFinite(parsedMinutes) && parsedMinutes >= 60) {
    const hours = Math.floor(parsedMinutes / 60);
    const minutes = parsedMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (Number.isFinite(parsedMinutes) && parsedMinutes >= 0) {
    return `${parsedMinutes}m`;
  }

  return task?.timeSpent || "0m";
}

export default function TaskDashboard({ tasks = [], addTask, isLoading = false, dataError = "" }) {
  const [selectedId, setSelectedId] = useState(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) : null;

  async function handleAddTask(e) {
    e.preventDefault();
    const trimmed = newTaskName.trim();
    if (!trimmed || typeof addTask !== "function") return;

    setIsSubmitting(true);
    await addTask(trimmed);
    setIsSubmitting(false);
    setNewTaskName("");
  }

  // task detail view
  if (selectedTask) {

    return (
      <div className="task-detail">
        <button className="task-detail__back" onClick={() => setSelectedId(null)}>
          ← Back to all tasks
        </button>
        <h1 className="task-detail__title">{selectedTask.title || selectedTask.name || "Untitled Task"}</h1>
        <p className="task-detail__meta">Time spent: {formatTimeSpent(selectedTask)}</p>
        <div className="task-detail__section">
          <h3 className="task-detail__section-title">Summary</h3>
          <p className="task-detail__section-body">
            In-depth task details and notes will appear here.
          </p>
        </div>
      </div>
    );
  }

  // default summary view
  return (
    <div className="task-detail">
      <h1 className="task-detail__title">My Tasks</h1>
      <p className="task-detail__meta">Welcome to your Tasks page.</p>

      <div className="task-detail__stats">
        <div className="stat-box">
          <p className="stat-box__num">{tasks.length}</p>
          <p className="stat-box__label">Total</p>
        </div>
        <div className="stat-box">
          <p className="stat-box__num">0</p>
          <p className="stat-box__label">Completed</p>
        </div>
        <div className="stat-box">
          <p className="stat-box__num">{tasks.length}</p>
          <p className="stat-box__label">In Progress</p>
        </div>
      </div>

      <div className="task-detail__section">
        <h3 className="task-detail__section-title">All Tasks</h3>

        <form className="add-task-form" onSubmit={handleAddTask}>
          <input
            type="text"
            className="add-task-input"
            placeholder="New task..."
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
          />
          <button type="submit" className="add-task-btn" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "+ Add"}
          </button>
        </form>

        {dataError ? <p className="task-detail__section-body">{dataError}</p> : null}
        {isLoading ? <p className="task-detail__section-body">Loading tasks...</p> : null}

        {!isLoading && tasks.length === 0 ? (
          <p className="task-detail__section-body">No tasks yet. Add one above.</p>
        ) : (
          <ul className="summary-list">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="summary-row"
                onClick={() => setSelectedId(t.id)}
              >
                <span className="summary-row__name">{t.title || t.name || "Untitled Task"}</span>
                <span className="summary-row__time">{formatTimeSpent(t)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}