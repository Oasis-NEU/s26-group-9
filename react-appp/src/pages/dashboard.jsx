import { useState } from "react";
import { Link } from 'react-router-dom';
import TaskDashboard from "./taskdashboard";
import './dashboard.css';

const navItems = ["My Tasks", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");

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
          <TaskDashboard />
        ) : (
          <>
            <h1 className="dashboard-title">{active}</h1>
            <p className="dashboard-text">Welcome to your {active} page.</p>
          </>
        )}
      </main>

      <aside className="dashboard-right-sidebar">
        <div className="dashboard-right-title">Activity Chart</div>
        <div className="dashboard-graph-container">
          {/* your graph goes here */}
        </div>
      </aside>
    </div>
  );
}