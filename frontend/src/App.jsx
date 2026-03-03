import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import About from './pages/About';
import Home from './pages/Home';

import Dashboard from './pages/Dashboard';
import History from './pages/History';




function App() {
    return (
        <Router>
            <div className="app-container">
                <main className="main-content">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        <Route path="/" element={<Home />} />
                        <Route path="/dashboard" element={<Dashboard />} />

                        <Route path="/history" element={<History />} />

                        <Route path="/about" element={<About />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
