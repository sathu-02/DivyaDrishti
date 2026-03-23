import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  const isActive = (path) => (location.pathname === path ? "active" : "");

  return (
    <nav className="navbar">
      {/* Brand */}
      <Link to="/" className="nav-brand">
        Divya Drishti
      </Link>

      <div className="nav-links">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="nav-link"
          style={{
            background: "transparent",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            border: "1px solid var(--border-color)",
            margin: "0 0.5rem",
          }}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>

        {/* Main Navigation (Hidden on Login/Signup) */}
        {!isAuthPage && (
          <>
            <Link to="/" className={`nav-link ${isActive("/")}`}>
              Home
            </Link>

            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`nav-link ${isActive("/dashboard")}`}
                >
                  Dashboard
                </Link>

                <Link
                  to="/history"
                  className={`nav-link ${isActive("/history")}`}
                >
                  History
                </Link>
              </>
            )}

            <Link to="/about" className={`nav-link ${isActive("/about")}`}>
              About
            </Link>
          </>
        )}

        {/* Auth Buttons */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                textTransform: 'uppercase',
                boxShadow: 'var(--shadow-sm)'
              }}
              title={user.username || user.email || 'User'}
            >
              {(user.username || user.email || 'U').charAt(0)}
            </div>
            <button onClick={handleLogout} className="nav-btn btn-outline">
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link to="/login" className="nav-btn btn-outline">
              Login
            </Link>

            <Link
              to="/signup"
              className="nav-btn btn-primary"
              style={{
                width: "auto",
                padding: "0.5rem 1rem",
              }}
            >
              Signup
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
