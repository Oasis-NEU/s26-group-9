import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { Bell, Play, Square, Clock, CheckCircle2 } from 'lucide-react';
import ActivityPanel from "./activitypanel";
import { Overview } from "./overview";
import Inbox from "./inbox";
import useAppData from '../hooks/useAppData';
import './dashboard.css';
import { supabase } from '../lib/supabase';
import Settings from './settings';

function formatMinutes(value) {
  const mins = Number.parseInt(value, 10);
  if (!Number.isFinite(mins) || mins <= 0) return "0m";

  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function extractDateParts(dateValue) {
  const raw = String(dateValue || '').trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function formatDueDate(dateValue) {
  const parts = extractDateParts(dateValue);
  if (!parts) return "No due date";
  const date = new Date(parts.year, parts.month - 1, parts.day);
  return `Due ${date.toLocaleDateString('en-US', { weekday: 'short' })}`;
}

function formatDueDateFull(dateValue) {
  const parts = extractDateParts(dateValue);
  if (!parts) return 'No due date';
  const date = new Date(parts.year, parts.month - 1, parts.day);
  return date.toLocaleDateString('en-US');
}

function toDateInputValue(dateValue) {
  const parts = extractDateParts(dateValue);
  if (!parts) return '';

  const y = String(parts.year);
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function priorityKey(priority) {
  const clean = String(priority || '').toLowerCase();
  if (clean === 'high' || clean === 'medium' || clean === 'low') return clean;
  return 'none';
}

function formatStatusLabel(status) {
  const clean = String(status || 'in_progress').toLowerCase().replace(/[_-]+/g, ' ');
  if (clean === 'not started') return 'Not Started';
  if (clean === 'in progress') return 'In Progress';
  if (clean === 'completed' || clean === 'done') return 'Completed';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function formatPriorityLabel(priority) {
  const p = priorityKey(priority);
  return p === 'none' ? 'No priority' : `${p.charAt(0).toUpperCase() + p.slice(1)} priority`;
}

function toInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function isSubtaskComplete(subtask) {
  if (typeof subtask?.is_done === 'boolean') {
    return subtask.is_done;
  }
  if (typeof subtask?.done === 'boolean') {
    return subtask.done;
  }
  const status = String(subtask?.status || '').toLowerCase();
  return status === 'done' || status === 'completed';
}

function parseTaskNotes(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
  } catch {
    // Fallback for legacy plain-text notes.
  }

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function serializeTaskNotes(notes) {
  return JSON.stringify(notes);
}

export default function Dashboard() {
  const [active, setActive] = useState("Task");
  const { user, tasks, sessions, activity, friendships, subtasks, isLoading, refresh } = useAppData();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const middlePanelRef = useRef(null);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskMessage, setSubtaskMessage] = useState("");
  const [subtaskMessageType, setSubtaskMessageType] = useState("success");
  const [subtaskActionId, setSubtaskActionId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteItems, setNoteItems] = useState([]);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('in_progress');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
  const friends = friendships.map(f => ({
    id: f.friend_id || f.id,
    name: f.friend_name || f.name || 'Friend',
    status: f.status || 'Active'
  }));
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [optimisticSessions, setOptimisticSessions] = useState([]);

  const panelSessions = useMemo(() => {
    const allSessions = [...optimisticSessions, ...(Array.isArray(sessions) ? sessions : [])];
    const seen = new Set();

    return allSessions.filter((session) => {
      const key = [
        session?.task_id || session?.taskId || '',
        session?.started_at || session?.startedAt || '',
        session?.duration_mins ?? session?.duration_minutes ?? session?.minutes ?? '',
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [optimisticSessions, sessions]);

  useEffect(() => {
    async function loadUser() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) return;
      setUserName(authData.user.user_metadata?.full_name || authData.user.email || "");
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      setSelectedTaskId(null);
      return;
    }

    const stillExists = tasks.some((task) => task.id === selectedTaskId);
    if (!selectedTaskId || !stillExists) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;
  const selectedTaskSubtasks = subtasks.filter((subtask) => {
    const relatedTaskId = subtask.task_id ?? subtask.taskId;
    return String(relatedTaskId || '') === String(selectedTaskId || '');
  });

  const completedSubtasks = selectedTaskSubtasks.filter((subtask) => isSubtaskComplete(subtask)).length;

  const dueDate = selectedTask?.due_date ? new Date(selectedTask.due_date) : null;
  const daysLeft = dueDate && !Number.isNaN(dueDate.getTime())
    ? Math.max(0, Math.ceil((dueDate - new Date()) / 86400000))
    : null;
  const taskCategory = selectedTask?.category || selectedTask?.subject || selectedTask?.tag || 'General';
  const rawTaskNotes = selectedTask?.notes ?? selectedTask?.description ?? "";

  useEffect(() => {
    const raw = String(selectedTask?.status || 'in_progress').toLowerCase();
    if (raw.includes('not') && raw.includes('start')) {
      setSelectedStatus('not_started');
      return;
    }
    if (raw === 'completed' || raw === 'done') {
      setSelectedStatus('completed');
      return;
    }
    setSelectedStatus('in_progress');
  }, [selectedTask?.id, selectedTask?.status]);

  useEffect(() => {
    setDueDateDraft(toDateInputValue(selectedTask?.due_date));
  }, [selectedTask?.id, selectedTask?.due_date]);

  useEffect(() => {
    if (active !== "Task" || !selectedTaskId || !middlePanelRef.current) {
      return;
    }

    middlePanelRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [active, selectedTaskId]);

  useEffect(() => {
    setNoteItems(parseTaskNotes(rawTaskNotes));
    setNoteDraft("");
  }, [selectedTask?.id, rawTaskNotes]);

  useEffect(() => {
    if (!subtaskMessage) return;

    const timeoutId = setTimeout(() => {
      setSubtaskMessage("");
    }, 2200);

    return () => clearTimeout(timeoutId);
  }, [subtaskMessage]);

  // Timer effect for study sessions
  useEffect(() => {
    let interval = null;

    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, sessionStartTime]);

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleStartSession = () => {
    const now = new Date();
    setSessionStartTime(now);
    setIsSessionActive(true);
    setElapsedSeconds(0);
  };

  const handleStopSession = async () => {
    if (sessionStartTime && selectedTask?.id) {
      const durationMins = Math.max(1, Math.floor(elapsedSeconds / 60));
      const newSession = {
        task_id: selectedTask.id,
        duration_mins: durationMins,
        started_at: sessionStartTime.toISOString(),
      };

      // Try to save to database if user exists
      const userId = user?.id || (await supabase.auth.getUser()).data?.user?.id;
      if (userId) {
        const optimisticId = `local-${Date.now()}`;
        setOptimisticSessions((prev) => [{ id: optimisticId, user_id: userId, ...newSession }, ...prev]);

        // Support both schemas: study_sessions(start_time, duration) and sessions(started_at, duration_mins).
        let insertResult = await supabase.from('study_sessions').insert({
          user_id: userId,
          task_id: newSession.task_id,
          start_time: newSession.started_at,
          duration: newSession.duration_mins,
        });

        if (insertResult.error) {
          insertResult = await supabase.from('sessions').insert({
            user_id: userId,
            ...newSession
          });
        }

        if (insertResult.error) {
          setSubtaskMessageType('error');
          setSubtaskMessage(insertResult.error.message || 'Could not save session.');
        }

        setOptimisticSessions((prev) => prev.filter((session) => session.id !== optimisticId));
      }

      await refresh();
    }

    setIsSessionActive(false);
    setSessionStartTime(null);
    setElapsedSeconds(0);
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    const trimmed = newSubtaskName.trim();
    if (!trimmed || !selectedTask?.id) return;

    setSubtaskMessage("");
    setIsAddingSubtask(true);
    const userId = user?.id || (await supabase.auth.getUser()).data?.user?.id;
    if (!userId) {
      setSubtaskMessageType("error");
      setSubtaskMessage("You must be logged in to add subtasks.");
      setIsAddingSubtask(false);
      return;
    }

    // Support both known schema variants: title/is_done and text/done.
    let insertResult = await supabase.from('subtasks').insert({
      user_id: userId,
      task_id: selectedTask.id,
      title: trimmed,
      is_done: false,
    });

    if (insertResult.error) {
      insertResult = await supabase.from('subtasks').insert({
        task_id: selectedTask.id,
        text: trimmed,
        done: false,
      });
    }

    if (!insertResult.error) {
      setNewSubtaskName("");
      await refresh();
      setSubtaskMessageType("success");
      setSubtaskMessage("Subtask added.");
    } else {
      setSubtaskMessageType("error");
      setSubtaskMessage(insertResult.error.message || "Could not add subtask.");
    }
    setIsAddingSubtask(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTask?.id) return;

    setIsSavingStatus(true);
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', selectedTask.id);

    if (!error) {
      setSelectedStatus(newStatus);
      await refresh();
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(error.message || 'Could not update status.');
    }
    setIsSavingStatus(false);
  };

  const handleSaveDueDate = async () => {
    if (!selectedTask?.id) return;

    setIsSavingDueDate(true);
    setSubtaskMessage('');

    const nextDueDate = dueDateDraft || null;
    const { error } = await supabase
      .from('tasks')
      .update({ due_date: nextDueDate })
      .eq('id', selectedTask.id);

    if (!error) {
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage(nextDueDate ? 'Due date updated.' : 'Due date cleared.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(error.message || 'Could not update due date.');
    }

    setIsSavingDueDate(false);
  };

  const persistNotes = async (nextNotes) => {
    if (!selectedTask?.id) return { error: { message: 'No selected task.' } };

    const payload = serializeTaskNotes(nextNotes);
    let result = await supabase
      .from('tasks')
      .update({ notes: payload })
      .eq('id', selectedTask.id);

    if (result.error) {
      result = await supabase
        .from('tasks')
        .update({ description: payload })
        .eq('id', selectedTask.id);
    }

    return result;
  };

  const handleAddNote = async () => {
    const cleaned = noteDraft.trim();
    if (!cleaned) return;

    setIsSavingNotes(true);
    setSubtaskMessage("");

    const nextNotes = [...noteItems, cleaned];
    const result = await persistNotes(nextNotes);

    if (!result.error) {
      setNoteItems(nextNotes);
      setNoteDraft("");
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage('Note added.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(result.error.message || 'Could not add note.');
    }

    setIsSavingNotes(false);
  };

  const handleRemoveNote = async (indexToRemove) => {
    setIsSavingNotes(true);
    setSubtaskMessage("");

    const nextNotes = noteItems.filter((_, index) => index !== indexToRemove);
    const result = await persistNotes(nextNotes);

    if (!result.error) {
      setNoteItems(nextNotes);
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage('Note removed.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(result.error.message || 'Could not remove note.');
    }

    setIsSavingNotes(false);
  };

  const handleToggleSubtaskComplete = async (subtask) => {
    if (!subtask?.id) return;

    const nextDone = !isSubtaskComplete(subtask);
    setSubtaskActionId(subtask.id);
    setSubtaskMessage("");

    let result = await supabase
      .from('subtasks')
      .update({ is_done: nextDone })
      .eq('id', subtask.id);

    if (result.error) {
      result = await supabase
        .from('subtasks')
        .update({ done: nextDone })
        .eq('id', subtask.id);
    }

    if (result.error) {
      result = await supabase
        .from('subtasks')
        .update({ status: nextDone ? 'done' : 'pending' })
        .eq('id', subtask.id);
    }

    if (!result.error) {
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage(nextDone ? 'Subtask marked complete.' : 'Subtask marked incomplete.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(result.error.message || 'Could not update subtask.');
    }

    setSubtaskActionId(null);
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!subtaskId) return;

    setSubtaskActionId(subtaskId);
    setSubtaskMessage("");

    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);

    if (!error) {
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage('Subtask removed.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(error.message || 'Could not remove subtask.');
    }

    setSubtaskActionId(null);
  };

  const handleLogoClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    user ? setActive("Overview") : navigate('/');
  };

  const handleAddTask = () => {
    navigate('/tasks/new');
  };

  const isInitialLoading =
    isLoading &&
    tasks.length === 0 &&
    subtasks.length === 0 &&
    friendships.length === 0 &&
    sessions.length === 0;

  if (isInitialLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#99836F',
          fontSize: '1rem'
        }}
      >
        Loading your tasks...
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-topbar">
        <button
          type="button"
          className="dashboard-home-link"
          onClick={handleLogoClick}
          aria-label="Go to launch page or reset dashboard">
          ProductiviTea
        </button>
        <div className="dashboard-topbar-right">
          <span className="dashboard-topbar-date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
          {userName && <span className="dashboard-topbar-name">{userName}</span>}
          <button
            type="button"
            className="dashboard-topbar-inbox"
            onClick={() => setActive("Inbox")}
            title="Inbox"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="dashboard-inbox-badge">{unreadNotifications}</span>
            )}
          </button>
          <button
            type="button"
            className="dashboard-topbar-settings"
            onClick={() => setActive("Settings")}
          >
            Settings
          </button>
        </div>
      </header>
      <div className="dashboard-page">

        <aside className="dashboard-sidebar">
          <section className="dashboard-task-rail">
            <h2 className="dashboard-nav-header">My Tasks</h2>
            <button type="button" className="dashboard-add-task-btn" onClick={handleAddTask}>
              + Add task
            </button>

            <div className="dashboard-task-list">
              {tasks.length === 0 ? (
                <div className="dashboard-task-card dashboard-task-card--empty">
                  <p className="dashboard-task-card-title">No tasks yet</p>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => {
                  const badgeType = priorityKey(task?.priority);
                  return (
                    <button
                      type="button"
                      key={task.id}
                      className={`dashboard-task-card ${selectedTaskId === task.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setActive("Task");
                      }}
                    >
                      <div>
                        <p className="dashboard-task-card-title">{task?.title || 'Untitled task'}</p>
                        <p className="dashboard-task-card-due">{formatDueDate(task?.due_date)}</p>
                      </div>
                      <span className={`dashboard-priority-badge dashboard-priority-badge--${badgeType}`}>
                        {badgeType}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <h2 className="dashboard-friends-title">My Friends</h2>
            <div className="dashboard-friend-list">
              {friends.slice(0, 4).map((friend) => (
                <div key={friend.id} className="dashboard-friend-item">
                  <div className="dashboard-friend-avatar">{toInitials(friend.name)}</div>
                  <div className="dashboard-friend-body">
                    <h3>{friend.name}</h3>
                    <p>{friend.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main ref={middlePanelRef} className={`dashboard-content ${active === "Overview" ? "dashboard-content--full" : ""}`}>
          {active === "Overview" && (
            <Overview tasks={tasks} sessions={sessions} userName={userName} />
          )}

          {active === "Task" && (
            <div className="dashboard-task-detail">
              {selectedTask ? (
                <>
                  <div className="dashboard-task-header">
                    <div>
                      <h1 className="dashboard-title">{selectedTask.title || 'Untitled task'}</h1>
                      <p className="dashboard-text">
                        {formatStatusLabel(selectedTask.status)} · {selectedTask.due_date ? `Due ${formatDueDateFull(selectedTask.due_date)}` : 'No due date'}
                      </p>
                    </div>
                    {!isSessionActive ? (
                      <button
                        onClick={handleStartSession}
                        className="dashboard-session-btn dashboard-session-btn--start"
                      >
                        <Play className="w-4 h-4" />
                        Start Session
                      </button>
                    ) : (
                      <div className="dashboard-session-active">
                        <div className="dashboard-session-timer">
                          <Clock className="w-4 h-4" />
                          <span className="dashboard-session-time">{formatElapsedTime(elapsedSeconds)}</span>
                        </div>
                        <button
                          onClick={handleStopSession}
                          className="dashboard-session-btn dashboard-session-btn--stop"
                        >
                          <Square className="w-4 h-4" />
                          Stop
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="dashboard-task-stats-grid">
                    <div className="dashboard-task-stat-card">
                      <p className="dashboard-task-stat-value">{completedSubtasks}/{selectedTaskSubtasks.length}</p>
                      <p className="dashboard-task-stat-label">Subtasks</p>
                    </div>
                    <div className="dashboard-task-stat-card">
                      <p className="dashboard-task-stat-value">{formatMinutes(selectedTask.time_spent_mins)}</p>
                      <p className="dashboard-task-stat-label">Logged</p>
                    </div>
                    <div className="dashboard-task-stat-card">
                      <p className="dashboard-task-stat-value">{formatMinutes(selectedTask.estimated_mins)}</p>
                      <p className="dashboard-task-stat-label">Estimated</p>
                    </div>
                    <div className="dashboard-task-stat-card">
                      <p className="dashboard-task-stat-value">{daysLeft === null ? '-' : daysLeft}</p>
                      <p className="dashboard-task-stat-label">Days left</p>
                    </div>
                  </div>

                  <div className="dashboard-task-status-block">
                    <div className="dashboard-task-section-header">
                      <h3 className="dashboard-task-section-title">Status</h3>
                      {isSavingStatus && <span className="dashboard-inline-saving">Saving...</span>}
                    </div>
                    <div className="dashboard-status-selector">
                      <button
                        type="button"
                        className={`dashboard-status-btn ${selectedStatus === 'not_started' ? 'active active-not-started' : ''}`}
                        onClick={() => handleStatusChange('not_started')}
                        disabled={isSavingStatus}
                      >
                        Not Started
                      </button>
                      <button
                        type="button"
                        className={`dashboard-status-btn ${selectedStatus === 'in_progress' ? 'active active-in-progress' : ''}`}
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={isSavingStatus}
                      >
                        In Progress
                      </button>
                      <button
                        type="button"
                        className={`dashboard-status-btn dashboard-status-btn--completed ${selectedStatus === 'completed' ? 'active active-completed' : ''}`}
                        onClick={() => handleStatusChange('completed')}
                        disabled={isSavingStatus}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-task-due-block">
                    <div className="dashboard-task-section-header">
                      <h3 className="dashboard-task-section-title">Due Date</h3>
                      {isSavingDueDate && <span className="dashboard-inline-saving">Saving...</span>}
                    </div>
                    <div className="dashboard-due-date-controls">
                      <input
                        type="date"
                        className="dashboard-due-date-input"
                        value={dueDateDraft}
                        onChange={(e) => setDueDateDraft(e.target.value)}
                        disabled={isSavingDueDate}
                      />
                      <button
                        type="button"
                        className="dashboard-due-date-btn"
                        onClick={handleSaveDueDate}
                        disabled={isSavingDueDate}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="dashboard-due-date-btn dashboard-due-date-btn--secondary"
                        onClick={() => setDueDateDraft('')}
                        disabled={isSavingDueDate}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="dashboard-task-section-title">Tags</h3>
                    <div className="dashboard-task-meta-chips">
                      <span className={`dashboard-task-chip dashboard-task-chip--${priorityKey(selectedTask.priority)}`}>
                        {formatPriorityLabel(selectedTask.priority)}
                      </span>
                      <span className="dashboard-task-chip">{taskCategory}</span>
                    </div>
                  </div>

                  <h3 className="dashboard-task-section-title">Subtasks</h3>
                  <form onSubmit={handleAddSubtask} className="dashboard-add-subtask-form">
                    <input
                      type="text"
                      className="dashboard-add-subtask-input"
                      placeholder="Add subtask..."
                      value={newSubtaskName}
                      onChange={(e) => setNewSubtaskName(e.target.value)}
                      disabled={isAddingSubtask}
                    />
                    <button
                      type="submit"
                      className="dashboard-add-subtask-btn"
                      disabled={isAddingSubtask}
                    >
                      {isAddingSubtask ? "Adding..." : "Add"}
                    </button>
                  </form>

                  <div className="dashboard-task-detail-list">
                    {selectedTaskSubtasks.length === 0 ? (
                      <div className="dashboard-task-detail-row">No subtasks yet.</div>
                    ) : (
                      selectedTaskSubtasks.slice(0, 5).map((subtask) => (
                        <div key={subtask.id} className="dashboard-task-detail-row dashboard-task-detail-row--interactive">
                          <label className="dashboard-subtask-main">
                            <input
                              type="checkbox"
                              className="dashboard-subtask-checkbox"
                              checked={isSubtaskComplete(subtask)}
                              onChange={() => handleToggleSubtaskComplete(subtask)}
                              disabled={subtaskActionId === subtask.id}
                            />
                            <span className={`dashboard-subtask-title ${isSubtaskComplete(subtask) ? 'is-complete' : ''}`}>
                              {subtask.title || subtask.text || subtask.name || 'Untitled subtask'}
                            </span>
                          </label>
                          <button
                            type="button"
                            className="dashboard-subtask-remove-btn"
                            onClick={() => handleDeleteSubtask(subtask.id)}
                            disabled={subtaskActionId === subtask.id}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <h3 className="dashboard-task-section-title">Notes</h3>
                  <div className="dashboard-task-notes-card">
                    <div className="dashboard-task-notes-form">
                      <textarea
                        className="dashboard-task-notes-input"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Add a note..."
                        rows={2}
                      />
                      <button
                        type="button"
                        className="dashboard-task-notes-save-btn"
                        onClick={handleAddNote}
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? 'Saving...' : 'Add note'}
                      </button>
                    </div>

                    <div className="dashboard-task-notes-list">
                      {noteItems.length === 0 ? (
                        <div className="dashboard-task-notes-item dashboard-task-notes-item--empty">No notes yet.</div>
                      ) : (
                        noteItems.map((note, index) => (
                          <div key={`${index}-${note.slice(0, 20)}`} className="dashboard-task-notes-item">
                            <span>{note}</span>
                            <button
                              type="button"
                              className="dashboard-task-notes-remove-btn"
                              onClick={() => handleRemoveNote(index)}
                              disabled={isSavingNotes}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {subtaskMessage && (
                    <div className={`dashboard-subtask-toast dashboard-subtask-toast--${subtaskMessageType}`}>
                      {subtaskMessage}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h1 className="dashboard-title">Your Tasks</h1>
                  <p className="dashboard-text">Select a task from the sidebar, or click + Add task to create one.</p>
                </>
              )}
            </div>
          )}

          {active === "Settings" && (
            <Settings
              onProfileUpdated={({ displayName }) => {
                if (displayName) {
                  setUserName(displayName);
                }
              }}
            />
          )}

          {active === "Inbox" && (
            <Inbox />
          )}
        </main>
        {active === "Task" && (
          <aside className="dashboard-right-sidebar">
            <ActivityPanel
              mode="task"
              sessions={panelSessions}
              tasks={tasks}
              selectedTask={selectedTask}
              title="Time Spent"
            />
          </aside>
        )}
        {active !== "Overview" && active !== "Task" && (
          <aside className="dashboard-right-sidebar">
            <ActivityPanel activity={activity} sessions={panelSessions} tasks={tasks} title="Time Spent Activity" />
          </aside>
        )}
      </div>
    </div>
  );
}