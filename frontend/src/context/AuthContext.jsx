import { createContext, useState, useContext } from 'react';
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const API = axios.create({
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
    });

    const login = async (email, password, totpCode = "") => {
        try {
            const params = new URLSearchParams();
            params.append("username", email);
            params.append("password", password);
            if (totpCode) {
                params.append("scope", totpCode);
            }

            const response = await API.post("/login", params, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });

            // Check if 2FA is required
            if (response.data.requires_2fa && !response.data.access_token) {
                return { requires_2fa: true, email: response.data.email };
            }

            const token = response.data.access_token;
            localStorage.setItem("token", token);

            const me = await API.get("/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUser(me.data);
            localStorage.setItem("user", JSON.stringify(me.data));

            return response.data;
        } catch (error) {
            const detail = error.response?.data?.detail || "Invalid username or password";
            throw new Error(detail);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
    };

    const signup = async (username, email, password) => {
        try {
            const response = await API.post("/signup", {
                username,
                email,
                password,
            });

            // Don't store token yet — user needs to verify email OTP first
            return response.data; // includes { requires_email_verification, email }
        } catch (error) {
            throw new Error(error.response?.data?.detail || "Signup failed");
        }
    };

    const googleAuth = async (idToken) => {
        try {
            const response = await API.post("/auth/google", {
                id_token: idToken,
            });

            const token = response.data.access_token;
            localStorage.setItem("token", token);

            const me = await API.get("/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setUser(me.data);
            localStorage.setItem("user", JSON.stringify(me.data));

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || "Google sign-in failed");
        }
    };

    const verify2FA = async (email, code) => {
        try {
            const response = await API.post("/verify-2fa", { email, code });
            // If verification returns a token (signup flow), store it
            if (response.data.access_token) {
                const token = response.data.access_token;
                localStorage.setItem("token", token);
                const me = await API.get("/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setUser(me.data);
                localStorage.setItem("user", JSON.stringify(me.data));
            }
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || "Verification failed");
        }
    };

    const resendOTP = async (email) => {
        try {
            const response = await API.post("/resend-otp", { email });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || "Failed to resend OTP");
        }
    };

    const login2FA_totp = async (tempToken, code) => {
        try {
            const response = await API.post("/login/2fa", { temp_token: tempToken, code });
            const token = response.data.access_token;
            localStorage.setItem("token", token);
            const me = await API.get("/me", { headers: { Authorization: `Bearer ${token}` } });
            setUser(me.data);
            localStorage.setItem("user", JSON.stringify(me.data));
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || "Invalid code");
        }
    };

    const setupTOTP = async () => {
        const token = localStorage.getItem("token");
        const res = await API.get("/2fa/setup", { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
    };

    const verifyTOTPSetup = async (code) => {
        const token = localStorage.getItem("token");
        const res = await API.post("/2fa/verify", { code }, { headers: { Authorization: `Bearer ${token}` } });
        const me = await API.get("/me", { headers: { Authorization: `Bearer ${token}` } });
        setUser(me.data);
        localStorage.setItem("user", JSON.stringify(me.data));
        return res.data;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, signup, googleAuth, verify2FA, resendOTP, login2FA_totp, setupTOTP, verifyTOTPSetup }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
