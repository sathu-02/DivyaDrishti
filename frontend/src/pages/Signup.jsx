import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !email || !password || !confirmPassword) {
          setError("Please fill in all fields");
          return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await signup(username, email, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || "Signup failed");
        } finally {
            setLoading(false);
        }
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
              "radial-gradient(circle at 50% 50%, #fffcf5 0%, #f4e8d3 100%)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative Background Waves */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "hidden",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <svg
              viewBox="0 0 1440 800"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: "absolute",
                top: "10%",
                left: "-10%",
                width: "120%",
                height: "auto",
                opacity: 0.15,
              }}
            >
              <path
                d="M-100 200 C 400 400, 800 -100, 1500 300"
                stroke="#a88d6b"
                strokeWidth="1"
              />
              <path
                d="M-100 220 C 400 420, 800 -80, 1500 320"
                stroke="#a88d6b"
                strokeWidth="1"
              />
              <path
                d="M-100 240 C 400 440, 800 -60, 1500 340"
                stroke="#a88d6b"
                strokeWidth="1"
              />
              <path
                d="M-100 260 C 400 460, 800 -40, 1500 360"
                stroke="#a88d6b"
                strokeWidth="1"
              />

              <path
                d="M-100 400 C 500 100, 900 600, 1500 200"
                stroke="#a88d6b"
                strokeWidth="1"
              />
              <path
                d="M-100 420 C 500 120, 900 620, 1500 220"
                stroke="#a88d6b"
                strokeWidth="1"
              />
              <path
                d="M-100 440 C 500 140, 900 640, 1500 240"
                stroke="#a88d6b"
                strokeWidth="1"
              />
              <path
                d="M-100 460 C 500 160, 900 660, 1500 260"
                stroke="#a88d6b"
                strokeWidth="1"
              />
            </svg>
          </div>

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
            <nav
              style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}
            >
              
              
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
            </nav>
          </header>

          <main
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              position: "relative",
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: "#fcfaf4",
                borderRadius: "16px",
                padding: "3rem 2rem",
                width: "100%",
                maxWidth: "400px",
                boxShadow: "0 8px 32px rgba(30,64,99,0.1)",
                border: "1px solid #efeadd",
              }}
            >
              <h2
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#1e4063",
                  textAlign: "center",
                  marginBottom: "2rem",
                }}
              >
                Create Account
              </h2>

              {error && (
                <div
                  style={{
                    color: "#ef4444",
                    marginBottom: "1rem",
                    textAlign: "center",
                    fontSize: "0.9rem",
                  }}
                >
                  {error}
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.2rem",
                }}
              >
                <input
                  id="username"
                  type="text"
                  style={{
                    background: "#f4e9d5",
                    border: "1px solid #e2d3b9",
                    padding: "1rem 1.2rem",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    color: "#1e4063",
                    outline: "none",
                  }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  style={{
                    background: "#f4e9d5",
                    border: "1px solid #e2d3b9",
                    padding: "1rem 1.2rem",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    color: "#1e4063",
                    outline: "none",
                  }}
                />

                <input
                  id="password"
                  type="password"
                  style={{
                    background: "#f4e9d5",
                    border: "1px solid #e2d3b9",
                    padding: "1rem 1.2rem",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    color: "#1e4063",
                    outline: "none",
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />

                <input
                  id="confirmPassword"
                  type="password"
                  style={{
                    background: "#f4e9d5",
                    border: "1px solid #e2d3b9",
                    padding: "1rem 1.2rem",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    color: "#1e4063",
                    outline: "none",
                  }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: "#1e4063",
                    color: "white",
                    padding: "1rem",
                    borderRadius: "50px",
                    fontWeight: "500",
                    fontSize: "1rem",
                    marginTop: "1rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </button>
              </form>

              <p
                style={{
                  marginTop: "1.5rem",
                  textAlign: "center",
                  fontSize: "0.9rem",
                  color: "#3b2a1a",
                }}
              >
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{
                    color: "#1e4063",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Log in
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
}
