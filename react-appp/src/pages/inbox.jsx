import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, UserPlus, CheckCircle, Zap, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './inbox.css';

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

function markStoredNudgeRead(userId, notificationId) {
    if (typeof window === 'undefined' || !userId || !notificationId) return;

    const next = readStoredNudges(userId).map((item) => (
        item.id === notificationId ? { ...item, read: true } : item
    ));
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

function normalizeStatus(value) {
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

function toInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function displayName(user) {
    const emailHandle = user?.email ? String(user.email).split('@')[0] : '';
    return user?.full_name || user?.username || user?.name || emailHandle || 'Unknown';
}

export default function Inbox() {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);

    const loadInboxNotifications = useCallback(async () => {
        setIsLoading(true);

        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user || null;
        if (!user) {
            setCurrentUserId(null);
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        setCurrentUserId(user.id);

        const [friendRequestsResult, supabaseNudgesResult, tasksResult, settingsResult] = await Promise.all([
            supabase
                .from('friendships')
                .select('*')
                .eq('friend_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false }),
            supabase
                .from('nudge_notifications')
                .select('id, sender_id, receiver_id, message, created_at, read')
                .eq('receiver_id', user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('tasks')
                .select('id, title, status, due_date, due_time, created_at')
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
                .select('id, title, status, due_date, created_at')
                .eq('user_id', user.id);
            }

        const [friendshipsData, friendshipsError] = [friendRequestsResult.data, friendRequestsResult.error];
        const [supabaseNudgesData, supabaseNudgesError] = [supabaseNudgesResult.data, supabaseNudgesResult.error];
            const [tasksData, tasksError] = [resolvedTasksResult.data, resolvedTasksResult.error];
        const [settingsData] = [settingsResult.data];

        if (friendshipsError) {
            setActionMessage(friendshipsError.message || 'Could not load friend requests.');
            setNotifications([]);
            setIsLoading(false);
            return;
        }

        if (supabaseNudgesError && supabaseNudgesError.code !== '42P01') {
            setActionMessage(supabaseNudgesError.message || 'Could not load nudges.');
        }

        if (tasksError && tasksError.code !== '42P01') {
            setActionMessage(tasksError.message || 'Could not load task reminders.');
        }

        const localNudges = readStoredNudges(user.id);

        const pendingRequests = Array.isArray(friendshipsData) ? friendshipsData : [];
        const remoteNudges = Array.isArray(supabaseNudgesData) ? supabaseNudgesData : [];
        const nudgeMap = new Map();

        remoteNudges.forEach((row) => {
            if (!row?.id) return;
            nudgeMap.set(String(row.id), { ...row, source: 'supabase' });
        });

        localNudges.forEach((row) => {
            if (!row?.id) return;
            const key = String(row.id);
            if (!nudgeMap.has(key)) {
                nudgeMap.set(key, { ...row, source: 'local' });
            }
        });

        const nudgeRows = Array.from(nudgeMap.values());

        const senderIds = [
            ...pendingRequests.map((request) => request.user_id).filter(Boolean),
            ...nudgeRows.map((row) => row.sender_id || row.senderId).filter(Boolean),
        ];

        let profileMap = {};

        if (senderIds.length > 0) {
            const usersResult = await supabase
                .from('users')
                .select('id, email, username, avatar_url, created_at')
                .in('id', senderIds);
            const userRows = Array.isArray(usersResult.data) ? usersResult.data : [];

            userRows.forEach((row) => {
                profileMap[row.id] = row;
            });
        }

        const friendRequestNotifications = pendingRequests.map((request) => {
            const profile = profileMap[request.user_id] || {};
            const name = displayName(profile);
            return {
                id: request.id,
                friendshipId: request.id,
                type: 'friend_request',
                actionable: true,
                read: false,
                from: name,
                fromInitials: toInitials(name),
                message: 'sent you a friend request.',
                timestamp: request.created_at ? new Date(request.created_at).toLocaleString() : 'Just now',
                createdAt: request.created_at || new Date().toISOString(),
                senderId: request.user_id,
                senderProfile: profile,
            };
        });

        const nudgeNotifications = nudgeRows.map((row) => {
            const senderId = row.sender_id || row.senderId;
            const profile = profileMap[senderId] || {};
            const name = displayName(profile);
            return {
                id: row.id,
                type: 'nudge',
                actionable: false,
                read: Boolean(row.read),
                from: name,
                fromInitials: toInitials(name),
                message: row.message || 'nudged you.',
                timestamp: (row.created_at || row.timestamp)
                    ? new Date(row.created_at || row.timestamp).toLocaleString()
                    : 'Just now',
                createdAt: row.created_at || row.timestamp || new Date().toISOString(),
                senderId,
                senderProfile: profile,
                source: row.source || 'supabase',
            };
        });

        const deadlineRemindersEnabled = settingsData?.deadline_reminders !== false;
        const taskReadMap = readTaskReminderReadMap(user.id);
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        const taskNotifications = deadlineRemindersEnabled
            ? (Array.isArray(tasksData) ? tasksData : [])
                .map((task) => {
                    const status = normalizeStatus(task?.status);
                    if (status === 'completed' || status === 'done') return null;

                    const dueAtIso = getDueAtIso(task?.due_date, task?.due_time);
                    if (!dueAtIso) return null;

                    const dueAtMs = new Date(dueAtIso).getTime();
                    const diffMs = dueAtMs - now;
                    if (diffMs <= 0 || diffMs > dayMs) return null;

                    const reminderId = `task-24h-${task.id}-${dueAtIso}`;
                    const hoursLeft = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));

                    return {
                        id: reminderId,
                        type: 'task_notification',
                        actionable: false,
                        read: Boolean(taskReadMap[reminderId]),
                        from: 'Assignment Reminder',
                        fromInitials: 'AR',
                        message: `"${task.title || 'Untitled assignment'}" is due in about ${hoursLeft}h.`,
                        timestamp: new Date(dueAtIso).toLocaleString(),
                        createdAt: task.created_at || dueAtIso,
                        taskId: task.id,
                        dueAt: dueAtIso,
                    };
                })
                .filter(Boolean)
            : [];

        const combined = [...nudgeNotifications, ...friendRequestNotifications, ...taskNotifications].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNotifications(combined);
        setIsLoading(false);
    }, []);

    const filteredNotifications = useMemo(
        () => notifications.filter((n) => filter === 'all' || n.type === filter),
        [notifications, filter]
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        loadInboxNotifications();
    }, [loadInboxNotifications]);

    useEffect(() => {
        if (!currentUserId) return undefined;

        const channel = supabase
            .channel(`inbox-notifications-${currentUserId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${currentUserId}` },
                () => {
                    loadInboxNotifications();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'nudge_notifications', filter: `receiver_id=eq.${currentUserId}` },
                () => {
                    loadInboxNotifications();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${currentUserId}` },
                () => {
                    loadInboxNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, loadInboxNotifications]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            loadInboxNotifications();
        }, 60 * 1000);

        return () => clearInterval(intervalId);
    }, [loadInboxNotifications]);

    useEffect(() => {
        if (!actionMessage) return;
        const t = setTimeout(() => setActionMessage(''), 2500);
        return () => clearTimeout(t);
    }, [actionMessage]);

    const markAsRead = (id) => {
        if (currentUserId && String(id || '').startsWith('task-24h-')) {
            markTaskReminderRead(currentUserId, id);
        }

        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        const userNudgeIds = notifications.filter((n) => n.type === 'nudge' && !n.read).map((n) => n.id);
        const taskReminderIds = notifications
            .filter((n) => n.type === 'task_notification' && !n.read)
            .map((n) => n.id);
        if (userNudgeIds.length > 0) {
            const currentUserIdPromise = supabase.auth.getUser().then(({ data }) => data?.user?.id || null);
            currentUserIdPromise.then((userId) => {
                if (userId) {
                    userNudgeIds.forEach((notificationId) => markStoredNudgeRead(userId, notificationId));
                    taskReminderIds.forEach((notificationId) => markTaskReminderRead(userId, notificationId));
                    supabase
                        .from('nudge_notifications')
                        .update({ read: true })
                        .eq('receiver_id', userId)
                        .in('id', userNudgeIds)
                        .then(() => { });
                }
            });
        } else if (currentUserId && taskReminderIds.length > 0) {
            taskReminderIds.forEach((notificationId) => markTaskReminderRead(currentUserId, notificationId));
        }

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const markNudgeAsRead = async (notification) => {
        if (!notification?.id || notification.type !== 'nudge' || notification.read) {
            return;
        }

        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || null;
        if (userId) {
            markStoredNudgeRead(userId, notification.id);
            if (notification.source !== 'local') {
                await supabase
                    .from('nudge_notifications')
                    .update({ read: true })
                    .eq('id', notification.id)
                    .eq('receiver_id', userId);
            }
        }

        setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
    };

    const handleAcceptFriend = async (id) => {
        const request = notifications.find((n) => n.id === id);
        if (!request?.friendshipId) return;

        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', request.friendshipId);

        if (error) {
            setActionMessage(error.message || 'Could not accept friend request.');
            return;
        }

        setActionMessage(`Now friends with ${request.from}!`);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const handleDeclineFriend = async (id) => {
        const request = notifications.find((n) => n.id === id);
        if (!request?.friendshipId) return;

        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', request.friendshipId);

        if (error) {
            setActionMessage(error.message || 'Could not decline friend request.');
            return;
        }

        setActionMessage('Friend request declined.');
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const deleteNotification = async (notification) => {
        if (notification?.type === 'nudge') {
            await markNudgeAsRead(notification);
            return;
        }

        if (notification?.type === 'task_notification' && currentUserId) {
            markTaskReminderRead(currentUserId, notification.id);
        }

        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'friend_request':
                return <UserPlus className="w-5 h-5" />;
            case 'task_notification':
                return <CheckCircle className="w-5 h-5" />;
            case 'nudge':
                return <Zap className="w-5 h-5" />;
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'friend_request':
                return 'bg-[#CD8B5C]';
            case 'task_notification':
                return 'bg-[#8B6F5C]';
            case 'nudge':
                return 'bg-[#9F7E69]';
        }
    };

    return (
        <div className="inbox-container">
            {/* Header */}
            <div className="inbox-header">
                <div className="inbox-header-title">
                    <Bell className="w-6 h-6 text-[#5D4838]" />
                    <h1 className="inbox-title">Inbox</h1>
                    {unreadCount > 0 && (
                        <span className="inbox-unread-badge">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="inbox-mark-all-read"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {actionMessage && (
                <p className="inbox-status-message">{actionMessage}</p>
            )}

            {/* Filter Tabs */}
            <div className="inbox-filters">
                <button
                    onClick={() => setFilter('all')}
                    className={`inbox-filter-btn ${filter === 'all' ? 'active' : ''
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('friend_request')}
                    className={`inbox-filter-btn ${filter === 'friend_request' ? 'active' : ''
                        }`}
                >
                    Friend Requests
                </button>
                <button
                    onClick={() => setFilter('nudge')}
                    className={`inbox-filter-btn ${filter === 'nudge' ? 'active' : ''
                        }`}
                >
                    Nudges
                </button>
                <button
                    onClick={() => setFilter('task_notification')}
                    className={`inbox-filter-btn ${filter === 'task_notification' ? 'active' : ''
                        }`}
                >
                    Tasks
                </button>
            </div>

            {/* Notifications List */}
            <div className="inbox-notifications">
                {isLoading ? (
                    <div className="inbox-empty">Loading notifications...</div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="inbox-empty">
                        No notifications in this category
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => {
                                if (notification.type === 'nudge') {
                                    markNudgeAsRead(notification);
                                } else if (!notification.read) {
                                    markAsRead(notification.id);
                                }
                            }}
                            className={`inbox-notification ${notification.read ? 'read' : 'unread'
                                }`}
                        >
                            <div className="inbox-notification-content">
                                {/* Icon */}
                                <div
                                    className={`inbox-icon ${getIconColor(
                                        notification.type
                                    )}`}
                                >
                                    {getIcon(notification.type)}
                                </div>

                                {/* Avatar */}
                                <div className="inbox-avatar">
                                    {notification.fromInitials}
                                </div>

                                {/* Text Content */}
                                <div className="inbox-message">
                                    <div className="inbox-message-text">
                                        <span className="font-medium">{notification.from}</span>{' '}
                                        {notification.message}
                                    </div>
                                    <div className="inbox-message-time">
                                        {notification.timestamp}
                                    </div>

                                    {/* Action Buttons for Friend Requests */}
                                    {notification.actionable &&
                                        notification.type === 'friend_request' && (
                                            <div className="inbox-actions">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAcceptFriend(notification.id);
                                                    }}
                                                    className="inbox-btn inbox-btn--accept"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeclineFriend(notification.id);
                                                    }}
                                                    className="inbox-btn inbox-btn--decline"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        )}

                                    {notification.type === 'nudge' && (
                                        <div className="inbox-actions">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markNudgeAsRead(notification);
                                                }}
                                                className="inbox-btn inbox-btn--decline"
                                            >
                                                Mark as read
                                            </button>
                                        </div>
                                    )}

                                    {notification.type === 'task_notification' && !notification.read && (
                                        <div className="inbox-actions">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                className="inbox-btn inbox-btn--decline"
                                            >
                                                Mark as read
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification);
                                    }}
                                    className="inbox-delete-btn"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
