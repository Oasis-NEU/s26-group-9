import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './settings.css';

const settingsTabs = ["Profile", "Notifications"];
const NOTIFICATION_SETTINGS_STORAGE_PREFIX = 'productivitea:notification-settings:';

function getNotificationSettingsStorageKey(userId) {
    return `${NOTIFICATION_SETTINGS_STORAGE_PREFIX}${userId}`;
}

function readStoredNotificationSettings(userId) {
    if (typeof window === 'undefined' || !userId) return {};

    try {
        const raw = window.localStorage.getItem(getNotificationSettingsStorageKey(userId));
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeStoredNotificationSettings(userId, patch) {
    if (typeof window === 'undefined' || !userId || !patch || typeof patch !== 'object') return;

    const current = readStoredNotificationSettings(userId);
    const next = { ...current, ...patch };
    window.localStorage.setItem(getNotificationSettingsStorageKey(userId), JSON.stringify(next));
}

export default function Settings({ onProfileUpdated }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("Profile");
    const [editingName, setEditingName] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [isSavingEmail] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [displayName, setDisplayName] = useState("Your Name");
    const [email, setEmail] = useState("your@email.com");
    const [tempName, setTempName] = useState("");
    const [tempEmail, setTempEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [deadlineReminders, setDeadlineReminders] = useState(true);
    const [nudgeNotifications, setNudgeNotifications] = useState(true);
    const [friendRequestNotifications, setFriendRequestNotifications] = useState(true);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState("success");
    const [isLoggingOut, setIsLoggingOut] = useState(false);


    // Load user info and notification settings from Supabase
    useEffect(() => {
        async function loadSettings() {
            const { data: authData } = await supabase.auth.getUser();
            if (!authData?.user) return;

            const uid = authData.user.id;
            setDisplayName(authData.user.user_metadata?.full_name || "Your Name");
            setEmail(authData.user.email || "your@email.com");

            const storedPrefs = readStoredNotificationSettings(uid);
            if (typeof storedPrefs.deadline_reminders === 'boolean') {
                setDeadlineReminders(storedPrefs.deadline_reminders);
            }
            if (typeof storedPrefs.nudge_notifications === 'boolean') {
                setNudgeNotifications(storedPrefs.nudge_notifications);
            }
            if (typeof storedPrefs.friend_request_notifications === 'boolean') {
                setFriendRequestNotifications(storedPrefs.friend_request_notifications);
            }

            const { data } = await supabase
                .from('notification_settings')
                .select('*')
                .eq('user_id', uid)
                .maybeSingle();

            console.log('loaded notification settings:', data);

            if (data) {
                const normalized = {
                    deadline_reminders: typeof data.deadline_reminders === 'boolean' ? data.deadline_reminders : true,
                    nudge_notifications: typeof data.nudge_notifications === 'boolean' ? data.nudge_notifications : true,
                    friend_request_notifications:
                        typeof data.friend_request_notifications === 'boolean'
                            ? data.friend_request_notifications
                            : true,
                };

                setDeadlineReminders(normalized.deadline_reminders);
                setNudgeNotifications(normalized.nudge_notifications);
                setFriendRequestNotifications(normalized.friend_request_notifications);
                writeStoredNotificationSettings(uid, normalized);
            } else {
                const initial = {
                    deadline_reminders:
                        typeof storedPrefs.deadline_reminders === 'boolean' ? storedPrefs.deadline_reminders : true,
                    nudge_notifications:
                        typeof storedPrefs.nudge_notifications === 'boolean' ? storedPrefs.nudge_notifications : true,
                    friend_request_notifications:
                        typeof storedPrefs.friend_request_notifications === 'boolean'
                            ? storedPrefs.friend_request_notifications
                            : true,
                };

                // Ensure a settings row exists so toggles persist on first save.
                await supabase
                    .from('notification_settings')
                    .upsert({
                        user_id: uid,
                        ...initial,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });

                setDeadlineReminders(initial.deadline_reminders);
                setNudgeNotifications(initial.nudge_notifications);
                setFriendRequestNotifications(initial.friend_request_notifications);
                writeStoredNotificationSettings(uid, initial);
            }
        }
        loadSettings();
    }, []);

    const saveNotificationSettings = async (patch) => {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return false;

        const uid = authData.user.id;
        writeStoredNotificationSettings(uid, patch);

        const { error } = await supabase
            .from('notification_settings')
            .upsert({
                user_id: uid,
                updated_at: new Date().toISOString(),
                ...patch,
            }, { onConflict: 'user_id' });

        if (error) {
            console.log('notification settings save error:', error);
            setStatusType('error');
            setStatusMessage(
                error.code === '42703'
                    ? 'Run the notification-delivery SQL migration to add new notification fields.'
                    : (error.message || 'Could not save notification settings.')
            );
            return false;
        }

        return true;
    };

    // Save toggle to Supabase when it changes
    const handleToggleDeadlineReminders = async (val) => {
        setDeadlineReminders(val);
        await saveNotificationSettings({ deadline_reminders: val });
    };

    const handleToggleNudgeNotifications = async (val) => {
        setNudgeNotifications(val);
        await saveNotificationSettings({ nudge_notifications: val });
    };

    const handleToggleFriendRequestNotifications = async (val) => {
        setFriendRequestNotifications(val);
        await saveNotificationSettings({ friend_request_notifications: val });
    };


    const handleEditName = () => { setTempName(displayName); setEditingName(true); };
    const handleSaveName = async () => {
        const trimmed = tempName.trim();
        if (!trimmed) return;

        setIsSavingName(true);
        setStatusMessage('');

        const { error } = await supabase.auth.updateUser({
            data: { full_name: trimmed }
        });

        if (error) {
            setStatusType('error');
            setStatusMessage(error.message || 'Could not update display name.');
        } else {
            setDisplayName(trimmed);
            setEditingName(false);
            setStatusType('success');
            setStatusMessage('Display name updated.');
            if (typeof onProfileUpdated === 'function') {
                onProfileUpdated({ displayName: trimmed });
            }
        }

        setIsSavingName(false);
    };
    const handleEditEmail = () => { setTempEmail(email); setEditingEmail(true); };
    const handleSaveEmail = () => { setEmail(tempEmail); setEditingEmail(false); };

    const resetPasswordDrafts = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const handleTogglePasswordEditor = () => {
        if (isEditingPassword) {
            resetPasswordDrafts();
        }
        setIsEditingPassword(prev => !prev);
    };

    const handleSavePassword = async () => {
        const currentValue = String(currentPassword || '').trim();
        const nextValue = String(newPassword || '').trim();
        const confirmValue = String(confirmPassword || '').trim();

        if (!currentValue || !nextValue || !confirmValue) {
            setStatusType("error");
            setStatusMessage("Please fill in all password fields.");
            return;
        }

        if (nextValue.length < 8) {
            setStatusType("error");
            setStatusMessage("New password must be at least 8 characters.");
            return;
        }

        if (nextValue !== confirmValue) {
            setStatusType("error");
            setStatusMessage("New password and confirmation do not match.");
            return;
        }

        if (nextValue === currentValue) {
            setStatusType("error");
            setStatusMessage("New password must be different from current password.");
            return;
        }

        setIsSavingPassword(true);
        setStatusMessage("");

        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email,
            password: currentValue,
        });

        if (reauthError) {
            setStatusType("error");
            setStatusMessage(reauthError.message || "Current password is incorrect.");
            setIsSavingPassword(false);
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({ password: nextValue });

        if (updateError) {
            setStatusType("error");
            setStatusMessage(updateError.message || "Could not update password.");
            setIsSavingPassword(false);
            return;
        }

        setStatusType("success");
        setStatusMessage("Password updated successfully.");
        resetPasswordDrafts();
        setIsEditingPassword(false);
        setIsSavingPassword(false);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const { error } = await supabase.auth.signOut();

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message || "Could not log out. Please try again.");
            setIsLoggingOut(false);
            return;
        }

        navigate('/login', { replace: true });
    };

    return (
        <div className="settings-page">

            <aside className="settings-sidebar">
                <div className="settings-tabs">
                    {settingsTabs.map((tab) => (
                        <button
                            type="button"
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`settings-tab ${activeTab === tab ? 'active' : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <button type="button" className="settings-logout" onClick={handleLogout} disabled={isLoggingOut}>
                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
            </aside>

            <div className="settings-content">
                {activeTab === "Profile" && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Profile</h2>
                        {statusMessage && (
                            <p className={`settings-status settings-status--${statusType}`}>{statusMessage}</p>
                        )}

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Display name</div>
                                {editingName
                                    ? <input className="settings-input" value={tempName} onChange={e => setTempName(e.target.value)} autoFocus />
                                    : <div className="settings-row-value">{displayName}</div>
                                }
                            </div>
                            <button
                                type="button"
                                className="settings-edit-btn"
                                onClick={editingName ? handleSaveName : handleEditName}
                                disabled={isSavingName}
                            >
                                {editingName ? (isSavingName ? 'Saving...' : 'Save') : 'Edit'}
                            </button>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Email</div>
                                {editingEmail
                                    ? <input className="settings-input" value={tempEmail} onChange={e => setTempEmail(e.target.value)} autoFocus />
                                    : <div className="settings-row-value">{email}</div>
                                }
                            </div>
                            <button
                                type="button"
                                className="settings-edit-btn"
                                onClick={editingEmail ? handleSaveEmail : handleEditEmail}
                                disabled={isSavingEmail}
                            >
                                {editingEmail ? (isSavingEmail ? 'Saving...' : 'Save') : 'Edit'}
                            </button>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Password</div>
                                <div className="settings-row-value" aria-label="Password hidden">••••••••</div>
                            </div>
                            <button
                                type="button"
                                className="settings-edit-btn"
                                onClick={handleTogglePasswordEditor}
                                disabled={isSavingPassword}
                            >
                                {isEditingPassword ? 'Cancel' : 'Change'}
                            </button>
                        </div>

                        {isEditingPassword && (
                            <div className="settings-password-panel">
                                <label className="settings-password-field">
                                    <span className="settings-row-label">Current password</span>
                                    <div className="settings-password-input-wrap">
                                        <input
                                            type={showCurrentPassword ? "text" : "password"}
                                            className="settings-input settings-input--password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword((prev) => !prev)}
                                            className="settings-password-toggle"
                                            aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                        >
                                            {showCurrentPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="settings-password-icon">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="settings-password-icon">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </label>
                                <label className="settings-password-field">
                                    <span className="settings-row-label">New password</span>
                                    <div className="settings-password-input-wrap">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            className="settings-input settings-input--password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword((prev) => !prev)}
                                            className="settings-password-toggle"
                                            aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                                        >
                                            {showNewPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="settings-password-icon">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="settings-password-icon">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </label>
                                <label className="settings-password-field">
                                    <span className="settings-row-label">Confirm new password</span>
                                    <div className="settings-password-input-wrap">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            className="settings-input settings-input--password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                            className="settings-password-toggle"
                                            aria-label={showConfirmPassword ? 'Hide confirm new password' : 'Show confirm new password'}
                                        >
                                            {showConfirmPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="settings-password-icon">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="settings-password-icon">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </label>
                                <div className="settings-password-actions">
                                    <button
                                        type="button"
                                        className="settings-save-btn"
                                        onClick={handleSavePassword}
                                        disabled={isSavingPassword}
                                    >
                                        {isSavingPassword ? 'Saving...' : 'Save password'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "Notifications" && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Notifications</h2>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Deadline reminders</div>
                                <div className="settings-row-value">Get notified 24h before due date</div>
                            </div>
                            <label className="settings-toggle">
                                <input
                                    type="checkbox"
                                    checked={deadlineReminders}
                                    onChange={e => handleToggleDeadlineReminders(e.target.checked)}

                                />
                                <span className="settings-toggle-slider" />
                            </label>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Nudge notifications</div>
                                <div className="settings-row-value">Get notified when friends nudge you</div>
                            </div>
                            <label className="settings-toggle">
                                <input
                                    type="checkbox"
                                    checked={nudgeNotifications}
                                    onChange={e => handleToggleNudgeNotifications(e.target.checked)}

                                />
                                <span className="settings-toggle-slider" />
                            </label>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Friend requests</div>
                                <div className="settings-row-value">Get notified of new friend requests</div>
                            </div>
                            <label className="settings-toggle">
                                <input
                                    type="checkbox"
                                    checked={friendRequestNotifications}
                                    onChange={e => handleToggleFriendRequestNotifications(e.target.checked)}

                                />
                                <span className="settings-toggle-slider" />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}