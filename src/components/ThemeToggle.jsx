import React from "react";

export default function ThemeToggle({ theme, setTheme }) {
return (
    <button
        className="theme-toggle-btn"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        aria-label="Toggle dark/light mode"
        style={{
            borderRadius: "60%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            border: "none",
            background: theme === "light" ? "#2196f3" : "#1565c0",
            color: "#fff",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}
    >
        {theme === "light" ? "⏾" : "❂"}
    </button>
);
}
