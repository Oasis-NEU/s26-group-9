import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import './settings.css';

const settingsTabs = ["Profile", "Notifications"];

export default function Settings({ onProfileUpdated }) {
    const [activeTab, setActiveTab] = useState("Profile");
    const [editingName, setEditingName] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);
    const [isSavingName, setIsSavingName] = useState(false);
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [displayName, setDisplayName] = useState("Your Name");
    const [email, setEmail] = useState("your@email.com");
    const [tempName, setTempName] = useState("");
    const [tempEmail, setTempEmail] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState("success");

    useEffect(() => {
        async function loadUserProfile() {
            const { data: authData, error } = await supabase.auth.getUser();
            if (error || !authData?.user) return;

            const user = authData.user;
            const resolvedName = user.user_metadata?.full_name || user.email || "Your Name";
            const resolvedEmail = user.email || "your@email.com";

            setDisplayName(resolvedName);
            setEmail(resolvedEmail);
            setTempName(resolvedName);
            setTempEmail(resolvedEmail);
        }

        loadUserProfile();
    }, []);

    const handleEditName = () => {
        setStatusMessage("");
        setTempName(displayName);
        setEditingName(true);
    };

    const handleSaveName = async () => {
        const nextName = tempName.trim();

        if (!nextName) {
            setStatusType("error");
            setStatusMessage("Display name cannot be empty.");
            return;
        }

        setIsSavingName(true);
        const { error } = await supabase.auth.updateUser({
            data: { full_name: nextName },
        });

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message || "Could not update display name.");
            setIsSavingName(false);
            return;
        }

        setDisplayName(nextName);
        setTempName(nextName);
        setEditingName(false);
        if (onProfileUpdated) {
            onProfileUpdated({ displayName: nextName });
        }
        setStatusType("success");
        setStatusMessage("Display name updated.");
        setIsSavingName(false);
    };

    const handleEditEmail = () => {
        setStatusMessage("");
        setTempEmail(email);
        setEditingEmail(true);
    };

    const handleSaveEmail = async () => {
        const nextEmail = tempEmail.trim();

        if (!nextEmail) {
            setStatusType("error");
            setStatusMessage("Email cannot be empty.");
            return;
        }

        setIsSavingEmail(true);
        const { error } = await supabase.auth.updateUser({
            email: nextEmail,
        });

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message || "Could not update email.");
            setIsSavingEmail(false);
            return;
        }

        setEmail(nextEmail);
        setTempEmail(nextEmail);
        setEditingEmail(false);
        setStatusType("success");
        setStatusMessage("Email update requested. Check your inbox to confirm the change.");
        setIsSavingEmail(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
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
                <button type="button" className="settings-logout" onClick={handleLogout}>
                    Log out
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
                            </div>
                            <button type="button" className="settings-edit-btn">Change</button>
                        </div>
                    </div>
                )}

                {activeTab !== "Profile" && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">{activeTab}</h2>
                        <p className="settings-coming-soon">Coming soon.</p>
                    </div>
                )}
            </div>
        </div>
    );
}