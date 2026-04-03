import { useState } from 'react';
import { supabase } from '../lib/supabase';
import './settings.css';

const settingsTabs = ["Profile", "Notifications"];

export default function Settings() {
    const [activeTab, setActiveTab] = useState("Profile");
    const [editingName, setEditingName] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);
    const [displayName, setDisplayName] = useState("Your Name");
    const [email, setEmail] = useState("your@email.com");
    const [tempName, setTempName] = useState("");
    const [tempEmail, setTempEmail] = useState("");

    const handleEditName = () => { setTempName(displayName); setEditingName(true); setUserName(tempName); };
    const handleSaveName = () => { setDisplayName(tempName); setEditingName(false); };
    const handleEditEmail = () => { setTempEmail(email); setEditingEmail(true); };
    const handleSaveEmail = () => { setEmail(tempEmail); setEditingEmail(false); };

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

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Display name</div>
                                {editingName
                                    ? <input className="settings-input" value={tempName} onChange={e => setTempName(e.target.value)} autoFocus />
                                    : <div className="settings-row-value">{displayName}</div>
                                }
                            </div>
                            <button type="button" className="settings-edit-btn" onClick={editingName ? handleSaveName : handleEditName}>
                                {editingName ? 'Save' : 'Edit'}
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
                            <button type="button" className="settings-edit-btn" onClick={editingEmail ? handleSaveEmail : handleEditEmail}>
                                {editingEmail ? 'Save' : 'Edit'}
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