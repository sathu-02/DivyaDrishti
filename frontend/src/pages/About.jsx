import { Link, useNavigate} from "react-router-dom";
import { useAuth } from "../context/AuthContext";



export default function About() {
     
     const { user, logout } = useAuth(); // ✅ single declaration
     const navigate = useNavigate();

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
                color: "#b69a74",
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

        <main
          style={{
            flex: 1,
            padding: "3rem 8rem",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 10,
            overflowY: "auto",
          }}
        >
          <div style={{ maxWidth: "800px" }}>
            <h1
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
                fontWeight: "700",
                color: "#1e4063",
                lineHeight: "1.1",
                marginBottom: "1.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              About Divya Drishti
            </h1>
            <p
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: "1.15rem",
                color: "#3b2a1a",
                fontWeight: "400",
                lineHeight: "1.6",
                marginBottom: "4rem",
                maxWidth: "650px",
              }}
            >
              Transforming text and context into stunning visual art with
              state-of-the-art diffusion models. We believe in sleek, effortless
              interaction without the clutter.
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "3rem" }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "1.8rem",
                    fontWeight: "600",
                    color: "#1e4063",
                    marginBottom: "0.8rem",
                  }}
                >
                  01. Speak to your creativity.
                </h2>
                <p
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: "1rem",
                    color: "#3b2a1a",
                    lineHeight: "1.6",
                    fontWeight: "400",
                    maxWidth: "600px",
                  }}
                >
                  Interact naturally with our intelligent agent. Refine your
                  prompts, engineer your concepts, and iterate seamlessly
                  without ever leaving the flow.
                </p>
              </div>

              <div>
                <h2
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "1.8rem",
                    fontWeight: "600",
                    color: "#1e4063",
                    marginBottom: "0.8rem",
                  }}
                >
                  02. Complex contexts, distilled.
                </h2>
                <p
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: "1rem",
                    color: "#3b2a1a",
                    lineHeight: "1.6",
                    fontWeight: "400",
                    maxWidth: "600px",
                  }}
                >
                  Upload reports or dense PDFs. Our engine extracts profound
                  context to drive specific visual generation on demand.
                </p>
              </div>

              <div>
                <h2
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "1.8rem",
                    fontWeight: "600",
                    color: "#b69a74",
                    marginBottom: "0.8rem",
                  }}
                >
                  03. Stunning synthesis.
                </h2>
                <p
                  style={{
                    fontFamily: '"Inter", sans-serif',
                    fontSize: "1rem",
                    color: "#3b2a1a",
                    lineHeight: "1.6",
                    fontWeight: "400",
                    maxWidth: "600px",
                  }}
                >
                  Experience the magic of instant creation. No messy interfaces,
                  just premium aesthetic outputs delivered beautifully to your
                  screen.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
