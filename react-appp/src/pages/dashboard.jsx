import { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import TaskDashboard from "./taskdashboard";
import ActivityPanel from "./activitypanel";
import useAppData from '../hooks/useAppData';
import './dashboard.css';
import { supabase } from '../lib/supabase'; 

const navItems = ["My Tasks", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");
  const { tasks, setTasks, friends, sessions, userId, loading } = useAppData();
  const [userName, setUserName] = useState("");
  const [detailMode, setDetailMode] = useState('overview');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
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
    user ? resetToOverview() : navigate('/');
};

  const resetToOverview = () => {
    setDetailMode('overview');
    setSelectedTaskId(null);
    setSelectedFriendId(null);
    setActive("My Tasks");
};

const handleSelectTask = (id) => {
    setSelectedTaskId(id);
    setSelectedFriendId(null);
    setDetailMode('task');
};

const handleSelectFriend = (id) => {
    setSelectedFriendId(id);
    setSelectedTaskId(null);
    setDetailMode('friend');
};

  const activeDetail = detailMode === 'task'
    ? tasks.find(t => t.id === selectedTaskId)
    : detailMode === 'friend'
    ? friends.find(f => f.id === selectedFriendId)
    : null;

  const activity = tasks.map(t => ({
    label: t.name,
    value: sessions
        .filter(s => s.task_id === t.id)
        .reduce((sum, s) => sum + (s.duration_mins ?? 0), 0)
})).filter(a => a.value > 0);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

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
      </aside>

      <main className="dashboard-content">
        {active === "My Tasks" ? (
          <TaskDashboard
    tasks={tasks}
    selectedTaskId={selectedTaskId}
    onSelectTask={handleSelectTask}
    onReset={resetToOverview}
/>
        ) : (
          <>
            <h1 className="dashboard-title">{active}</h1>
            <p className="dashboard-text">Welcome to your {active} page.</p>
          </>
        )}
      </main>

      <aside className="dashboard-right-sidebar">
        <ActivityPanel activity={activity} sessions={sessions} />
      </aside>
    </div>
    </div>
  );
}