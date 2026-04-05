import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import ChatInterface from '../components/ChatInterface';
import VisualizationCard from '../components/VisualizationCard';
import SummaryCard from '../components/SummaryCard';
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "../components/ProfileDropdown";

export default function Dashboard() {
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const { user, logout } = useAuth(); // ✅ single declaration
  const navigate = useNavigate();

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
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "10%",
            width: "4px",
            height: "4px",
            background: "white",
            borderRadius: "50%",
            boxShadow: "0 0 10px 3px white",
            opacity: 0.8,
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            top: "35%",
            right: "25%",
            width: "3px",
            height: "3px",
            background: "white",
            borderRadius: "50%",
            boxShadow: "0 0 8px 2px white",
            opacity: 0.6,
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            bottom: "40%",
            right: "15%",
            width: "5px",
            height: "5px",
            background: "white",
            borderRadius: "50%",
            boxShadow: "0 0 12px 4px white",
            opacity: 0.9,
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            bottom: "50%",
            right: "40%",
            width: "3px",
            height: "3px",
            background: "white",
            borderRadius: "50%",
            boxShadow: "0 0 8px 2px white",
            opacity: 0.7,
          }}
        ></div>

        {/* Navbar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.2rem 3rem",
            position: "relative",
            zIndex: 50,
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
            DivyaDhrishti
          </div>
          <nav
            style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}
          >
            <Link
              to="/"
              style={{
                color: "#3b2a1a",
                fontWeight: "500",
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Home
            </Link>

            {user && (
              <>
                <Link
                  to="/dashboard"
                  style={{
                    color: "#b69a74",
                    fontWeight: "500",
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  Dashboard
                </Link>

                <Link
                  to="/history"
                  style={{
                    color: "#3b2a1a",
                    fontWeight: "500",
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  History
                </Link>

                <Link
                  to="/about"
                  style={{
                    color: "#3b2a1a",
                    fontWeight: "500",
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  About Us
                </Link>
              </>
            )}

            {user ? (
              <ProfileDropdown />
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
          {/* Header Section */}
          <div
            style={{
              marginBottom: "2rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid rgba(182, 154, 116, 0.3)",
            }}
          >
            <p
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: "1.1rem",
                color: "#1e4063",
                fontWeight: "500",
                maxWidth: "800px",
                letterSpacing: "-0.01em",
              }}
            >
              Upload data, generate context, and extract breathtaking visual
              insights instantly.
            </p>
          </div>

          {/* Main Interactive Area */}
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
                padding: "2rem",
                boxShadow: "0 8px 32px rgba(30,64,99,0.05)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "700px",
                }}
              >
                <ChatInterface />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
