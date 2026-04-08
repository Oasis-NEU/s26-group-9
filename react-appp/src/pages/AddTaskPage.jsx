import { useState } from "react";
import "./AddTaskPage.css";

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Not started", "In progress", "Completed"];
const TAGS = ["School", "Work", "Personal", "Reading", "Coding"];

function formatDateInputAsYouType(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  } else if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

function normalizeDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{0,4}))?$/);
  if (!match) return formatDateInputAsYouType(raw);

  const month = match[1].padStart(2, '0');
  const day = match[2].padStart(2, '0');
  const year = match[3] || '';
  return year ? `${month}/${day}/${year}` : `${month}/${day}`;
}

export default function AddTaskPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState("High");
  const [status, setStatus] = useState("Not started");
  const [selectedTags, setSelectedTags] = useState(["School"]);
  const [subtasks, setSubtasks] = useState(["Write outline", ""]);

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const updateSubtask = (i, val) => {
    setSubtasks(prev => prev.map((s, idx) => idx === i ? val : s));
  };

  const addSubtask = () => setSubtasks(prev => [...prev, ""]);

  const handleSubmit = () => {
    if (!title.trim()) return alert("Title is required.");
    const task = { title, description, dueDate, dueTime, priority, status, selectedTags, subtasks: subtasks.filter(Boolean) };
    console.log("Task submitted:", task);
  };

  return (
    <div className="atp-container atp-container--embedded">
      <h2 className="atp-heading">Add new task</h2>
      <p className="atp-subheading">Only title is required — fill in as much as you like.</p>

            <div className="atp-field">
              <label className="atp-label">TITLE</label>
              <input
                className="atp-input"
                placeholder="e.g. Research paper outline"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="atp-field">
              <label className="atp-label">DESCRIPTION</label>
              <textarea
                className="atp-textarea"
                placeholder="Add notes, context, or links..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="atp-row">
              <div className="atp-field atp-field--grow">
                <label className="atp-label">DEADLINE</label>
                <input
                  className="atp-input"
                  type="text"
                  placeholder="MM/DD/YYYY"
                  value={dueDate}
                  onChange={e => setDueDate(formatDateInputAsYouType(e.target.value))}
                  onBlur={e => setDueDate(normalizeDateInput(e.target.value))}
                />
              </div>
              <div className="atp-field">
                <label className="atp-label">TIME</label>
                <input
                  className="atp-input atp-input--deadline-time"
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                />
              </div>
            </div>

            <div className="atp-field">
              <label className="atp-label">PRIORITY</label>
              <div className="atp-pill-row">
                {PRIORITIES.map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`atp-pill ${priority === p ? "atp-pill--active atp-pill--priority" : ""}`}
                    onClick={() => setPriority(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="atp-field">
              <label className="atp-label">STATUS</label>
              <div className="atp-pill-row">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`atp-pill ${status === s ? "atp-pill--active atp-pill--status" : ""}`}
                    onClick={() => setStatus(s)}
                  >
                    {s === "Completed" && <span className="atp-check-icon">✓</span>}
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="atp-field">
              <label className="atp-label">TAGS</label>
              <div className="atp-pill-row">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={`atp-pill ${selectedTags.includes(tag) ? "atp-pill--active atp-pill--tag" : ""}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="atp-field">
              <label className="atp-label">SUBTASKS</label>
              <div className="atp-subtasks">
                {subtasks.map((s, i) => (
                  <input
                    key={i}
                    className={`atp-subtask-input ${i === 0 && s ? "atp-subtask-input--filled" : ""}`}
                    placeholder={i === 0 ? "Subtask 1..." : `Subtask ${i + 1}...`}
                    value={s}
                    onChange={e => updateSubtask(i, e.target.value)}
                  />
                ))}
                <button type="button" className="atp-add-subtask" onClick={addSubtask}>+ Add subtask</button>
              </div>
            </div>

      <div className="atp-submit-row">
        <button className="atp-btn-submit" type="button" onClick={handleSubmit}>Add Task</button>
      </div>
    </div>
  );
}