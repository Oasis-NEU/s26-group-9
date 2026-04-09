import { useEffect, useMemo, useState } from 'react';
import { Bell, UserPlus, CheckCircle, Zap, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './inbox.css';

export default function Inbox() {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [actionMessage, setActionMessage] = useState('');

    const filteredNotifications = useMemo(
        () => notifications.filter((n) => filter === 'all' || n.type === filter),
        [notifications, filter]
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        async function loadFriendRequests() {
            setIsLoading(true);

            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user || null;
            if (!user) {
                setNotifications([]);
                setIsLoading(false);
                return;
            }

            const { data: friendshipsData, error } = await supabase
                .from('friendships')
                .select('*')
                .eq('friend_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) {
                setActionMessage(error.message || 'Could not load friend requests.');
                setNotifications([]);
                setIsLoading(false);
                return;
            }

            const pendingRequests = Array.isArray(friendshipsData) ? friendshipsData : [];
            const senderIds = pendingRequests.map((request) => request.user_id).filter(Boolean);
            let profileMap = {};

            if (senderIds.length > 0) {
                const [usersResult, profilesResult] = await Promise.all([
                    supabase.from('users').select('id, email, username, created_at').in('id', senderIds),
                    supabase.from('profiles').select('id, email, username, created_at').in('id', senderIds),
                ]);

                const userRows = Array.isArray(usersResult.data) ? usersResult.data : [];
                const profileRows = Array.isArray(profilesResult.data) ? profilesResult.data : [];

                userRows.forEach((row) => {
                    profileMap[row.id] = row;
                });
                profileRows.forEach((row) => {
                    if (!profileMap[row.id]) {
                        profileMap[row.id] = row;
                    }
                });
            }

            setNotifications(
                pendingRequests.map((request) => {
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
                        senderId: request.user_id,
                        senderProfile: profile,
                    };
                })
            );

            setIsLoading(false);
        }

        loadFriendRequests();
    }, []);

    useEffect(() => {
        if (!actionMessage) return;
        const t = setTimeout(() => setActionMessage(''), 2500);
        return () => clearTimeout(t);
    }, [actionMessage]);

    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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

    const deleteNotification = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
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
                    <div className="inbox-empty">Loading friend requests...</div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="inbox-empty">
                        No notifications in this category
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => !notification.read && markAsRead(notification.id)}
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
                                </div>

                                {/* Delete Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
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
