import { useState } from 'react';
import { Bell, UserPlus, CheckCircle, Zap, X, Check } from 'lucide-react';
import './inbox.css';

export default function Inbox() {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');

    const filteredNotifications = notifications.filter(
        (n) => filter === 'all' || n.type === filter
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const handleAcceptFriend = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const handleDeclineFriend = (id) => {
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
                {filteredNotifications.length === 0 ? (
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
