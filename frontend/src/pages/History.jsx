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
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "#ffffff",
        padding: "0.5rem",
        display: "flex",
        overflow: "auto",
        fontFamily: '"Inter", sans-serif',
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: "24px",
          background:
            "linear-gradient(110deg, #fbf9f2 0%, #fbf9f2 35%, #d1dfcc 65%, #1e4063 100%)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Simulated Glowing Dots Background Effect via Absolute Positioning */}
        <div style={{ position: "absolute", top: "10%", right: "10%", width: "4px", height: "4px", background: "white", borderRadius: "50%", boxShadow: "0 0 10px 3px white", opacity: 0.8 }}></div>
        <div style={{ position: "absolute", top: "35%", right: "25%", width: "3px", height: "3px", background: "white", borderRadius: "50%", boxShadow: "0 0 8px 2px white", opacity: 0.6 }}></div>
        <div style={{ position: "absolute", bottom: "40%", right: "15%", width: "5px", height: "5px", background: "white", borderRadius: "50%", boxShadow: "0 0 12px 4px white", opacity: 0.9 }}></div>
        <div style={{ position: "absolute", bottom: "50%", right: "40%", width: "3px", height: "3px", background: "white", borderRadius: "50%", boxShadow: "0 0 8px 2px white", opacity: 0.7 }}></div>

        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.2rem 3rem",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "1.4rem",
              fontWeight: "600",
              color: "#b69a74",
            }}
          >
            Divya Drishti
          </div>
          <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <Link to="/" style={{ color: "#3b2a1a", fontWeight: "500", fontSize: "0.9rem", textDecoration: "none" }}>Home</Link>
            <Link to="/dashboard" style={{ color: "#3b2a1a", fontWeight: "500", fontSize: "0.9rem", textDecoration: "none" }}>Dashboard</Link>
            <Link to="/history" style={{ color: "#b69a74", fontWeight: "500", fontSize: "0.9rem", textDecoration: "none" }}>History</Link>
            <Link to="/about" style={{ color: "#3b2a1a", fontWeight: "500", fontSize: "0.9rem", textDecoration: "none" }}>About Us</Link>
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

        <main
          style={{
            flex: 1,
            padding: "2rem 3rem 4rem",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 10,
            overflowY: "auto",
          }}
        >
          <section
            style={{
              display: "flex",
              justifyContent: "center",
              flex: 1,
              paddingBottom: "2rem",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "1200px",
                background: "rgba(255, 255, 255, 0.6)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(182, 154, 116, 0.3)",
                borderRadius: "24px",
                padding: "2.5rem",
                boxShadow: "0 8px 32px rgba(30,64,99,0.05)",
                display: "flex",
                flexDirection: "column",
                minHeight: "700px",
              }}
            >
              <h2 style={{ marginBottom: "2rem", color: "#1e4063", fontSize: "1.8rem" }}>
                Analysis History
              </h2>

              {sessions.length === 0 && (
                <p style={{ color: "#1e4063" }}>No history found.</p>
              )}

              {sessions.map((session, index) => (
                <div
                  key={index}
                  style={{
                    background: "rgba(255, 255, 255, 0.8)",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    marginBottom: "2rem",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.02)",
                    border: "1px solid rgba(182, 154, 116, 0.15)",
                  }}
                >
                  {/* Date */}
                  <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.5rem" }}>
                    {session.created_at
                      ? new Date(session.created_at).toLocaleDateString()
                      : "Unknown date"}
                  </p>

                  {/* Title */}
                  <h3 style={{ color: "#1e4063", marginBottom: "1rem", fontSize: "1.1rem" }}>
                    {session.input_text || "Session"}
                  </h3>

                  {/* Summary */}
                  <div
                    style={{
                      background: "#f4f7fa",
                      padding: "1rem 1.2rem",
                      borderRadius: "10px",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <strong style={{ fontSize: "0.9rem", color: "#1e4063" }}>Summary:</strong>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.95rem", lineHeight: "1.5" }}>{session.summary}</p>
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
                            border: "1px solid rgba(182, 154, 116, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "1rem",
                            background: "#ffffff",
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
          </section>
        </main>
      </div>
    </div>
  );
}
