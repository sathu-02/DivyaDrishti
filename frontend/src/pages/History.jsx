import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api";


export default function History() {
  const [sessions, setSessions] = useState([]);
      const { user, logout } = useAuth(); // ✅ single declaration
      const navigate = useNavigate();


  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await API.get("/history");
        setSessions(response.data);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    fetchHistory();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #fdfbf7 0%, #eef0eb 40%, #7693a6 100%)",
        fontFamily: '"Inter", sans-serif',
        paddingBottom: "3rem",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            padding: "2rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "2rem",
              color: "#b69a74",
            }}
          >
            Divya Drishti
          </h1>

          <nav style={{ display: "flex", gap: "2rem" }}>
            <Link to="/">Home</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/history" style={{
                color: "#b69a74"}}>History</Link>
            <Link to="/about">About</Link>
            {user ? (
              <button
                onClick={handleLogout}
                style={{
                  background: "#1e4063",
                  color: "white",
                  padding: "0.5rem 1.4rem",
                  borderRadius: "50px",
                  fontWeight: "500",
                  fontSize: "0.9rem",
                  border: "none",
                  cursor: "pointer",
                  marginLeft: "1rem",
                }}
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                style={{
                  background: "#1e4063",
                  color: "white",
                  padding: "0.5rem 1.4rem",
                  borderRadius: "50px",
                  fontWeight: "500",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  marginLeft: "1rem",
                }}
              >
                Login
              </Link>
            )}
          </nav>
        </header>

        <h2 style={{ marginBottom: "2rem", color: "#1e4063" }}>
          Analysis History
        </h2>

        {sessions.length === 0 && (
          <p style={{ color: "#1e4063" }}>No history found.</p>
        )}

        {sessions.map((session, index) => (
          <div
            key={index}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "1.5rem",
              marginBottom: "2rem",
              boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
            }}
          >
            {/* Date */}
            <p style={{ fontSize: "0.9rem", color: "#666" }}>
              {session.created_at
                ? new Date(session.created_at).toLocaleDateString()
                : "Unknown date"}
            </p>

            {/* Title */}
            <h3 style={{ color: "#1e4063", marginBottom: "1rem" }}>
              {session.input_text
                ? session.input_text.slice(0, 50) + "..."
                : "Session"}
            </h3>

            {/* Summary */}
            <div
              style={{
                background: "#f4f7fa",
                padding: "1rem",
                borderRadius: "10px",
                marginBottom: "1.5rem",
              }}
            >
              <strong>Summary:</strong>
              <p style={{ marginTop: "0.5rem" }}>{session.summary}</p>
            </div>

            {/* Visualizations */}
            {session.visualizations && session.visualizations.length > 0 && (
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {session.visualizations.map((viz, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: "1 1 300px",
                      minHeight: "250px",
                      borderRadius: "12px",
                      border: "1px solid #ddd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "1rem",
                      background: "#fafafa",
                    }}
                  >
                    {/* Image Visualization */}
                    {viz.type === "image" && viz.data?.url && (
                      <img
                        src={viz.data.url}
                        alt={`Visualization ${idx + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    )}

                    {/* Text Visualization */}
                    {viz.type === "text" && (
                      <div>
                        <strong>Text Length:</strong> {viz.data?.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
