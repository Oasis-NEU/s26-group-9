import { useState } from "react";
import { Link } from 'react-router-dom';
import TaskDashboard from "./taskdashboard";
import ActivityPanel from "./activitypanel";
import useAppData from '../hooks/useAppData';
import './dashboard.css';

const navItems = ["My Tasks", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");
  const { tasks, activity, addTask, isLoading, error } = useAppData();

  return (
    <div className="dashboard-page">

      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <Link to="/" className="dashboard-home-link" aria-label="Go to launch page">
            ProductiviTea
          </Link>
        </div>


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
  );
}