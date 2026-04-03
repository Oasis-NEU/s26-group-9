import { useState, useEffect } from 'react';
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
    const [deadlineReminders, setDeadlineReminders] = useState(true);
    const [userId, setUserId] = useState(null);


    // Load user info and notification settings from Supabase
    useEffect(() => {
        async function loadSettings() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;

    const uid = authData.user.id;
    setUserId(uid);
    setDisplayName(authData.user.user_metadata?.full_name || "Your Name");
    setEmail(authData.user.email || "your@email.com");

    const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
    
    console.log('loaded notification settings:', data);

    if (data) {
        setDeadlineReminders(data.deadline_reminders);
    }
}
        loadSettings();
    }, []);

    // Save toggle to Supabase when it changes
   const handleToggleDeadlineReminders = async (val) => {
    setDeadlineReminders(val);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    
    const { data, error } = await supabase
        .from('notification_settings')
        .upsert({ 
            user_id: authData.user.id, 
            deadline_reminders: val,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    console.log('saved:', val, 'data:', data, 'error:', error);
};


    const handleEditName = () => { setTempName(displayName); setEditingName(true); };
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
    </div>
)}
            </div>
        </div>
    );
}