import { useState } from "react";
import { Link } from 'react-router-dom';
import './dashboard.css';

const navItems = ["My Tasks", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");

  return (
    <div className="dashboard-page">
      <div className="dashboard-productivity-button">
        <Link to="/" className="dashboard-home-link" aria-label="Go to launch page">
          <img
            src="/logo.svg"
            alt="ProductiviTea Home"
            className="dashboard-home-logo"
          />
        </Link>
      </div>

      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          ProductiviTea
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
        <h1 className="dashboard-title">{active}</h1>
        <p className="dashboard-text">Welcome to your {active} page.</p>
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