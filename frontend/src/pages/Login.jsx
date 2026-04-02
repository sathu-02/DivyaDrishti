import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 2FA state
    const [requires2FA, setRequires2FA] = useState(false);
    const [totpCode, setTotpCode] = useState('');

    const googleBtnRef = useRef(null);
    const { login, googleAuth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (requires2FA && !totpCode) {
            setError('Please enter your 2FA code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await login(email, password, totpCode);

            // Check if 2FA is required
            if (result.requires_2fa) {
                setRequires2FA(true);
                setError('');
                setLoading(false);
                return;
            }

            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    // Render the Google button once the SDK is loaded
    useEffect(() => {
        if (requires2FA || !googleBtnRef.current) return;
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
                        navigate(from, { replace: true });
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
            // SDK not yet loaded — poll until ready
            const interval = setInterval(() => {
                if (window.google) { tryRender(); clearInterval(interval); }
            }, 300);
            return () => clearInterval(interval);
        }
    }, [requires2FA]);

    const inputStyle = {
        background: '#f4e9d5',
        border: '1px solid #e2d3b9',
        padding: '1rem 1.2rem',
        borderRadius: '12px',
        fontSize: '1rem',
        color: '#1e4063',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: '#ffffff', padding: '0.5rem', display: 'flex', overflow: 'auto' }}>
            <div style={{ flex: 1, borderRadius: '24px', background: 'radial-gradient(circle at 50% 50%, #fffcf5 0%, #f4e8d3 100%)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                {/* Decorative Background Waves */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                    <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: '10%', left: '-10%', width: '120%', height: 'auto', opacity: 0.15 }}>
                        <path d="M-100 200 C 400 400, 800 -100, 1500 300" stroke="#a88d6b" strokeWidth="1" />
                        <path d="M-100 220 C 400 420, 800 -80, 1500 320" stroke="#a88d6b" strokeWidth="1" />
                        <path d="M-100 400 C 500 100, 900 600, 1500 200" stroke="#a88d6b" strokeWidth="1" />
                        <path d="M-100 420 C 500 120, 900 620, 1500 220" stroke="#a88d6b" strokeWidth="1" />
                    </svg>
                </div>

                {/* Navbar */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 3rem', position: 'relative', zIndex: 10 }}>
                    <div style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.4rem', fontWeight: '600', color: '#b69a74' }}>
                        DivyaDhrishti
                    </div>
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}></nav>
                </header>

                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 10 }}>
                    <div style={{ background: '#fcfaf4', borderRadius: '16px', padding: '2.5rem 2rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(30,64,99,0.1)', border: '1px solid #efeadd' }}>
                        <h2 style={{ fontFamily: '"Inter", sans-serif', fontSize: '1.5rem', fontWeight: '700', color: '#1e4063', textAlign: 'center', marginBottom: '1.5rem' }}>
                            {requires2FA ? '🔐 Enter 2FA Code' : 'Welcome Back'}
                        </h2>

                        {error && (
                            <div style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.85rem', background: 'rgba(239,68,68,0.08)', padding: '0.6rem', borderRadius: '8px' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!requires2FA ? (
                                <>
                                    <input id="email" type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input id="password" type={showPassword ? "text" : "password"} style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#1e4063' }}>
                                            {showPassword ? "🙈" : "👁️"}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', margin: '0 0 0.5rem 0' }}>
                                        We've sent a 6-digit OTP to <strong style={{color:'#1e4063'}}>{email}</strong>. Check your inbox.
                                    </p>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        style={{ ...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem', fontWeight: '700' }}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setRequires2FA(false); setTotpCode(''); setError(''); }}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', marginTop: '-0.5rem' }}
                                    >
                                        ← Back to login
                                    </button>
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    background: '#1e4063', color: 'white', padding: '1rem', borderRadius: '50px',
                                    fontWeight: '500', fontSize: '1rem', marginTop: '0.5rem', border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                                }}
                            >
                                {loading ? 'Logging in...' : requires2FA ? 'Verify & Log In' : 'Log In'}
                            </button>
                        </form>

                        {!requires2FA && (
                            <>
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
                            </>
                        )}

                        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#3b2a1a' }}>
                            Don't have an account? <Link to="/signup" style={{ color: '#1e4063', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
