import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Play, Square, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import ActivityPanel from "./activitypanel";
import { Overview } from "./overview";
import Inbox from "./inbox";
import AddTaskPage from "./AddTaskPage";
import useAppData from '../hooks/useAppData';
import './dashboard.css';
import { supabase } from '../lib/supabase';
import Settings from './settings';
import FriendSidebar from './FriendSidebar';

/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */

const TASK_TAG_OPTIONS = ['School', 'Work', 'Personal', 'Reading', 'Coding'];
const NUDGE_STORAGE_PREFIX = 'productivitea:nudges:';
const TASK_REMINDER_READ_PREFIX = 'productivitea:task-reminders-read:';

function getNudgeStorageKey(userId) {
  return `${NUDGE_STORAGE_PREFIX}${userId}`;
}

function readStoredNudges(userId) {
  if (typeof window === 'undefined' || !userId) return [];

  try {
    const rawValue = window.localStorage.getItem(getNudgeStorageKey(userId));
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredNudge(notification) {
  if (typeof window === 'undefined' || !notification?.receiverId) return;

  const existing = readStoredNudges(notification.receiverId);
  const next = [notification, ...existing.filter((item) => item.id !== notification.id)];
  window.localStorage.setItem(getNudgeStorageKey(notification.receiverId), JSON.stringify(next));
}

function removeStoredNudge(userId, notificationId) {
  if (typeof window === 'undefined' || !userId || !notificationId) return;

  const next = readStoredNudges(userId).filter((item) => item.id !== notificationId);
  window.localStorage.setItem(getNudgeStorageKey(userId), JSON.stringify(next));
}

function getTaskReminderStorageKey(userId) {
  return `${TASK_REMINDER_READ_PREFIX}${userId}`;
}

function readTaskReminderReadMap(userId) {
  if (typeof window === 'undefined' || !userId) return {};

  try {
    const rawValue = window.localStorage.getItem(getTaskReminderStorageKey(userId));
    const parsed = rawValue ? JSON.parse(rawValue) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function markTaskReminderRead(userId, reminderId) {
  if (typeof window === 'undefined' || !userId || !reminderId) return;

  const next = {
    ...readTaskReminderReadMap(userId),
    [reminderId]: true,
  };

  window.localStorage.setItem(getTaskReminderStorageKey(userId), JSON.stringify(next));
}

function normalizeStatusForReminders(value) {
  return String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
}

function parseDueDateParts(dueDate) {
  const rawDate = String(dueDate || '').trim();
  if (!rawDate) return null;

  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const usMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    return {
      year: Number(usMatch[3]),
      month: Number(usMatch[1]),
      day: Number(usMatch[2]),
    };
  }

  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function parseDueTimeParts(dueTime) {
  const rawTime = String(dueTime || '').trim();
  if (!rawTime) {
    // If no explicit time is set, treat the deadline as end-of-day.
    return { hours: 23, minutes: 59, seconds: 0 };
  }

  const ampmMatch = rawTime.match(/^(\d{1,2})(?::(\d{2}))(?::(\d{2}))?\s*([aApP][mM])$/);
  if (ampmMatch) {
    const hour12 = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2] || 0);
    const second = Number(ampmMatch[3] || 0);
    if (hour12 < 1 || hour12 > 12 || minute > 59 || second > 59) return null;

    let hour24 = hour12 % 12;
    if (ampmMatch[4].toUpperCase() === 'PM') hour24 += 12;
    return { hours: hour24, minutes: minute, seconds: second };
  }

  const twentyFourHourMatch = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    const seconds = Number(twentyFourHourMatch[3] || 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    return { hours, minutes, seconds };
  }

  return null;
}

function getDueAtIso(dueDate, dueTime) {
  const dateParts = parseDueDateParts(dueDate);
  const timeParts = parseDueTimeParts(dueTime);
  if (!dateParts || !timeParts) return null;

  const parsed = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hours,
    timeParts.minutes,
    timeParts.seconds,
    0
  );
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function emailLocalPart(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split('@')[0] || raw;
}

function isNetworkFetchError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('fetch');
}

function isDeliveryTriggerSchemaError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('record "prefs" has no field') || message.includes('nudge_notifications');
}

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

  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  const y = String(parts.year);
  return `${m}/${d}/${y}`;
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
function formatDateInputAsYouType(value) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  } else if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
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

