import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import TaskDashboard from "./taskdashboard";
import ActivityPanel from "./activitypanel";
import useAppData from '../hooks/useAppData';
import './dashboard.css';
import { supabase } from '../lib/supabase'; 

const navItems = ["My Tasks", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");
  const { tasks, activity, addTask, isLoading, error } = useAppData();
  const [userName, setUserName] = useState("");

   useEffect(() => {
    async function loadUser() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) return;
      setUserName(authData.user.user_metadata?.full_name || authData.user.email || "");
    }
    loadUser();
  }, []);

  return (
    <div className="dashboard-wrapper">
    <header className="dashboard-topbar">
    <Link to="/" aria-label="Go to launch page">
        <span>ProductiviTea</span>
    </Link>
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
      </aside>

      <main className="dashboard-content">
        {active === "My Tasks" ? (
          <TaskDashboard tasks={tasks} addTask={addTask} isLoading={isLoading} dataError={error} />
        ) : (
          <>
            <h1 className="dashboard-title">{active}</h1>
            <p className="dashboard-text">Welcome to your {active} page.</p>
          </>
        )}
      </main>

      <aside className="dashboard-right-sidebar">
        <ActivityPanel activity={activity} title="Time Spent Activity" />
      </aside>
    </div>
    </div>
  );
}