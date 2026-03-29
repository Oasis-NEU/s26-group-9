import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import ActivityPanel from "./activitypanel";
import { Overview } from "./overview";
import useAppData from '../hooks/useAppData';
import './dashboard.css';
import { supabase } from '../lib/supabase';
import Settings from './settings';

const navItems = ["My Tasks", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");
  const { tasks, sessions, activity, isLoading } = useAppData();
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUser() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) return;
      setUserName(authData.user.user_metadata?.full_name || authData.user.email || "");
    }
    loadUser();
  }, []);

  const handleLogoClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    user ? setActive("My Tasks") : navigate('/');
  };

  const handleAddTask = () => {
    navigate('/tasks/new');
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: '#99836F',
          fontSize: '1rem'
        }}
      >
        Loading your tasks...
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-topbar">
        <button
          type="button"
          className="dashboard-home-link"
          onClick={handleLogoClick}
          aria-label="Go to launch page or reset dashboard">
          ProductiviTea
        </button>
        <div className="dashboard-topbar-right">
          <span className="dashboard-topbar-date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </span>
          {userName && <span className="dashboard-topbar-name">{userName}</span>}
          <button
            type="button"
            className="dashboard-topbar-settings"
            onClick={() => setActive("Settings")}
          >
            Settings
          </button>
        </div>
      </header>
      <div className="dashboard-page">

        <aside className="dashboard-sidebar">


          <nav className="dashboard-nav">
            {navItems.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setActive(item)}
                className={`dashboard-nav-item ${active === item ? 'active' : ''}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <section className="dashboard-task-rail">
            <button type="button" className="dashboard-add-task-btn" onClick={handleAddTask}>
              + Add task
            </button>
          </section>
        </aside>

        <main className={`dashboard-content ${active === "My Tasks" ? "dashboard-content--full" : ""}`}>
          {active === "My Tasks" ? (
            <Overview tasks={tasks} sessions={sessions} userName={userName} />
          ) : active === "Settings" ? (
    <Settings />
) : (
    <>
        <h1 className="dashboard-title">{active}</h1>
        <p className="dashboard-text">Welcome to your {active} page.</p>
    </>
)}
        </main>

        <aside className="dashboard-right-sidebar">
          <ActivityPanel activity={activity} sessions={sessions} tasks={tasks} title="Time Spent Activity" />
        </aside>
      </div>
    </div>
  );
}