import { useState } from "react";
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
const navItems = ["Dashboard", "Friends", "Settings"];

export default function Dashboard() {
  const [active, setActive] = useState("Dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <div className="productivity-button">
                    <Button
                        component={Link}
                        to="/"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        <img
                            src="/logo.svg"
                            alt="descriptive text"
                            style={{ width: '90px', height: 'auto', display: 'block' }}
                        />
                    </Button>
                </div>
      {/* Sidebar */}
      <aside
        style={{
          width: "220px",
          background: "#7f6c42",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "24px 20px",
            fontSize: "18px",
            fontWeight: "700",
            borderBottom: "1px solid #2e3d52",
          }}
        >
          ProductiviTea
        </div>

        <nav style={{ flex: 1, paddingTop: "16px" }}>
          {navItems.map((item) => (
            <div
              key={item}
              onClick={() => setActive(item)}
              style={{
                padding: "12px 20px",
                cursor: "pointer",
                background: active === item ? "#2e3d52" : "transparent",
                borderLeft:
                  active === item
                    ? "3px solid #52422b"
                    : "3px solid transparent",
                fontWeight: active === item ? 600 : 400,
                transition: "all 0.2s",
              }}
            >
              {item}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "40px" }}>
        <h1>{active}</h1>
        <p>Welcome to your {active} page.</p>
      </div>

    </div>
  );
}