import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import TaskDashboard from "./taskdashboard";
import ActivityPanel from "./activitypanel";
import { supabase } from '../lib/supabase';
import './dashboard.css';

const navItems = ["My Tasks", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("My Tasks");
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        if (isMounted) setActivity([]);
        return;
      }

      const userId = authData.user.id;
      const colorPalette = ['#DCC9AE', '#BFA88D', '#8A7664', '#746455'];

      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('user_id', userId);

      if (error || !Array.isArray(data)) {
        if (isMounted) setActivity([]);
        return;
      }

      const mappedActivity = data.map((row, index) => {
        const rawValue = row?.value ?? row?.hours ?? row?.duration ?? row?.minutes ?? 0;
        const numericValue =
          typeof rawValue === 'number'
            ? rawValue
            : Number.parseFloat(String(rawValue).replace(/[^\d.]/g, ''));

        return {
          label: row?.label || row?.category || row?.activity_name || `Category ${index + 1}`,
          value: Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0,
          color: row?.color || colorPalette[index % colorPalette.length],
        };
      });

      if (isMounted) setActivity(mappedActivity);
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, []);

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
        <ActivityPanel activity={activity} title="Time Spent Activity" />
      </aside>
    </div>
  );
}