import { useState } from "react";
import "./AddTaskPage.css";

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Not started", "In progress", "Completed"];
const TAGS = ["School", "Work", "Personal", "Reading", "Coding"];

export default function AddTaskPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [hours, setHours] = useState(2);
  const [minutes, setMinutes] = useState(30);
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
    const task = { title, description, dueDate, hours, minutes, priority, status, selectedTags, subtasks: subtasks.filter(Boolean) };
    console.log("Task submitted:", task);
  };

  return (
    <div className="atp-container">
      <h2 className="atp-heading">Add new task</h2>
      <p className="atp-subheading">Only title is required — fill in as much as you like.</p>

      {/* Title */}
      <div className="atp-field">
        <label className="atp-label">TITLE</label>
        <input
          className="atp-input"
          placeholder="e.g. Research paper outline"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="atp-field">
        <label className="atp-label">DESCRIPTION</label>
        <textarea
          className="atp-textarea"
          placeholder="Add notes, context, or links..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {/* Due Date + Time Estimate */}
      <div className="atp-row">
        <div className="atp-field atp-field--grow">
          <label className="atp-label">DUE DATE</label>
          <input
            className="atp-input"
            type="text"
            placeholder="MM/DD/YYYY"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            onFocus={e => (e.target.type = "date")}
            onBlur={e => { if (!e.target.value) e.target.type = "text"; }}
          />
        </div>
        <div className="atp-field">
          <label className="atp-label">TIME ESTIMATE</label>
          <div className="atp-time-row">
            <input
              className="atp-input atp-input--time"
              type="number"
              min={0}
              value={hours}
              onChange={e => setHours(e.target.value)}
            />
            <span className="atp-time-label">hr</span>
            <input
              className="atp-input atp-input--time"
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
            />
            <span className="atp-time-label">min</span>
          </div>
        </div>
      </div>

      {/* Priority */}
      <div className="atp-field">
        <label className="atp-label">PRIORITY</label>
        <div className="atp-pill-row">
          {PRIORITIES.map(p => (
            <button
              key={p}
              className={`atp-pill ${priority === p ? "atp-pill--active atp-pill--priority" : ""}`}
              onClick={() => setPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="atp-field">
        <label className="atp-label">STATUS</label>
        <div className="atp-pill-row">
          {STATUSES.map(s => (
            <button
              key={s}
              className={`atp-pill ${status === s ? "atp-pill--active atp-pill--status" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s === "Completed" && <span className="atp-check-icon">✓</span>}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="atp-field">
        <label className="atp-label">TAGS</label>
        <div className="atp-pill-row">
          {TAGS.map(tag => (
            <button
              key={tag}
              className={`atp-pill ${selectedTags.includes(tag) ? "atp-pill--active atp-pill--tag" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Subtasks */}
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
          <button className="atp-add-subtask" onClick={addSubtask}>+ Add subtask</button>
        </div>
      </div>

      {/* Submit */}
      <div className="atp-submit-row">
        <button className="atp-btn-submit" onClick={handleSubmit}>Add Task</button>
      </div>
    </div>
  );
}