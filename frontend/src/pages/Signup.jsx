import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");

    // Email OTP verification state
    const [showOTPScreen, setShowOTPScreen] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [verifyingOTP, setVerifyingOTP] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);

    const { signup, googleAuth, verify2FA, resendOTP } = useAuth();
    const navigate = useNavigate();
    const googleBtnRef = useRef(null);

    // Resend timer countdown
    useEffect(() => {
        if (!showOTPScreen || canResend) return;
        if (resendTimer <= 0) {
            setCanResend(true);
            return;
        }
        const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendTimer, showOTPScreen, canResend]);

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
            const result = await signup(username, email, password);
            if (result.requires_email_verification) {
                setShowOTPScreen(true);
                setResendTimer(30);
                setCanResend(false);
            } else {
                navigate('/', { replace: true });
            }
        } catch (err) {
            setError(err.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setError('Please enter the 6-digit code');
            return;
        }
        setVerifyingOTP(true);
        setError('');
        try {
            await verify2FA(email, otpCode);
            setOtpVerified(true);
            setTimeout(() => navigate('/', { replace: true }), 1500);
        } catch (err) {
            setError(err.message || 'Verification failed');
        } finally {
            setVerifyingOTP(false);
        }
    };

    const handleResendOTP = async () => {
        setError('');
        try {
            await resendOTP(email);
            setResendTimer(30);
            setCanResend(false);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to resend OTP');
        }
    };

    // Render the Google button once the SDK is loaded
    useEffect(() => {
        if (!googleBtnRef.current) return;
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        const tryRender = () => {
            if (!window.google || !googleBtnRef.current) return;
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: async (response) => {
                    setLoading(true);
                    setError('');
                    try {
                        await googleAuth(response.credential);
                        navigate('/', { replace: true });
                    } catch (err) {
                        setError(err.message || 'Google sign-in failed');
                    } finally {
                        setLoading(false);
                    }
                },
            });
            window.google.accounts.id.renderButton(googleBtnRef.current, {
                theme: 'outline',
                size: 'large',
                width: googleBtnRef.current.offsetWidth || 340,
                text: 'continue_with',
                shape: 'pill',
            });
        };

        if (window.google) {
            tryRender();
        } else {
            const interval = setInterval(() => {
                if (window.google) { tryRender(); clearInterval(interval); }
            }, 300);
            return () => clearInterval(interval);
        }
    }, []);

    const inputStyle = {
        background: "#f4e9d5",
        border: "1px solid #e2d3b9",
        padding: "1rem 1.2rem",
        borderRadius: "12px",
        fontSize: "1rem",
        color: "#1e4063",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    };

    // ========== EMAIL OTP VERIFICATION SCREEN ==========
    if (showOTPScreen) {
        return (
            <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "#ffffff", padding: "0.5rem", display: "flex", overflow: "auto" }}>
                <div style={{ flex: 1, borderRadius: "24px", background: "radial-gradient(circle at 50% 50%, #fffcf5 0%, #f4e8d3 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#fcfaf4", borderRadius: "16px", padding: "2.5rem 2rem", width: "100%", maxWidth: "440px", boxShadow: "0 8px 32px rgba(30,64,99,0.1)", border: "1px solid #efeadd" }}>

                        {otpVerified ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                                <h2 style={{ fontFamily: '"Inter", sans-serif', fontSize: "1.4rem", fontWeight: "700", color: "#1e4063" }}>Email Verified!</h2>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>Redirecting to your dashboard...</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📧</div>
                                    <h2 style={{ fontFamily: '"Inter", sans-serif', fontSize: "1.4rem", fontWeight: "700", color: "#1e4063" }}>Verify Your Email</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                                        We've sent a 6-digit code to <strong style={{ color: '#1e4063' }}>{email}</strong>
                                    </p>
                                </div>

                                {/* Email icon with animation */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ background: 'linear-gradient(135deg, #1e4063, #2d5a8e)', borderRadius: '50%', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(30,64,99,0.3)' }}>
                                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M22 7l-10 7L2 7" />
                                        </svg>
                                    </div>
                                </div>

                                {error && (
                                    <div style={{ color: "#ef4444", marginBottom: "1rem", textAlign: "center", fontSize: "0.85rem", background: 'rgba(239,68,68,0.08)', padding: '0.6rem', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}

                                {/* OTP Input */}
                                <div style={{ marginBottom: '1rem' }}>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Enter 6-digit code"
                                        style={{ ...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem', fontWeight: '700' }}
                                        autoFocus
                                    />
                                </div>

                                <button
                                    onClick={handleVerifyOTP}
                                    disabled={verifyingOTP || otpCode.length !== 6}
                                    style={{
                                        width: '100%', background: "#1e4063", color: "white", padding: "0.9rem",
                                        borderRadius: "50px", fontWeight: "500", fontSize: "1rem", border: 'none',
                                        cursor: verifyingOTP ? "not-allowed" : "pointer", opacity: (verifyingOTP || otpCode.length !== 6) ? 0.7 : 1,
                                        marginBottom: '1rem',
                                    }}
                                >
                                    {verifyingOTP ? "Verifying..." : "Verify Email"}
                                </button>

                                {/* Resend OTP */}
                                <div style={{ textAlign: 'center' }}>
                                    {canResend ? (
                                        <button
                                            onClick={handleResendOTP}
                                            style={{ background: 'none', border: 'none', color: '#1e4063', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Resend OTP
                                        </button>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                            Resend OTP in <strong>{resendTimer}s</strong>
                                        </span>
                                    )}
                                </div>

                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
                                    Check your inbox & spam folder. Code expires in 5 minutes.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ========== MAIN SIGNUP FORM ==========
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, backgroundColor: "#ffffff", padding: "0.5rem", display: "flex", overflow: "auto" }}>
        <div style={{ flex: 1, borderRadius: "24px", background: "radial-gradient(circle at 50% 50%, #fffcf5 0%, #f4e8d3 100%)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
          {/* Decorative Background Waves */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
            <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", top: "10%", left: "-10%", width: "120%", height: "auto", opacity: 0.15 }}>
              <path d="M-100 200 C 400 400, 800 -100, 1500 300" stroke="#a88d6b" strokeWidth="1" />
              <path d="M-100 220 C 400 420, 800 -80, 1500 320" stroke="#a88d6b" strokeWidth="1" />
              <path d="M-100 400 C 500 100, 900 600, 1500 200" stroke="#a88d6b" strokeWidth="1" />
              <path d="M-100 420 C 500 120, 900 620, 1500 220" stroke="#a88d6b" strokeWidth="1" />
            </svg>
          </div>

          {/* Navbar */}
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 3rem", position: "relative", zIndex: 10 }}>
            <div style={{ fontFamily: '"Playfair Display", serif', fontSize: "1.4rem", fontWeight: "600", color: "#b69a74" }}>
              DivyaDhrishti
            </div>
            <nav style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <Link to="/login" style={{ background: "#1e4063", color: "white", padding: "0.5rem 1.4rem", borderRadius: "50px", fontWeight: "500", fontSize: "0.9rem", textDecoration: "none" }}>
                Login
              </Link>
            </nav>
          </header>

          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", zIndex: 10 }}>
            <div style={{ background: "#fcfaf4", borderRadius: "16px", padding: "2.5rem 2rem", width: "100%", maxWidth: "400px", boxShadow: "0 8px 32px rgba(30,64,99,0.1)", border: "1px solid #efeadd" }}>
              <h2 style={{ fontFamily: '"Inter", sans-serif', fontSize: "1.5rem", fontWeight: "700", color: "#1e4063", textAlign: "center", marginBottom: "1.5rem" }}>
                Create Account
              </h2>

              {error && (
                <div style={{ color: "#ef4444", marginBottom: "1rem", textAlign: "center", fontSize: "0.85rem", background: 'rgba(239,68,68,0.08)', padding: '0.6rem', borderRadius: '8px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <input id="username" type="text" style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
                <div style={{ position: 'relative', width: '100%' }}>
                    <input id="password" type={showPassword ? "text" : "password"} style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#1e4063' }}>
                        {showPassword ? "🙈" : "👁️"}
                    </button>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                    <input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} style={inputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#1e4063' }}>
                        {showConfirmPassword ? "🙈" : "👁️"}
                    </button>
                </div>

                {/* Password requirements hint */}
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5, padding: '0 0.2rem' }}>
                  Password must have: 8+ chars, uppercase, lowercase, digit, special character
                </div>

                <button type="submit" disabled={loading} style={{ background: "#1e4063", color: "white", padding: "1rem", borderRadius: "50px", fontWeight: "500", fontSize: "1rem", marginTop: "0.5rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, border: 'none' }}>
                  {loading ? "Creating account..." : "Sign Up"}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.2rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2d3b9' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#e2d3b9' }} />
              </div>

              {/* Google Sign-In — rendered by the SDK */}
              <div
                ref={googleBtnRef}
                style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'center' }}
              />
              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <p style={{ fontSize: '0.75rem', color: '#ef4444', textAlign: 'center', marginTop: '0.3rem' }}>
                  ⚠️ Google Client ID not configured
                </p>
              )}

              <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem", color: "#3b2a1a" }}>
                Already have an account?{" "}
                <Link to="/login" style={{ color: "#1e4063", fontWeight: 600, textDecoration: "none" }}>Log in</Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
}
