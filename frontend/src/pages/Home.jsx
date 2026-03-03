import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth(); // ✅ single declaration
  const navigate = useNavigate(); // ✅ single declaration

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

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
        {/* Navbar within Home */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.2rem 3rem",
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
            <Link
              to="/"
              style={{
                color: "#b69a74",
                fontWeight: "500",
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              style={{
                color: "#3b2a1a",
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

        {/* Hero Content */}
        <main
          style={{
            flex: 1,
            padding: "2rem 3rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div style={{ maxWidth: "600px" }}>
            <h1
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: "clamp(2.5rem, 5vw, 3.8rem)",
                fontWeight: "700",
                color: "#3b2a1a",
                lineHeight: "1.1",
                marginBottom: "1.2rem",
                letterSpacing: "-0.02em",
              }}
            >
              See the unseen.
              <br />
              Visualize everything.
            </h1>
            <p
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: "1.15rem",
                color: "#2b2b2b",
                fontWeight: "400",
                lineHeight: "1.5",
                marginBottom: "2rem",
                maxWidth: "480px",
              }}
            >
              Your intelligent workspace for data, insights, and seamless chat.
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleGetStarted}
                style={{
                  backgroundColor: "#1e4063",
                  color: "white",
                  border: "none",
                  padding: "1rem 2.5rem",
                  borderRadius: "50px",
                  fontSize: "1.1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "0 4px 15px rgba(30,64,99,0.2)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(30,64,99,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(30,64,99,0.2)";
                }}
              >
                Get Started
              </button>
              <Link
                to="/about"
                style={{
                  background: "transparent",
                  border: "1px solid #b69a74",
                  color: "#3b2a1a",
                  padding: "0.75rem 1.8rem",
                  borderRadius: "50px",
                  fontWeight: "500",
                  fontSize: "1rem",
                  textDecoration: "none",
                }}
              >
                Learn More
              </Link>
            </div>
          </div>
        </main>

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
      </div>
    </div>
  );
}
