import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import TwoFactorSetup from "./TwoFactorSetup";

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
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

  const handleLogout = (e) => {
    if (e) e.preventDefault();
    setShowProfile(false);
    logout();
    window.location.href = "/";
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This will permanently delete your account and all data. This cannot be undone.")) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      await axios.delete(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      logout();
      window.location.href = "/";
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

  if (!user) return null;

  return (
    <>
      <div style={{ position: "relative", marginLeft: "1rem" }} ref={dropdownRef}>
        {/* Avatar Button */}
        <button
          onClick={() => setShowProfile((prev) => !prev)}
          style={{
            width: "38px", height: "38px", borderRadius: "50%",
            backgroundColor: "#1e4063", color: "white",
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
            background: "white", border: "1px solid #e2e8f0",
            borderRadius: "16px", padding: "1rem", minWidth: "240px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 1000,
            color: "#0f172a"
          }}>
            {/* User Info */}
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  backgroundColor: "#1e4063", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: "bold", fontSize: "1.2rem", flexShrink: 0,
                }}>
                  {(user.username || user.email || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.95rem" }}>
                    {user.username || "User"}
                  </div>
                  <div style={{ color: "#475569", fontSize: "0.78rem", wordBreak: "break-all" }}>
                    {user.email || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* 2FA Setup */}
            <button
              onClick={() => { setShowProfile(false); setShow2FA(true); }}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none",
                padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                color: "#0f172a", fontSize: "0.88rem", display: "flex",
                alignItems: "center", gap: "0.6rem",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >
              🛡️ Enable 2FA Setup
            </button>

            {/* Feedback */}
            <button
              onClick={() => { setShowProfile(false); setShowFeedback(true); }}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none",
                padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                color: "#0f172a", fontSize: "0.88rem", display: "flex",
                alignItems: "center", gap: "0.6rem",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >
              💬 Send Feedback
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none",
                padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                color: "#0f172a", fontSize: "0.88rem", display: "flex",
                alignItems: "center", gap: "0.6rem",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseOut={(e) => (e.currentTarget.style.background = "none")}
            >
              🚪 Logout
            </button>

            {/* Delete Account */}
            <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "0.5rem 0.6rem", borderRadius: "8px", cursor: "pointer",
                  color: "#ef4444", fontSize: "0.88rem", display: "flex",
                  alignItems: "center", gap: "0.6rem", opacity: deleting ? 0.6 : 1,
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "none")}
              >
                🗑️ {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2FA Modal */}
      {show2FA && (
        <TwoFactorSetup onClose={() => setShow2FA(false)} />
      )}

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
              background: "white", borderRadius: "20px", padding: "2rem",
              width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              border: "1px solid #e2e8f0", color: "#0f172a"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.2rem" }}>💬 Send Feedback</h3>
              <button onClick={() => setShowFeedback(false)} style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "#475569" }}>✕</button>
            </div>
            <p style={{ color: "#475569", fontSize: "0.85rem", marginBottom: "1rem" }}>
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
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us what you think, report a bug, or suggest a feature..."
                  rows={5}
                  style={{
                    width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: "12px", padding: "0.9rem", color: "#0f172a",
                    fontSize: "0.9rem", resize: "vertical", outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                  }}
                />
                {feedbackError && <p style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: "0.5rem" }}>{feedbackError}</p>}
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackSending || !feedbackText.trim()}
                  style={{
                    marginTop: "1rem", width: "100%", background: "#1e4063",
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
