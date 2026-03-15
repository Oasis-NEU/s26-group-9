import { useState } from "react";
import "./taskdashboard.css";

export default function TaskDashboard() {
  const [tasks, setTasks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newTaskName, setNewTaskName] = useState("");

  function handleAddTask(e) {
    e.preventDefault();
    const trimmed = newTaskName.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), name: trimmed, timeSpent: "0m" },
    ]);
    setNewTaskName("");
  }

  // task detail view
  if (selectedId) {
    const task = tasks.find((t) => t.id === selectedId);
    return (
      <div className="task-detail">
        <button className="task-detail__back" onClick={() => setSelectedId(null)}>
          ← Back to all tasks
        </button>
        <h1 className="task-detail__title">{task.name}</h1>
        <p className="task-detail__meta">Time spent: {task.timeSpent}</p>
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
          <button type="submit" className="add-task-btn">+ Add</button>
        </form>

        {tasks.length === 0 ? (
          <p className="task-detail__section-body">No tasks yet. Add one above.</p>
        ) : (
          <ul className="summary-list">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="summary-row"
                onClick={() => setSelectedId(t.id)}
              >
                <span className="summary-row__name">{t.name}</span>
                <span className="summary-row__time">{t.timeSpent}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}