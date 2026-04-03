import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import ActivityPanel from "./activitypanel";
import { Overview } from "./overview";
import useAppData from '../hooks/useAppData';
import './dashboard.css';
import { supabase } from '../lib/supabase';
import Settings from './settings';
import FriendSidebar from "./FriendSidebar";
const navItems = ["My Tasks", "Friends", "Settings"];
console.log("RUNNING THIS DASHBOARD FILE");

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");
  const { tasks, sessions, activity, friendships, isLoading } = useAppData();
  const friends = friendships.map(f => ({
  id: f.friend_id,
  name: f.friend_name,
  status: f.status
}));
  const [userName, setUserName] = useState("");
   const [selectedFriendId, setSelectedFriendId] = useState(null);
  const navigate = useNavigate();
 
const handleAddFriend = async (username) => {
  console.log("search this username in supabase:", username);
};

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
  {active === "My Tasks" && (
    <Overview tasks={tasks} sessions={sessions} userName={userName} />
  )}

  {active === "Settings" && <Settings />}

  {active === "Friends" && (
    <FriendSidebar
      friends={friends}
      selectedFriendId={selectedFriendId}
      onSelectFriend={setSelectedFriendId}
      onAddFriend={handleAddFriend}
    />
  )}
</main>
  

        <aside className="dashboard-right-sidebar">
          <ActivityPanel activity={activity} sessions={sessions} tasks={tasks} title="Time Spent Activity" />
        </aside>
      </div>
    </div>
  );
}