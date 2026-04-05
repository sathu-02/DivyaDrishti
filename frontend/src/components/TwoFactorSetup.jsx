import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function TwoFactorSetup({ onClose }) {
    const { setupTOTP, verifyTOTPSetup } = useAuth();
    const [setupData, setSetupData] = useState(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchSetup = async () => {
            try {
                const data = await setupTOTP();
                setSetupData(data);
            } catch (err) {
                setError(err.message || 'Failed to initialize 2FA setup.');
            } finally {
                setLoading(false);
            }
        };
        fetchSetup();
    }, [setupTOTP]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        if (code.length !== 6) {
            setError("Please enter a 6-digit code.");
            return;
        }

        try {
            await verifyTOTPSetup(code);
            setSuccess(true);
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            setError(err.message || "Invalid verification code.");
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#ffffff', borderRadius: '24px', padding: '2rem',
                width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'transparent', border: 'none', fontSize: '1.2rem',
                        cursor: 'pointer', color: '#64748b'
                    }}
                >
                    ✕
                </button>

                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontFamily: '"Inter", sans-serif', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                        Set Up 2FA
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>
                        Scan this QR code with Google Authenticator or Authy to secure your account.
                    </p>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <span style={{ color: '#94a3b8' }}>Loading secure token...</span>
                    </div>
                ) : setupData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <QRCodeSVG value={setupData.uri} size={180} />
                        </div>

                        <div style={{ width: '100%', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 4px 0' }}>Or enter this code manually:</p>
                            <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', color: '#1e293b', fontSize: '0.85rem' }}>
                                {setupData.secret}
                            </code>
                        </div>

                        {success ? (
                            <div style={{ background: '#dcfce3', color: '#166534', padding: '1rem', borderRadius: '12px', width: '100%', textAlign: 'center', fontWeight: '500' }}>
                                ✅ Subscribed! 2FA is now active.
                            </div>
                        ) : (
                            <form onSubmit={handleVerify} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {error && (
                                    <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem', background: '#fef2f2', borderRadius: '8px' }}>
                                        {error}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    maxLength={6}
                                    placeholder="000000"
                                    style={{
                                        width: '100%', padding: '0.8rem', textAlign: 'center', fontSize: '1.25rem',
                                        letterSpacing: '6px', fontWeight: 'bold', borderRadius: '12px',
                                        border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', boxSizing: 'border-box'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={code.length !== 6}
                                    style={{
                                        background: code.length === 6 ? '#0f172a' : '#cbd5e1',
                                        color: 'white', border: 'none', borderRadius: '12px', padding: '0.8rem',
                                        fontSize: '1rem', fontWeight: '500', cursor: code.length === 6 ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Verify & Enable
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#ef4444' }}>
                        Failed to load setup configuration.
                    </div>
                )}
            </div>
        </div>
    );
}
