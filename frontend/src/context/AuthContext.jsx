import { createContext, useState, useContext, useEffect } from 'react';
  import axios from "axios";
const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        // Check localStorage for persistency
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });



  const API = axios.create({
    baseURL: "http://localhost:8000",
  });

 const login = async (email, password) => {
   try {
     const params = new URLSearchParams();
     params.append("username", email); // MUST BE username
     params.append("password", password);

     const response = await API.post("/login", params, {
       headers: {
         "Content-Type": "application/x-www-form-urlencoded",
       },
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
     throw new Error("Invalid username or password");
   }
 };

    const logout = () => {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token"); // IMPORTANT
    };

const signup = async (username, email, password) => {
  try {
    const response = await API.post("/signup", {
      username,
      email,
      password,
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
    throw new Error(error.response?.data?.detail || "Signup failed");
  }
};

    return (
        <AuthContext.Provider value={{ user, login, logout, signup }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