function toTimeInputValue(timeValue) {
  const raw = String(timeValue || '').trim();
  if (!raw) return '';

  const match = raw.match(/^(\d{2}):(\d{2})/);
  if (!match) return '';

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';

  const date = new Date(2000, 0, 1, hour, minute, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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

function formatDueTimeLabel(timeValue) {
  const raw = String(timeValue || '').trim();
  if (!raw) return '';

  const match = raw.match(/^(\d{2}):(\d{2})/);
  if (!match) return '';

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return '';

  const date = new Date(2000, 0, 1, hours, minutes, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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

function normalizeFriendSessions(rows = []) {
  return rows.map((row) => ({
    ...row,
    started_at: row?.started_at ?? row?.start_time ?? row?.created_at ?? null,
    duration_mins: Number.parseInt(row?.duration_mins ?? row?.duration_minutes ?? row?.minutes ?? row?.duration ?? 0, 10) || 0,
  }));
}

function getFriendActivitySummary(tasks = [], sessions = []) {
  const taskRows = Array.isArray(tasks) ? tasks : [];
  const sessionRows = Array.isArray(sessions) ? sessions : [];

  const inProgressTasks = taskRows.filter((task) => {
    const status = String(task?.status || '').toLowerCase();
    return status === 'in_progress' || status === 'active';
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minutesByTaskId = new Map();

  sessionRows.forEach((session) => {
    const startedAt = session?.started_at ? new Date(session.started_at) : null;
    if (!startedAt || Number.isNaN(startedAt.getTime())) return;
    if (startedAt < today) return;

    const taskId = session?.task_id || session?.task;
    if (!taskId) return;

    const duration = Number.parseInt(session?.duration_mins ?? 0, 10);
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    minutesByTaskId.set(taskId, (minutesByTaskId.get(taskId) || 0) + safeDuration);
  });

  let activeTask = null;
  let activeMinutes = 0;

  inProgressTasks.forEach((task) => {
    const taskMinutes = minutesByTaskId.get(task.id) || 0;
    if (!activeTask || taskMinutes > activeMinutes) {
      activeTask = task;
      activeMinutes = taskMinutes;
    }
  });

  if (!activeTask && taskRows.length > 0) {
    activeTask = taskRows[0];
    activeMinutes = minutesByTaskId.get(activeTask.id) || Number.parseInt(activeTask?.time_spent_mins ?? 0, 10) || 0;
  }

  if (!activeTask) {
    return { label: 'Idle', kind: 'idle' };
  }

  return {
    label: `${activeTask.title || 'Untitled task'} · ${formatMinutes(activeMinutes)}`,
    kind: activeMinutes > 0 ? 'active' : 'idle',
  };
}

function normalizePresenceStatus(value) {
  const raw = String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (!raw) return '';
  if (raw === 'onbreak') return 'break';
  return raw;
}

function getFriendPresenceActivity(profile, fallbackActivity) {
  const statusValue = normalizePresenceStatus(
    profile?.status ?? profile?.presence_status ?? profile?.current_status
  );
  const currentTask = String(profile?.current_task ?? profile?.status_task ?? '').trim();

  if (!statusValue && currentTask) {
    return {
      label: `${currentTask} · working`,
      kind: 'active',
    };
  }

  if (statusValue === 'working') {
    return {
      label: currentTask ? `${currentTask} · working` : 'Working',
      kind: 'active',
    };
  }

  if (statusValue === 'break') {
    return { label: 'On break', kind: 'idle' };
  }

  if (statusValue === 'offline') {
    return { label: 'Offline', kind: 'idle' };
  }

  if (statusValue === 'idle') {
    return { label: 'Idle', kind: 'idle' };
  }

  return fallbackActivity;
}

function parseTaskTags(task) {
  const fromTags = task?.tags;
  const parsed = [];

  if (Array.isArray(fromTags)) {
    parsed.push(...fromTags);
  } else if (typeof fromTags === 'string') {
    if (fromTags.includes(',')) {
      parsed.push(...fromTags.split(','));
    } else {
      parsed.push(fromTags);
    }
  }

  parsed.push(task?.category, task?.subject, task?.tag);

  const normalized = parsed
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return normalized.filter((tag, index) => (
    normalized.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index
  ));
}

export default function Dashboard({ initialActive = "Task" }) {
  // With:
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get('tab') || initialActive;

  const setActive = (tab) => {
    setSearchParams({ tab });
  };
  const { user, tasks, sessions, activity, friendships, subtasks, isLoading, refresh } = useAppData();
  const [selectedTaskId, setSelectedTaskId] = useState(() => {
    return localStorage.getItem('productivitea:selected-task-id') || null;
  });
  const middlePanelRef = useRef(null);
  const descriptionTextareaRef = useRef(null);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskMessage, setSubtaskMessage] = useState("");
  const [subtaskMessageType, setSubtaskMessageType] = useState("success");
  const [subtaskActionId, setSubtaskActionId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteItems, setNoteItems] = useState([]);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('in_progress');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('none');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagDraft, setCustomTagDraft] = useState('');
  const [customTagOptions, setCustomTagOptions] = useState([]);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [dueTimeDraft, setDueTimeDraft] = useState('');
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isDeleteTaskConfirmOpen, setIsDeleteTaskConfirmOpen] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState({});
  const [friendActivity, setFriendActivity] = useState({});
  const [friendsTargetId, setFriendsTargetId] = useState(null);
  const [selectedFriendPanelData, setSelectedFriendPanelData] = useState(null);
  const [userName, setUserName] = useState("");
  const [friendActionMessage, setFriendActionMessage] = useState("");
  const [nudgeSentModal, setNudgeSentModal] = useState(null);
  const [isCancellingNudge, setIsCancellingNudge] = useState(false);
  const [nudgeReceivedModal, setNudgeReceivedModal] = useState(null);
  const [deadlineReminderModal, setDeadlineReminderModal] = useState(null);
  const [nudgeApiErrorShown, setNudgeApiErrorShown] = useState(false);
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [optimisticSessions, setOptimisticSessions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const dismissedNudgeIdsRef = useRef(new Set());
  const dismissedDeadlineReminderIdsRef = useRef(new Set());
  const localNudgeCounterRef = useRef(0);

  useEffect(() => {
    dismissedNudgeIdsRef.current = new Set();
    dismissedDeadlineReminderIdsRef.current = new Set();
    setDeadlineReminderModal(null);
  }, [user?.id]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const refreshUnreadInboxCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadNotifications(0);
      return;
    }

    const localNudges = readStoredNudges(user.id);

    const [remoteNudgesResult, pendingFriendRequestsResult, tasksResult, settingsResult] = await Promise.all([
      supabase
        .from('nudge_notifications')
        .select('id, read')
        .eq('receiver_id', user.id),
      supabase
        .from('friendships')
        .select('id')
        .eq('friend_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('tasks')
        .select('id, title, status, due_date, due_time')
        .eq('user_id', user.id),
      supabase
        .from('notification_settings')
        .select('deadline_reminders')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    let resolvedTasksResult = tasksResult;
    if (tasksResult.error?.code === '42703' && String(tasksResult.error.message || '').includes('due_time')) {
      resolvedTasksResult = await supabase
        .from('tasks')
        .select('id, title, status, due_date')
        .eq('user_id', user.id);
    }

    const remoteNudges = Array.isArray(remoteNudgesResult.data) ? remoteNudgesResult.data : [];
    const pendingFriendRequests = Array.isArray(pendingFriendRequestsResult.data) ? pendingFriendRequestsResult.data : [];
    const tasksRows = Array.isArray(resolvedTasksResult.data) ? resolvedTasksResult.data : [];
    const deadlineRemindersEnabled = settingsResult.data?.deadline_reminders !== false;

    const nudgeMap = new Map();

    remoteNudges.forEach((row) => {
      const id = String(row?.id || '').trim();
      if (!id) return;
      nudgeMap.set(id, { id, read: Boolean(row.read) });
    });

    localNudges.forEach((row) => {
      const id = String(row?.id || '').trim();
      if (!id || nudgeMap.has(id)) return;
      nudgeMap.set(id, { id, read: Boolean(row.read) });
    });

    const unreadNudgeCount = Array.from(nudgeMap.values()).filter((item) => !item.read).length;

    const taskReadMap = readTaskReminderReadMap(user.id);
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const pendingTaskReminders = deadlineRemindersEnabled
      ? tasksRows
        .map((task) => {
          const status = normalizeStatusForReminders(task?.status);
          if (status === 'completed' || status === 'done') return null;

          const dueAtIso = getDueAtIso(task?.due_date, task?.due_time);
          if (!dueAtIso) return null;

          const diffMs = new Date(dueAtIso).getTime() - now;
          if (diffMs <= 0 || diffMs > dayMs) return null;

          const reminderId = `task-24h-${task.id}-${dueAtIso}`;
          if (taskReadMap[reminderId]) return null;

          return {
            id: reminderId,
            taskId: task.id,
            title: task.title || 'Untitled assignment',
            dueAtIso,
            dueAtText: new Date(dueAtIso).toLocaleString(),
            diffMs,
            hoursLeft: Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000))),
          };
        })
        .filter(Boolean)
      : [];

    const unreadTaskReminderCount = deadlineRemindersEnabled
      ? pendingTaskReminders.length
      : 0;

    setUnreadNotifications(unreadNudgeCount + pendingFriendRequests.length + unreadTaskReminderCount);

    if (!deadlineRemindersEnabled || pendingTaskReminders.length === 0) {
      setDeadlineReminderModal(null);
      return;
    }

    const nextReminder = pendingTaskReminders
      .sort((a, b) => a.diffMs - b.diffMs)
      .find((reminder) => !dismissedDeadlineReminderIdsRef.current.has(String(reminder.id)));

    if (!nextReminder) {
      return;
    }

    setDeadlineReminderModal((prev) => {
      if (prev && prev.id === nextReminder.id) {
        return prev;
      }
      if (prev) {
        return prev;
      }
      return nextReminder;
    });
  }, [user?.id]);

  const acceptedFriendships = useMemo(() => {
    return (Array.isArray(friendships) ? friendships : []).filter((friendship) => friendship.status === 'accepted');
  }, [friendships]);

  useEffect(() => {
    async function loadFriendProfiles() {
      if (!user?.id || acceptedFriendships.length === 0) {
        setFriendProfiles({});
        return;
      }

      const friendIds = [...new Set(
        acceptedFriendships
          .map((friendship) => (friendship.user_id === user.id ? friendship.friend_id : friendship.user_id))
          .filter(Boolean)
          .map((friendId) => String(friendId))
      )];

      if (friendIds.length === 0) {
        setFriendProfiles({});
        return;
      }

      const usersResult = await supabase
        .from('users')
        .select('*')
        .in('id', friendIds);

      const profileMap = {};
      if (Array.isArray(usersResult.data)) {
        usersResult.data.forEach((row) => {
          if (row?.id) profileMap[row.id] = row;
        });
      }

      setFriendProfiles(profileMap);
    }

    loadFriendProfiles();

    const intervalId = setInterval(loadFriendProfiles, 5000);
    return () => clearInterval(intervalId);
  }, [acceptedFriendships, user?.id]);

  useEffect(() => {
    async function loadFriendActivity() {
      if (!user?.id || acceptedFriendships.length === 0) {
        setFriendActivity({});
        return;
      }

      const friendIds = [...new Set(
        acceptedFriendships
          .map((friendship) => (friendship.user_id === user.id ? friendship.friend_id : friendship.user_id))
          .filter(Boolean)
          .map((friendId) => String(friendId))
      )];

      const entries = await Promise.all(friendIds.map(async (friendId) => {
        const [tasksResult, studySessionsResult] = await Promise.all([
          supabase.from('tasks').select('*').eq('user_id', friendId).order('created_at', { ascending: false }),
          supabase.from('study_sessions').select('*').eq('user_id', friendId).order('created_at', { ascending: false }),
        ]);

        let sessionRows = Array.isArray(studySessionsResult.data) ? studySessionsResult.data : [];
        if ((studySessionsResult.error || sessionRows.length === 0)) {
          const fallbackSessions = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', friendId)
            .order('created_at', { ascending: false });

          if (!fallbackSessions.error) {
            sessionRows = Array.isArray(fallbackSessions.data) ? fallbackSessions.data : [];
          }
        }

        const summary = getFriendActivitySummary(
          Array.isArray(tasksResult.data) ? tasksResult.data : [],
          normalizeFriendSessions(sessionRows)
        );

        return [friendId, summary];
      }));

      setFriendActivity(Object.fromEntries(entries));
    }

    loadFriendActivity();
  }, [acceptedFriendships, user?.id]);

  useEffect(() => {
    if (!friendActionMessage) return;
    const timeoutId = setTimeout(() => setFriendActionMessage(''), 2500);
    return () => clearTimeout(timeoutId);
  }, [friendActionMessage]);

  useEffect(() => {
    async function loadUser() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) return;
      setUserName(authData.user.user_metadata?.full_name || emailLocalPart(authData.user.email) || '');
    }
    loadUser();
  }, []);

  const handleMiniNudge = async (friendName, friendId = null) => {
    const targetId = String(friendId || '').trim();
    if (!user?.id || !targetId) return;

    localNudgeCounterRef.current += 1;
    const localNotificationId = `local-${user.id}-${targetId}-${localNudgeCounterRef.current}`;
    const supabaseNotificationId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : null;
    try {
      const insertPayload = {
        sender_id: user.id,
        receiver_id: targetId,
        message: `${userName || 'A friend'} nudged you to get back to studying.`,
      };

      if (supabaseNotificationId) {
        insertPayload.id = supabaseNotificationId;
      }

      const { error } = await supabase
        .from('nudge_notifications')
        .insert(insertPayload);

      if (error) {
        if (error.code === '42P01') {
          setFriendActionMessage('Nudges are not set up yet. Run the nudge table SQL in Supabase.');
          return;
        }

        if (error.code === '42501') {
          setFriendActionMessage('Nudge permission blocked by RLS policy. Please update nudge policies.');
          return;
        }

        if (isDeliveryTriggerSchemaError(error)) {
          setFriendActionMessage('External notification trigger is failing. Run supabase/in_app_nudges_only.sql or updated notifications_delivery.sql.');
          return;
        }

        console.error('Nudge send error:', error);
        setFriendActionMessage(error.message || 'Could not send nudge right now.');
        return;
      }

      const localNotification = {
        id: localNotificationId,
        senderId: user.id,
        receiverId: targetId,
        fromName: userName || 'A friend',
        message: `${userName || 'A friend'} nudged you to get back to studying.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'nudge',
        source: 'local',
      };

      writeStoredNudge(localNotification);
      setNudgeSentModal({
        friendName,
        targetId,
        localNotificationId,
        supabaseNotificationId,
      });
      setFriendActionMessage(`Nudge sent to ${friendName}!`);
      setNudgeApiErrorShown(false);
    } catch (error) {
      console.error('Nudge send error:', error);
      if (isNetworkFetchError(error)) {
        setFriendActionMessage('Could not reach notification API. Check your internet and Supabase connection.');
      } else {
        setFriendActionMessage('Could not send nudge right now.');
      }
    }
  };

  const handleCancelSentNudge = async () => {
    if (!nudgeSentModal || isCancellingNudge) return;

    setIsCancellingNudge(true);

    removeStoredNudge(nudgeSentModal.targetId, nudgeSentModal.localNotificationId);

    if (nudgeSentModal.supabaseNotificationId) {
      const { error } = await supabase
        .from('nudge_notifications')
        .delete()
        .eq('id', nudgeSentModal.supabaseNotificationId)
        .eq('sender_id', user?.id || '')
        .eq('receiver_id', nudgeSentModal.targetId)
        .eq('read', false);

      if (error && error.code !== '42P01') {
        console.error('Nudge cancel error:', error);
      }
    }

    setNudgeSentModal(null);
    setFriendActionMessage(`Nudge to ${nudgeSentModal.friendName} was canceled.`);
    setIsCancellingNudge(false);
  };

  const handleOpenFriendCard = (friend) => {
    const targetId = String(friend?.userId || friend?.id || '').trim();
    if (!targetId) return;
    setFriendsTargetId(targetId);
    setActive('Friends');
  };

  const handleSelectedFriendChange = useCallback((nextData) => {
    setSelectedFriendPanelData(nextData || null);
  }, []);

  const closeReceivedNudgeModal = async () => {
    if (nudgeReceivedModal?.id) {
      dismissedNudgeIdsRef.current.add(String(nudgeReceivedModal.id));

      // Mark as read in localStorage
      const stored = readStoredNudges(user?.id);
      const updated = stored.map((item) =>
        String(item.id) === String(nudgeReceivedModal.id) ? { ...item, read: true } : item
      );
      if (user?.id) {
        window.localStorage.setItem(getNudgeStorageKey(user.id), JSON.stringify(updated));
      }

      // Mark as read in Supabase
      if (nudgeReceivedModal.source === 'supabase') {
        await supabase
          .from('nudge_notifications')
          .update({ read: true })
          .eq('id', nudgeReceivedModal.id)
          .eq('receiver_id', user?.id || '');
      }
    }

    setNudgeReceivedModal(null);
    refreshUnreadInboxCount();
  };

  const closeDeadlineReminderModal = ({ markRead = false, openInbox = false } = {}) => {
    if (!deadlineReminderModal?.id) {
      return;
    }

    dismissedDeadlineReminderIdsRef.current.add(String(deadlineReminderModal.id));

    if (markRead && user?.id) {
      markTaskReminderRead(user.id, deadlineReminderModal.id);
    }

    setDeadlineReminderModal(null);

    if (openInbox) {
      setActive('Inbox');
    }

    refreshUnreadInboxCount();
  };

  const friends = acceptedFriendships.map((friendship) => {
    const otherId = friendship.user_id === user?.id ? friendship.friend_id : friendship.user_id;
    const profile = friendProfiles[otherId] || {};
    const name = profile.full_name || profile.username || emailLocalPart(profile.email) || 'Friend';
    const fallbackStatus = friendActivity[String(otherId)] || { label: 'Loading...', kind: 'loading' };
    const friendStatus = getFriendPresenceActivity(profile, fallbackStatus);

    return {
      friendshipId: friendship.id,
      id: otherId,
      userId: otherId,
      name,
      avatarUrl: profile.avatar_url || '',
      status: friendship.status || 'accepted',
      activity: friendStatus,
      ...profile,
    };
  });

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
    if (!user?.id) return undefined;

    let cancelled = false;

    const fetchNudges = async () => {
      const localUnread = readStoredNudges(user.id).filter((item) => !item.read);
      const dismissed = dismissedNudgeIdsRef.current;

      if (cancelled) return;

      const localLatest = localUnread.find((item) => !dismissed.has(String(item?.id || '')));

      if (localLatest) {
        if (!nudgeReceivedModal) {
          setNudgeReceivedModal({
            id: localLatest.id,
            fromName: localLatest.fromName || 'A friend',
            message: localLatest.message || `${localLatest.fromName || 'A friend'} nudged you to get back to studying.`,
            source: 'local',
          });
        }

        return;
      }

      let rows = [];
      let error = null;

      try {
        const result = await supabase
          .from('nudge_notifications')
          .select('id, sender_id, message, created_at, read')
          .eq('receiver_id', user.id)
          .eq('read', false)
          .order('created_at', { ascending: false });

        rows = Array.isArray(result.data) ? result.data : [];
        error = result.error || null;
      } catch (fetchError) {
        error = fetchError;
      }

      if (cancelled) return;

      if (error) {
        if (error.code !== '42P01' && !isNetworkFetchError(error)) {
          console.error('Nudge fetch error:', error);
        }

        if (!nudgeApiErrorShown) {
          setFriendActionMessage('Could not fetch nudge API right now. Notifications may be delayed.');
          setNudgeApiErrorShown(true);
        }
        return;
      }

      const unread = Array.isArray(rows) ? rows : [];
      if (nudgeApiErrorShown) {
        setNudgeApiErrorShown(false);
      }

      if (unread.length === 0 || nudgeReceivedModal) {
        return;
      }

      const latest = unread.find((item) => !dismissed.has(String(item?.id || '')));
      if (!latest) {
        return;
      }

      let fromName = 'A friend';

      if (latest?.sender_id) {
        const userResult = await supabase
          .from('users')
          .select('id, username, email')
          .eq('id', latest.sender_id)
          .maybeSingle();

        const userRow = userResult.data || {};
        fromName = userRow.username || emailLocalPart(userRow.email) || fromName;
      }

      setNudgeReceivedModal({
        id: latest.id,
        fromName,
        message: latest.message || `${fromName} nudged you to get back to studying.`,
        source: 'supabase',
      });
    };

    fetchNudges();
    const intervalId = setInterval(fetchNudges, 1000);
    const handleStorage = (event) => {
      if (event.key === getNudgeStorageKey(user.id)) {
        fetchNudges();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id, nudgeReceivedModal, nudgeApiErrorShown]);

  useEffect(() => {
    if (!user?.id) return undefined;

    refreshUnreadInboxCount();

    const intervalId = setInterval(refreshUnreadInboxCount, 5000);
    const handleStorage = (event) => {
      if (event.key === getNudgeStorageKey(user.id) || event.key === getTaskReminderStorageKey(user.id)) {
        refreshUnreadInboxCount();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id, refreshUnreadInboxCount]);

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

  useEffect(() => {
    if (selectedTaskId) {
      localStorage.setItem('productivitea:selected-task-id', selectedTaskId);
    } else {
      localStorage.removeItem('productivitea:selected-task-id');
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (active !== 'AddTask') {
      localStorage.removeItem('productivitea:addtask-draft');
    }
  }, [active]);
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
  const taskTags = useMemo(() => parseTaskTags(selectedTask), [selectedTask]);
  const taskDescription = String(selectedTask?.description || '').trim();
  const rawTaskNotes = selectedTask?.notes ?? "";
  const editableTagOptions = useMemo(() => {
    const base = [...TASK_TAG_OPTIONS, ...customTagOptions];
    taskTags.forEach((tag) => {
      if (!base.some((value) => value.toLowerCase() === tag.toLowerCase())) {
        base.push(tag);
      }
    });
    selectedTags.forEach((tag) => {
      if (!base.some((value) => value.toLowerCase() === tag.toLowerCase())) {
        base.push(tag);
      }
    });
    return base.filter((tag, index) => (
      base.findIndex((value) => value.toLowerCase() === tag.toLowerCase()) === index
    ));
  }, [customTagOptions, selectedTags, taskTags]);

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
    setSelectedPriority(priorityKey(selectedTask?.priority));
    setSelectedTags(taskTags);
    setCustomTagOptions((prev) => {
      const additions = taskTags.filter((tag) => !TASK_TAG_OPTIONS.includes(tag));
      if (additions.length === 0) return prev;

      const next = [...prev];
      additions.forEach((tag) => {
        if (!next.some((value) => value.toLowerCase() === tag.toLowerCase())) {
          next.push(tag);
        }
      });
      return next;
    });
  }, [selectedTask?.id, selectedTask?.priority, taskTags]);

  useEffect(() => {
    setDueDateDraft(toDateInputValue(selectedTask?.due_date));
  }, [selectedTask?.id, selectedTask?.due_date]);

  useEffect(() => {
    setDueTimeDraft(toTimeInputValue(selectedTask?.due_time));
  }, [selectedTask?.id, selectedTask?.due_time]);

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
    setDescriptionDraft(taskDescription);
  }, [selectedTask?.id, taskDescription]);

  useEffect(() => {
    if (!subtaskMessage) return;

    const timeoutId = setTimeout(() => {
      setSubtaskMessage("");
    }, 2200);

    return () => clearTimeout(timeoutId);
  }, [subtaskMessage]);

  useEffect(() => {
    const el = descriptionTextareaRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [descriptionDraft]);

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

    const nextDueDate = dueDateDraft ? parseDateInput(dueDateDraft) : null;
    if (dueDateDraft && !nextDueDate) {
      setSubtaskMessageType('error');
      setSubtaskMessage('Invalid date format. Use MM/DD/YYYY.');
      setIsSavingDueDate(false);
      return;
    }

    const nextDueTime = dueTimeDraft ? parseTimeInput(dueTimeDraft) : null;
    if (dueTimeDraft && !nextDueTime) {
      setSubtaskMessageType('error');
      setSubtaskMessage('Invalid time format. Use HH:MM AM/PM.');
      setIsSavingDueDate(false);
      return;
    }

    const payload = {
      due_date: nextDueDate,
      due_time: nextDueTime,
    };

    let { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', selectedTask.id);

    // Keep date editing working even if due_time column has not been added yet.
    if (error?.code === '42703' && String(error.message || '').includes('due_time')) {
      const fallback = await supabase
        .from('tasks')
        .update({ due_date: nextDueDate })
        .eq('id', selectedTask.id);
      error = fallback.error || null;

      if (!error) {
        await refresh();
        setSubtaskMessageType('success');
        setSubtaskMessage('Due date updated. Add a due_time column in tasks to save deadline time.');
        setIsSavingDueDate(false);
        return;
      }
    }

    if (!error) {
      await refresh();
      setSubtaskMessageType('success');
      if (nextDueDate || nextDueTime) {
        setSubtaskMessage('Deadline updated.');
      } else {
        setSubtaskMessage('Deadline cleared.');
      }
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(error.message || 'Could not update deadline.');
    }

    setIsSavingDueDate(false);
  };

  const handlePriorityChange = async (nextPriority) => {
    if (!selectedTask?.id || isSavingMeta) return;

    setIsSavingMeta(true);
    setSubtaskMessage('');

    const { error } = await supabase
      .from('tasks')
      .update({ priority: nextPriority })
      .eq('id', selectedTask.id);

    if (!error) {
      setSelectedPriority(nextPriority);
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage('Priority updated.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(error.message || 'Could not update priority.');
    }

    setIsSavingMeta(false);
  };

  const handleTagChange = async (nextTags) => {
    if (!selectedTask?.id || isSavingMeta) return;

    setIsSavingMeta(true);
    setSubtaskMessage('');

    const isMissingColumnError = (error) => {
      const code = String(error?.code || '');
      const message = String(error?.message || '').toLowerCase();
      return (
        code === '42703' ||
        message.includes('could not find the') && message.includes('column') ||
        message.includes('schema cache') && message.includes('column')
      );
    };

    const columnFallbacks = ['tag', 'tags', 'category', 'subject'];
    let result = { error: { message: 'No compatible tag column found.' } };
    let missingColumnAttempts = 0;

    for (const columnName of columnFallbacks) {
      const valueForColumn = columnName === 'tags'
        ? nextTags
        : (nextTags[0] || null);
      result = await supabase
        .from('tasks')
        .update({ [columnName]: valueForColumn })
        .eq('id', selectedTask.id);

      if (!result.error) {
        break;
      }

      if (!isMissingColumnError(result.error)) {
        break;
      }

      missingColumnAttempts += 1;
    }

    if (!result.error) {
      setSelectedTags(nextTags);
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage(nextTags.length > 0 ? 'Tags updated.' : 'Tags cleared.');
    } else {
      setSubtaskMessageType('error');
      if (missingColumnAttempts >= columnFallbacks.length) {
        setSubtaskMessage('Tag updates are not configured in your database yet. Add a tag/tags/category column to tasks.');
      } else {
        setSubtaskMessage(result.error.message || 'Could not update tag.');
      }
    }

    setIsSavingMeta(false);
  };

  const handleAddCustomTag = async () => {
    const cleaned = customTagDraft.trim();
    if (!cleaned || isSavingMeta || !selectedTask?.id) return;

    const existingMatch = editableTagOptions.find(
      (tag) => tag.toLowerCase() === cleaned.toLowerCase()
    );
    const nextTag = existingMatch || cleaned;

    if (!existingMatch) {
      setCustomTagOptions((prev) => [...prev, cleaned]);
    }

    if (!selectedTags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      await handleTagChange([...selectedTags, nextTag]);
    }
    setCustomTagDraft('');
  };

  const handleRemoveCustomTag = (tagToRemove) => {
    if (!tagToRemove) return;
    setCustomTagOptions((prev) => prev.filter((tag) => tag !== tagToRemove));
    if (selectedTags.some((tag) => tag.toLowerCase() === tagToRemove.toLowerCase())) {
      handleTagChange(
        selectedTags.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase())
      );
    }
  };

  const handleTagToggle = (tag) => {
    const isSelected = selectedTags.some((selected) => selected.toLowerCase() === tag.toLowerCase());
    if (isSelected) {
      handleTagChange(selectedTags.filter((selected) => selected.toLowerCase() !== tag.toLowerCase()));
      return;
    }
    handleTagChange([...selectedTags, tag]);
  };

  const persistNotes = async (nextNotes) => {
    if (!selectedTask?.id) return { error: { message: 'No selected task.' } };

    const payload = serializeTaskNotes(nextNotes);
    const result = await supabase
      .from('tasks')
      .update({ notes: payload })
      .eq('id', selectedTask.id);

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

  const handleSaveDescription = async () => {
    if (!selectedTask?.id) return;

    setIsSavingDescription(true);
    setSubtaskMessage('');

    const nextDescription = descriptionDraft.trim() || null;
    const { error } = await supabase
      .from('tasks')
      .update({ description: nextDescription })
      .eq('id', selectedTask.id);

    if (!error) {
      await refresh();
      setSubtaskMessageType('success');
      setSubtaskMessage(nextDescription ? 'Description updated.' : 'Description cleared.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(error.message || 'Could not update description.');
    }

    setIsSavingDescription(false);
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

  const confirmDeleteTask = () => {
    if (!selectedTask?.id || isDeletingTask) return;
    setIsDeleteTaskConfirmOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask?.id || isDeletingTask) return;

    setIsDeletingTask(true);
    setIsDeleteTaskConfirmOpen(false);
    setSubtaskMessage('');

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', selectedTask.id);

    if (!error) {
      setSelectedTaskId(null);
      await refresh();
      setActive('Task');
      setSubtaskMessageType('success');
      setSubtaskMessage('Task deleted.');
    } else {
      setSubtaskMessageType('error');
      setSubtaskMessage(error.message || 'Could not delete task.');
    }

    setIsDeletingTask(false);
  };

  const handleLogoClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    user ? setActive("Overview") : navigate('/');
  };

  const handleAddTask = () => {
    setActive("AddTask");
  };

  const handleTaskCreated = async (taskId) => {
    await refresh();
    if (taskId) {
      setSelectedTaskId(taskId);
    }
    setActive('Task');
    setSubtaskMessageType('success');
    setSubtaskMessage('Task added.');
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
          <span className="dashboard-home-text">ProductiviTea</span>
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

        <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
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
                  const rawStatus = String(task?.status || 'in_progress').toLowerCase();
                  const statusType = rawStatus.includes('not') && rawStatus.includes('start')
                    ? 'not-started'
                    : ((rawStatus === 'completed' || rawStatus === 'done') ? 'completed' : 'in-progress');
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
                      <div className="dashboard-task-card-badges">
                        <span className={`dashboard-task-status-badge dashboard-task-status-badge--${statusType}`}>
                          {formatStatusLabel(task?.status)}
                        </span>
                        <span className={`dashboard-priority-badge dashboard-priority-badge--${badgeType}`}>
                          {badgeType}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              className="dashboard-add-task-btn"
              onClick={() => {
                setFriendsTargetId(null);
                localStorage.removeItem('productivitea:selected-friend');
                setActive("Friends");
              }}
              style={{ marginTop: '16px' }}
            >
              + Find Friends
            </button>

            <h2 className="dashboard-nav-header">My Friends</h2>
            {friendActionMessage && (
              <div className="dashboard-friend-toast">{friendActionMessage}</div>
            )}
            <div className="dashboard-friend-list">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="dashboard-friend-item dashboard-friend-item--clickable"
                  onClick={() => handleOpenFriendCard(friend)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleOpenFriendCard(friend);
                    }
                  }}
                >
                  <div className="dashboard-friend-avatar">{toInitials(friend.name)}</div>
                  <div className="dashboard-friend-body">
                    <h3>{friend.name}</h3>
                    <p>{friend.activity?.label || 'Idle'}</p>
                  </div>
                  <button
                    type="button"
                    className="dashboard-nudge-btn"
                    onClick={() => handleMiniNudge(friend.name, friend.userId || friend.id)}
                    title={`Nudge ${friend.name}`}
                  >
                    Nudge
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <button
          type="button"
          className={`dashboard-pull-tab ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={() => setSidebarCollapsed(prev => !prev)}
          title="toggle sidebar"
        >
          <svg viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="8" height="8">
            <polyline points="5,1 2,4 5,7" />
          </svg>
        </button>

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
                        {formatStatusLabel(selectedTask.status)} · {selectedTask.due_date ? `Due ${formatDueDateFull(selectedTask.due_date)}` : 'No due date'}{selectedTask.due_time ? ` at ${formatDueTimeLabel(selectedTask.due_time)}` : ''}
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
                      <h3 className="dashboard-task-section-title">Deadline</h3>
                      {isSavingDueDate && <span className="dashboard-inline-saving">Saving...</span>}
                    </div>
                    <div className="dashboard-due-date-controls">
                      <input
                        type="text"
                        className="dashboard-due-date-input"
                        placeholder="MM/DD/YYYY"
                        value={dueDateDraft}
                        onChange={(e) => setDueDateDraft(formatDateInputAsYouType(e.target.value))}
                        onBlur={(e) => setDueDateDraft(normalizeDateInput(e.target.value))}
                        disabled={isSavingDueDate}
                      />
                      <input
                        type="text"
                        className="dashboard-due-date-input dashboard-due-time-input"
                        placeholder="HH:MM AM/PM"
                        inputMode="text"
                        value={dueTimeDraft}
                        onChange={(e) => setDueTimeDraft(e.target.value)}
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
                        onClick={() => {
                          setDueDateDraft('');
                          setDueTimeDraft('');
                        }}
                        disabled={isSavingDueDate}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-task-status-block">
                    <div className="dashboard-task-section-header">
                      <h3 className="dashboard-task-section-title">Priority</h3>
                      {isSavingMeta && <span className="dashboard-inline-saving">Saving...</span>}
                    </div>
                    <div className="dashboard-task-meta-chips">
                      {['high', 'medium', 'low'].map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          className={`dashboard-task-meta-btn dashboard-task-chip dashboard-task-chip--${priority} ${selectedPriority === priority ? 'active' : ''}`}
                          onClick={() => handlePriorityChange(priority)}
                          disabled={isSavingMeta}
                        >
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-task-status-block">
                    <h3 className="dashboard-task-section-title">Tags</h3>
                    <div className="dashboard-task-meta-chips">
                      {editableTagOptions.map((tag) => {
                        const isCustomTag = customTagOptions.some(
                          (custom) => custom.toLowerCase() === tag.toLowerCase()
                        );
                        const isSelected = selectedTags.some(
                          (selected) => selected.toLowerCase() === tag.toLowerCase()
                        );

                        if (isCustomTag) {
                          return (
                            <button
                              key={tag}
                              type="button"
                              className={`dashboard-task-meta-btn dashboard-task-chip dashboard-task-chip--custom ${isSelected ? 'active' : ''}`}
                              onClick={() => handleTagToggle(tag)}
                              disabled={isSavingMeta}
                            >
                              <span>{tag}</span>
                              <span
                                className="dashboard-task-chip-close"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleRemoveCustomTag(tag);
                                }}
                                role="button"
                                aria-label={`Remove ${tag} tag`}
                                title="Remove custom tag"
                              >
                                x
                              </span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`dashboard-task-meta-btn dashboard-task-chip ${isSelected ? 'active' : ''}`}
                            onClick={() => handleTagToggle(tag)}
                            disabled={isSavingMeta}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                    <div className="dashboard-custom-tag-row">
                      <input
                        type="text"
                        className="dashboard-custom-tag-input"
                        placeholder="Create custom tag"
                        value={customTagDraft}
                        onChange={(e) => setCustomTagDraft(e.target.value)}
                        disabled={isSavingMeta}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomTag();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="dashboard-custom-tag-btn"
                        onClick={handleAddCustomTag}
                        disabled={isSavingMeta || !customTagDraft.trim()}
                      >
                        Add tag
                      </button>
                    </div>
                  </div>

                  <h3 className="dashboard-task-section-title">Description</h3>
                  <div className="dashboard-task-description-card">
                    <textarea
                      ref={descriptionTextareaRef}
                      className="dashboard-task-description-input"
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      placeholder="Add a description..."
                      style={{ overflow: 'hidden', resize: 'none' }}
                    />
                    <button
                      type="button"
                      className="dashboard-task-description-save-btn"
                      onClick={handleSaveDescription}
                      disabled={isSavingDescription}
                    >
                      {isSavingDescription ? 'Saving...' : 'Save description'}
                    </button>
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
                      selectedTaskSubtasks.map((subtask) => (
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

                  <div className="dashboard-task-delete-section">
                    <button
                      type="button"
                      className="dashboard-task-delete-btn"
                      onClick={confirmDeleteTask}
                      disabled={isDeletingTask}
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeletingTask ? 'Deleting...' : 'Delete task'}
                    </button>
                  </div>

                  {isDeleteTaskConfirmOpen && (
                    <div className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirm task deletion">
                      <div className="dashboard-confirm-modal">
                        <h4 className="dashboard-confirm-title">Delete task?</h4>
                        <p className="dashboard-confirm-text">Are you sure you want to delete this task? This cannot be undone.</p>
                        <div className="dashboard-confirm-actions">
                          <button
                            type="button"
                            className="dashboard-confirm-btn dashboard-confirm-btn--secondary"
                            onClick={() => setIsDeleteTaskConfirmOpen(false)}
                            disabled={isDeletingTask}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="dashboard-confirm-btn dashboard-confirm-btn--danger"
                            onClick={handleDeleteTask}
                            disabled={isDeletingTask}
                          >
                            {isDeletingTask ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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

          {active === "Friends" && (
            <FriendSidebar
              key={friendsTargetId ?? 'discover'}
              initialSelectedFriendId={friendsTargetId}
              onSelectedFriendChange={handleSelectedFriendChange}
            />
          )}

          {active === "AddTask" && (
            <AddTaskPage
              userId={user?.id}
              onRefresh={refresh}
              onTaskCreated={handleTaskCreated}
            />
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
        {active === "Friends" && selectedFriendPanelData?.friend && (
          <aside className="dashboard-right-sidebar">
            <ActivityPanel
              mode="friend"
              friendName={selectedFriendPanelData.friend?.name}
              friendId={selectedFriendPanelData.friend?.userId || selectedFriendPanelData.friend?.id}
              tasks={selectedFriendPanelData.tasks || []}
              sessions={selectedFriendPanelData.sessions || []}
              onNudge={handleMiniNudge}
            />
          </aside>
        )}
        {active !== "Overview" && active !== "Task" && active !== "Friends" && (
          <aside className="dashboard-right-sidebar">
            <ActivityPanel activity={activity} sessions={panelSessions} tasks={tasks} title="Time Spent Activity" />
          </aside>
        )}

        {nudgeSentModal && (
          <div className="dashboard-nudge-modal-overlay" onClick={() => setNudgeSentModal(null)}>
            <div className="dashboard-nudge-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard-nudge-modal-content">
                <h2 className="dashboard-nudge-modal-title">Nudge Sent</h2>
                <p className="dashboard-nudge-modal-message">
                  You sent a nudge to <strong>{nudgeSentModal.friendName}</strong>.
                </p>
                <p className="dashboard-nudge-modal-subtitle">They will get a popup notification unless you cancel it.</p>
              </div>
              <div className="dashboard-nudge-modal-actions">
                <button
                  type="button"
                  className="dashboard-nudge-modal-cancel"
                  onClick={handleCancelSentNudge}
                  disabled={isCancellingNudge}
                >
                  {isCancellingNudge ? 'Canceling...' : 'Cancel nudge'}
                </button>
                <button
                  type="button"
                  className="dashboard-nudge-modal-close"
                  onClick={() => setNudgeSentModal(null)}
                >
                  Keep sent
                </button>
              </div>
            </div>
          </div>
        )}

        {nudgeReceivedModal && (
          <div className="dashboard-nudge-modal-overlay" onClick={closeReceivedNudgeModal}>
            <div className="dashboard-nudge-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard-nudge-modal-content">
                <h2 className="dashboard-nudge-modal-title">You got nudged</h2>
                <p className="dashboard-nudge-modal-message">
                  <strong>{nudgeReceivedModal.fromName}</strong> sent you a nudge.
                </p>
                <p className="dashboard-nudge-modal-subtitle">Time to jump back into your tasks.</p>
              </div>
              <button
                type="button"
                className="dashboard-nudge-modal-close"
                onClick={closeReceivedNudgeModal}
              >
                Let's go
              </button>
            </div>
          </div>
        )}

        {deadlineReminderModal && !nudgeReceivedModal && !nudgeSentModal && (
          <div className="dashboard-nudge-modal-overlay" onClick={() => closeDeadlineReminderModal()}>
            <div className="dashboard-nudge-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dashboard-nudge-modal-content">
                <h2 className="dashboard-nudge-modal-title">Deadline soon</h2>
                <p className="dashboard-nudge-modal-message">
                  <strong>{deadlineReminderModal.title}</strong> is due in about {deadlineReminderModal.hoursLeft}h.
                </p>
                <p className="dashboard-nudge-modal-subtitle">Due {deadlineReminderModal.dueAtText}</p>
              </div>
              <div className="dashboard-nudge-modal-actions">
                <button
                  type="button"
                  className="dashboard-nudge-modal-cancel"
                  onClick={() => closeDeadlineReminderModal({ markRead: true })}
                >
                  Mark as read
                </button>
                <button
                  type="button"
                  className="dashboard-nudge-modal-close"
                  onClick={() => closeDeadlineReminderModal({ openInbox: true })}
                >
                  Open inbox
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}