import { useState } from "react";
import { supabase } from '../lib/supabase';
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

function parseDateInput(inputValue) {
  const raw = String(inputValue || '').trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function parseTimeInput(inputValue) {
  const raw = String(inputValue || '').trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2}):(\d{2})\s*([aApP][mM])$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

  let hour24 = hour % 12;
  if (meridiem === 'PM') hour24 += 12;

  const hourText = String(hour24).padStart(2, '0');
  const minuteText = String(minute).padStart(2, '0');
  return `${hourText}:${minuteText}:00`;
}

function mapStatusToDb(statusValue) {
  const raw = String(statusValue || '').toLowerCase().replace(/\s+/g, '_');
  if (raw === 'not_started' || raw === 'in_progress' || raw === 'completed') return raw;
  return 'in_progress';
}

function getMissingColumnName(error) {
  const details = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;

  const quotedBeforeColumn = details.match(/['"]([a-zA-Z0-9_]+)['"]\s+column/i);
  if (quotedBeforeColumn) return quotedBeforeColumn[1];

  const quotedAfterColumn = details.match(/column\s+['"]?([a-zA-Z0-9_]+)['"]?/i);
  if (quotedAfterColumn) return quotedAfterColumn[1];

  return '';
}

async function insertTaskWithFallback(payload) {
  const nextPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await supabase
      .from('tasks')
      .insert(nextPayload)
      .select('id')
      .single();

    if (!result.error) {
      return { data: result.data, error: null };
    }

    if (result.error.code === '42703') {
      const missingColumn = getMissingColumnName(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        delete nextPayload[missingColumn];
        continue;
      }
    }

    return { data: null, error: result.error };
  }

  return { data: null, error: { message: 'Could not create task with current schema.' } };
}

async function insertSubtaskWithFallback({ taskId, userId, text }) {
  let result = await supabase.from('subtasks').insert({
    user_id: userId,
    task_id: taskId,
    title: text,
    is_done: false,
  });

  if (!result.error) return { error: null };

  result = await supabase.from('subtasks').insert({
    task_id: taskId,
    text,
    done: false,
  });

  if (!result.error) return { error: null };

  result = await supabase.from('subtasks').insert({
    task_id: taskId,
    title: text,
  });

  return { error: result.error || null };
}

export default function AddTaskPage({ userId, onRefresh, onTaskCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState("High");
  const [status, setStatus] = useState("Not started");
  const [selectedTags, setSelectedTags] = useState(["School"]);
  const [customTags, setCustomTags] = useState([]);
  const [newTagDraft, setNewTagDraft] = useState("");
  const [subtasks, setSubtasks] = useState([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitMessageType, setSubmitMessageType] = useState("success");

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const cleanTag = newTagDraft.trim();
    if (!cleanTag) return;

    const existsInDefault = TAGS.some((tag) => tag.toLowerCase() === cleanTag.toLowerCase());
    const existsInCustom = customTags.some((tag) => tag.toLowerCase() === cleanTag.toLowerCase());
    if (existsInDefault || existsInCustom) {
      setNewTagDraft("");
      return;
    }

    setCustomTags((prev) => [...prev, cleanTag]);
    setSelectedTags((prev) => (prev.includes(cleanTag) ? prev : [...prev, cleanTag]));
    setNewTagDraft("");
  };

  const removeTagFromSelection = (tagToRemove) => {
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const removeCustomTag = (tagToRemove) => {
    setCustomTags((prev) => prev.filter((tag) => tag !== tagToRemove));
    setSelectedTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const availableTags = [...TAGS, ...customTags];

  const updateSubtask = (i, val) => {
    setSubtasks(prev => prev.map((s, idx) => idx === i ? val : s));
  };

  const addSubtask = () => setSubtasks(prev => [...prev, ""]);

  const removeSubtask = (i) => {
    setSubtasks((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length > 0 ? next : [""];
    });
  };

  const handleSubmit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setSubmitMessageType('error');
      setSubmitMessage('Title is required.');
      return;
    }

    const parsedDueDate = dueDate ? parseDateInput(dueDate) : null;
    if (dueDate && !parsedDueDate) {
      setSubmitMessageType('error');
      setSubmitMessage('Invalid date format. Use MM/DD/YYYY.');
      return;
    }

    const parsedDueTime = dueTime ? parseTimeInput(dueTime) : null;
    if (dueTime && !parsedDueTime) {
      setSubmitMessageType('error');
      setSubmitMessage('Invalid time format. Use HH:MM AM/PM.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    let currentUserId = userId;
    if (!currentUserId) {
      const auth = await supabase.auth.getUser();
      currentUserId = auth?.data?.user?.id || null;
    }

    if (!currentUserId) {
      setSubmitMessageType('error');
      setSubmitMessage('You must be logged in to add a task.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      user_id: currentUserId,
      title: cleanTitle,
      description: description.trim() || null,
      status: mapStatusToDb(status),
      priority: String(priority || '').toLowerCase(),
      due_date: parsedDueDate,
      due_time: parsedDueTime,
      tag: selectedTags[0] || null,
    };

    const createTaskResult = await insertTaskWithFallback(payload);
    if (createTaskResult.error) {
      setSubmitMessageType('error');
      setSubmitMessage(createTaskResult.error.message || 'Could not create task.');
      setIsSubmitting(false);
      return;
    }

    const taskId = createTaskResult?.data?.id || null;
    const cleanSubtasks = subtasks.map((item) => item.trim()).filter(Boolean);
    if (taskId && cleanSubtasks.length > 0) {
      for (const subtaskText of cleanSubtasks) {
        const subtaskResult = await insertSubtaskWithFallback({
          taskId,
          userId: currentUserId,
          text: subtaskText,
        });

        if (subtaskResult.error) {
          setSubmitMessageType('error');
          setSubmitMessage(subtaskResult.error.message || 'Task created, but one or more subtasks failed to save.');
          setIsSubmitting(false);
          if (typeof onRefresh === 'function') await onRefresh();
          return;
        }
      }
    }

    if (typeof onRefresh === 'function') {
      await onRefresh();
    }

    setSubmitMessageType('success');
    setSubmitMessage('Task added successfully.');
    setTitle('');
    setDescription('');
    setDueDate('');
    setDueTime('');
    setPriority('High');
    setStatus('Not started');
    setSelectedTags(['School']);
    setCustomTags([]);
    setNewTagDraft('');
    setSubtasks(['']);

    if (typeof onTaskCreated === 'function') {
      await onTaskCreated(taskId);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="atp-container atp-container--embedded">
      <h2 className="atp-heading">Add new task</h2>
      <p className="atp-subheading">Only title is required — fill in as much as you like.</p>
      {submitMessage && (
        <p className={`atp-submit-message atp-submit-message--${submitMessageType}`}>
          {submitMessage}
        </p>
      )}

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
            type="text"
            placeholder="HH:MM AM/PM"
            inputMode="text"
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
              className={`atp-pill ${priority === p ? `atp-pill--active atp-pill--priority-${p.toLowerCase()}` : ""}`}
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
          {availableTags.map(tag => (
            <button
              key={tag}
              type="button"
              className={`atp-pill ${selectedTags.includes(tag) ? "atp-pill--active atp-pill--tag" : ""} ${customTags.includes(tag) ? "atp-pill--custom" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              <span>{tag}</span>
              {customTags.includes(tag) && (
                <span
                  className="atp-custom-tag-close"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove custom tag ${tag}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomTag(tag);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      removeCustomTag(tag);
                    }
                  }}
                >
                  x
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="atp-tag-custom-row">
          <input
            className="atp-input atp-tag-custom-input"
            type="text"
            placeholder="Create custom tag..."
            value={newTagDraft}
            onChange={(e) => setNewTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomTag();
              }
            }}
          />
          <button
            type="button"
            className="atp-tag-custom-add-btn"
            onClick={addCustomTag}
          >
            Add tag
          </button>
        </div>
        {selectedTags.length > 0 && (
          <div className="atp-selected-tags-row">
            {selectedTags.map((tag) => (
              <button
                key={`selected-${tag}`}
                type="button"
                className="atp-selected-tag-chip"
                onClick={() => removeTagFromSelection(tag)}
                aria-label={`Remove ${tag} from selected tags`}
              >
                <span>{tag}</span>
                <span className="atp-selected-tag-remove">x</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="atp-field">
        <label className="atp-label">SUBTASKS</label>
        <div className="atp-subtasks">
          {subtasks.map((s, i) => (
            <div key={i} className="atp-subtask-row">
              <input
                className="atp-subtask-input"
                placeholder={i === 0 ? "Subtask 1..." : `Subtask ${i + 1}...`}
                value={s}
                onChange={e => updateSubtask(i, e.target.value)}
              />
              <button
                type="button"
                className="atp-subtask-remove"
                onClick={() => removeSubtask(i)}
                aria-label={`Remove subtask ${i + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="atp-add-subtask" onClick={addSubtask}>+ Add subtask</button>
        </div>
      </div>

      <div className="atp-submit-row">
        <button className="atp-btn-submit" type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Task'}
        </button>
      </div>
    </div>
  );
}