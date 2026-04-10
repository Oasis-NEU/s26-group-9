import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckSquare, Flame, Users } from 'lucide-react';
import './launch.css';
import AnimatedCup from './animatedcup';

function Launch() {
    const navigate = useNavigate();

    const handleGetStarted = async () => {
        const { data, error } = await supabase.auth.getUser();
        const isLoggedIn = !error && !!data?.user;
        navigate(isLoggedIn ? '/dashboard' : '/signup');
    };

    return (
        <div className="launch-page">

            {/* Navbar */}
            <nav className="launch-nav">
                <div className="launch-nav-logo">
                    <img src="/logo.svg" alt="ProductiviTea" className="launch-nav-icon" />
                    <span className="launch-nav-brand">ProductiviTea</span>
                </div>
                <div className="launch-nav-buttons">
                    <button type="button" className="launch-btn-login" onClick={() => navigate('/login')}>
                        Log In
                    </button>
                    <button type="button" className="launch-btn-signup" onClick={() => navigate('/signup')}>
                        Sign Up
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="launch-hero">
                <AnimatedCup />
                <h1 className="launch-hero-title">ProductiviTea</h1>
                <p className="launch-hero-subtitle">Stay organized, stay accountable</p>
                <p className="launch-hero-desc">Track tasks, build streaks, and keep each other on track — all in one place.</p>
                <button type="button" className="launch-btn-cta" onClick={handleGetStarted}>
                    Get Started Free →
                </button>
            </section>

            {/* Features Section */}
            <section className="launch-features">
                <h2 className="launch-features-title">Everything in one place</h2>
                <div className="launch-features-grid">
                    <div className="launch-feature-card">
                        <div className="launch-feature-icon"><CheckSquare size={24} /></div>
                        <h3>Tasks & Deadlines</h3>
                        <p>Stay organized with everything in one view</p>
                    </div>
                    <div className="launch-feature-card">
                        <div className="launch-feature-icon"><Flame size={24} /></div>
                        <h3>Build Streaks</h3>
                        <p>Track consistency and stay motivated</p>
                    </div>
                    <div className="launch-feature-card">
                        <div className="launch-feature-icon"><Users size={24} /></div>
                        <h3>Friend Accountability</h3>
                        <p>Keep each other on track together</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="launch-footer">
                <div className="launch-footer-logo">
                    <img src="/logo.svg" alt="ProductiviTea" className="launch-nav-icon" />
                    <span>ProductiviTea</span>
                </div>
                <p>© 2026 ProductiviTea. Brew responsibly.</p>
            </footer>

        </div>
    );
}

export default Launch;