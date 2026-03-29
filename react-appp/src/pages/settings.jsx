import { useState } from 'react';
import './settings.css';

const settingsTabs = ["Profile", "Notifications"];

export default function Settings() {
    const [activeTab, setActiveTab] = useState("Profile");

    return (
        <div className="settings-page">

            {/* Left sidebar with tabs */}
            <aside className="settings-sidebar">
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
                <button type="button" className="settings-logout">
                    Log out
                </button>
            </aside>

            {/* Main content area */}
            <div className="settings-content">
                {activeTab === "Profile" && (
                    <div className="settings-section">
                        <h2 className="settings-section-title">Profile</h2>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Display name</div>
                                <div className="settings-row-value">Your Name</div>
                            </div>
                            <button type="button" className="settings-edit-btn">Edit</button>
                        </div>

                        <div className="settings-row">
                            <div>
                                <div className="settings-row-label">Email</div>
                                <div className="settings-row-value">your@email.com</div>
                            </div>
                            <button type="button" className="settings-edit-btn">Edit</button>
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