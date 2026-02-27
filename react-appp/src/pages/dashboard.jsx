import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import './dashboard.css';

const navItems = ["Dashboard", "Friends", "Settings"];

export default function Sidebar() {
  const [active, setActive] = useState("Dashboard");

  return (
    <aside style={{ width: 220, height: "100vh", background: "#7f6c42", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "Arial, Helvetica, sans-serif" }}>
      
      <div style={{ padding: "24px 20px", fontSize: 18, fontWeight: 700, borderBottom: "1px solid #2e3d52" }}>
        ProductiviTea
      </div>

      <nav style={{ flex: 1, padding: "16px 0" }}>
        {navItems.map(item => (
          <div
            key={item}
            onClick={() => setActive(item)}
            style={{
              padding: "12px 20px",
              cursor: "pointer",
              background: active === item ? "#2e3d52" : "transparent",
              borderLeft: active === item ? "3px solid #52422b" : "3px solid transparent",
              color: active === item ? "#fff" : "#c4b59a",
              fontWeight: active === item ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            {item}
          </div>
        ))}
      </nav>

    </aside>
  );
}