import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useState, useRef, useEffect } from "react";
import axios from "axios";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfile, setShowProfile] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setShowProfile(false);
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This will permanently delete your account and all data. This cannot be undone.")) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      logout();
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    setFeedbackError("");
    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      await axios.post(`${API_URL}/feedback`,
        { message: feedbackText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbackSent(true);
      setFeedbackText("");
      setTimeout(() => { setFeedbackSent(false); setShowFeedback(false); }, 2500);
    } catch (err) {
      setFeedbackError(err.response?.data?.detail || "Failed to send feedback.");
    } finally {
      setFeedbackSending(false);
    }
  };

  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";
  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <>
      <nav className="navbar">
        {/* Brand */}
        <Link to="/" className="nav-brand">DivyaDhrishti</Link>

        <div className="nav-links">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="nav-link"
            style={{ background: "transparent", display: "flex", alignItems: "center", gap: "0.4rem", border: "1px solid var(--border-color)", margin: "0 0.5rem" }}
          >
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>

          {/* Main Nav Links — Dashboard & History only for logged-in users */}
          {!isAuthPage && (
            <>
              <Link to="/" className={`nav-link ${isActive("/")}`}>Home</Link>
              {user && (
                <>
                  <Link to="/dashboard" className={`nav-link ${isActive("/dashboard")}`}>Dashboard</Link>
                  <Link to="/history" className={`nav-link ${isActive("/history")}`}>History</Link>
                  <Link to="/about" className={`nav-link ${isActive("/about")}`}>About</Link>
                </>
              )}
            </>
          )}

          {/* Auth Section */}
          {user ? (
            <div style={{ position: "relative" }} ref={dropdownRef}>
              {/* Avatar Button */}
              <button
                onClick={() => setShowProfile(prev => !prev)}
                style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  backgroundColor: "var(--accent-primary)", color: "white",
                  border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer",
                  fontWeight: "bold", fontSize: "1rem", textTransform: "uppercase",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)", transition: "all 0.2s ease",
                }}
                title="Profile"
              >
                {(user.username || user.email || "U").charAt(0)}
              </button>

              {/* Dropdown */}
              {showProfile && (
                <div style={{
                  position: "absolute", top: "48px", right: 0,
                  background: "var(--bg-primary)", border: "1px solid var(--border-color)",
                  borderRadius: "16px", padding: "1rem", minWidth: "240px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 1000,
                }}>
                  {/* User Info */}
                  <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{
                        width: "44px", height: "44px", borderRadius: "50%",
                        backgroundColor: "var(--accent-primary)", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: "bold", fontSize: "1.2rem", flexShrink: 0,
                      }}>
                        {(user.username || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                          {user.username || "User"}
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", wordBreak: "break-all" }}>
                          {user.email || ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <button
                    onClick={() => { setShowProfile(false); setShowFeedback(true); }}
                    style={{
                      width: "100%", textAlign: "left", background: "none", border: "none",
                      padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                      color: "var(--text-primary)", fontSize: "0.88rem", display: "flex",
                      alignItems: "center", gap: "0.6rem",
                    }}
                    onMouseOver={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                    onMouseOut={e => e.currentTarget.style.background = "none"}
                  >
                    💬 Send Feedback
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    style={{
                      width: "100%", textAlign: "left", background: "none", border: "none",
                      padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                      color: "var(--text-primary)", fontSize: "0.88rem", display: "flex",
                      alignItems: "center", gap: "0.6rem",
                    }}
                    onMouseOver={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                    onMouseOut={e => e.currentTarget.style.background = "none"}
                  >
                    🚪 Logout
                  </button>

                  {/* Delete Account */}
                  <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      style={{
                        width: "100%", textAlign: "left", background: "none", border: "none",
                        padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                        color: "#ef4444", fontSize: "0.88rem", display: "flex",
                        alignItems: "center", gap: "0.6rem", opacity: deleting ? 0.6 : 1,
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                      onMouseOut={e => e.currentTarget.style.background = "none"}
                    >
                      🗑️ {deleting ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            !isAuthPage && (
              <>
                <Link to="/login" className="nav-btn btn-outline">Login</Link>
                <Link to="/signup" className="nav-btn btn-primary" style={{ width: "auto", padding: "0.5rem 1rem" }}>Signup</Link>
              </>
            )
          )}
        </div>
      </nav>

      {/* Feedback Modal */}
      {showFeedback && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
          }}
          onClick={() => setShowFeedback(false)}
        >
          <div
            style={{
              background: "var(--bg-primary)", borderRadius: "20px", padding: "2rem",
              width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              border: "1px solid var(--border-color)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1.2rem" }}>💬 Send Feedback</h3>
              <button onClick={() => setShowFeedback(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-secondary)" }}>✕</button>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Your feedback goes directly to the DivyaDhrishti team.
            </p>
            {feedbackSent ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ fontSize: "2.5rem" }}>✅</div>
                <p style={{ color: "#22c55e", fontWeight: "600", marginTop: "0.5rem" }}>Feedback sent! Thank you.</p>
              </div>
            ) : (
              <>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you think, report a bug, or suggest a feature..."
                  rows={5}
                  style={{
                    width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                    borderRadius: "12px", padding: "0.9rem", color: "var(--text-primary)",
                    fontSize: "0.9rem", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                  }}
                />
                {feedbackError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: "0.5rem" }}>{feedbackError}</p>}
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackSending || !feedbackText.trim()}
                  style={{
                    marginTop: "1rem", width: "100%", background: "var(--accent-primary)",
                    color: "white", border: "none", borderRadius: "50px", padding: "0.85rem",
                    fontWeight: "600", fontSize: "0.95rem", cursor: "pointer",
                    opacity: (feedbackSending || !feedbackText.trim()) ? 0.6 : 1, fontFamily: "inherit",
                  }}
                >
                  {feedbackSending ? "Sending..." : "Send Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
