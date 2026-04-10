import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './privacypolicy.css';

export default function PrivacyPolicy() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('privacy');

    return (
        <div className="policy-page">

            {/* Navbar */}
            <nav className="policy-nav">
                <button type="button" className="policy-nav-logo" onClick={() => navigate('/')}>
                    <img src="/logo.svg" alt="ProductiviTea" className="policy-nav-icon" />
                    <span>ProductiviTea</span>
                </button>
            </nav>

            <div className="policy-container">

                {/* Tab switcher */}
                <div className="policy-tabs">
                    <button
                        type="button"
                        className={`policy-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('privacy')}
                    >
                        Privacy Policy
                    </button>
                    <button
                        type="button"
                        className={`policy-tab ${activeTab === 'terms' ? 'active' : ''}`}
                        onClick={() => setActiveTab('terms')}
                    >
                        Terms of Service
                    </button>
                </div>

                {/* Privacy Policy */}
                {activeTab === 'privacy' && (
                    <div className="policy-content">
                        <h1>Privacy Policy</h1>
                        <p className="policy-date">Last updated: April 2026</p>

                        <section>
                            <h2>1. Introduction</h2>
                            <p>Welcome to ProductiviTea. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.</p>
                        </section>

                        <section>
                            <h2>2. Information We Collect</h2>
                            <p>We collect the following types of information:</p>
                            <ul>
                                <li><strong>Account information:</strong> Your name and email address when you sign up</li>
                                <li><strong>Task data:</strong> Tasks, deadlines, and productivity sessions you create</li>
                                <li><strong>Usage data:</strong> How you interact with the app, including streaks and activity</li>
                                <li><strong>Friend connections:</strong> Usernames of friends you connect with on the platform</li>
                            </ul>
                        </section>

                        <section>
                            <h2>3. How We Use Your Information</h2>
                            <p>We use your information to:</p>
                            <ul>
                                <li>Provide and maintain the ProductiviTea service</li>
                                <li>Allow you to manage your tasks and track your productivity</li>
                                <li>Enable friend accountability features</li>
                                <li>Send notifications you have opted into</li>
                                <li>Improve our service over time</li>
                            </ul>
                        </section>

                        <section>
                            <h2>4. Data Storage</h2>
                            <p>Your data is stored securely using Supabase, a third-party database provider. Data is stored on servers located in the United States. We use Row Level Security to ensure your data is only accessible to you.</p>
                        </section>

                        <section>
                            <h2>5. Data Sharing</h2>
                            <p>We do not sell your personal data. We do not share your information with third parties except as necessary to operate the service (e.g. our database provider). Friend activity is only shared with users you have explicitly connected with.</p>
                        </section>

                        <section>
                            <h2>6. Your Rights</h2>
                            <p>You have the right to:</p>
                            <ul>
                                <li>Access the personal data we hold about you</li>
                                <li>Request correction of inaccurate data</li>
                                <li>Request deletion of your account and data</li>
                                <li>Opt out of notifications at any time via Settings</li>
                            </ul>
                        </section>

                        <section>
                            <h2>7. Cookies</h2>
                            <p>We use session cookies to keep you logged in. We do not use tracking or advertising cookies.</p>
                        </section>

                        <section>
                            <h2>8. Changes to This Policy</h2>
                            <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the date at the top of this page.</p>
                        </section>

                        <section>
                            <h2>9. Contact</h2>
                            <p>If you have any questions about this Privacy Policy, please contact us through the app.</p>
                        </section>
                    </div>
                )}

                {/* Terms of Service */}
                {activeTab === 'terms' && (
                    <div className="policy-content">
                        <h1>Terms of Service</h1>
                        <p className="policy-date">Last updated: April 2026</p>

                        <section>
                            <h2>1. Acceptance of Terms</h2>
                            <p>By accessing or using ProductiviTea, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
                        </section>

                        <section>
                            <h2>2. Use of Service</h2>
                            <p>ProductiviTea is a productivity and task management application. You agree to use the service only for lawful purposes and in a way that does not infringe the rights of others.</p>
                        </section>

                        <section>
                            <h2>3. Your Account</h2>
                            <p>You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. Please notify us immediately of any unauthorized use of your account.</p>
                        </section>

                        <section>
                            <h2>4. User Content</h2>
                            <p>You retain ownership of any content you create within ProductiviTea, including tasks, notes, and session data. By using the service, you grant us a limited license to store and display your content solely for the purpose of providing the service to you.</p>
                        </section>

                        <section>
                            <h2>5. Prohibited Conduct</h2>
                            <p>You agree not to:</p>
                            <ul>
                                <li>Use the service for any unlawful purpose</li>
                                <li>Attempt to gain unauthorized access to other users' data</li>
                                <li>Interfere with or disrupt the service</li>
                                <li>Use the service to harass or harm other users</li>
                                <li>Attempt to reverse engineer or copy the service</li>
                            </ul>
                        </section>

                        <section>
                            <h2>6. Termination</h2>
                            <p>We reserve the right to suspend or terminate your account at our discretion if you violate these terms. You may delete your account at any time through the Settings page.</p>
                        </section>

                        <section>
                            <h2>7. Disclaimer of Warranties</h2>
                            <p>ProductiviTea is provided "as is" without warranties of any kind. We do not guarantee that the service will be error-free or uninterrupted. We are not responsible for any loss of data.</p>
                        </section>

                        <section>
                            <h2>8. Limitation of Liability</h2>
                            <p>To the fullest extent permitted by law, ProductiviTea shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
                        </section>

                        <section>
                            <h2>9. Changes to Terms</h2>
                            <p>We may update these Terms of Service from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
                        </section>

                        <section>
                            <h2>10. Contact</h2>
                            <p>If you have any questions about these Terms of Service, please contact us through the app.</p>
                        </section>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="policy-footer">
                <p>© 2026 ProductiviTea. Brew responsibly.</p>
                <button type="button" onClick={() => navigate('/')} className="policy-back">
                    ← Back to Home
                </button>
            </footer>
        </div>
    );
}