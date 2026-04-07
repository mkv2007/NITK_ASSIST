import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Auth from './pages/Auth';
import Chat from './components/Chat';
import Admin from './pages/Admin';
import Home from './pages/Home';
import './App.css';

const ProtectedRoute = ({ children, roleRequired }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token) return <Navigate to="/login" />;
    if (roleRequired && userRole !== roleRequired) return <Navigate to="/chat" />;
    
    return (
        <div className="app-container">
            <nav className="navbar">
                <div className="nav-container">
                    <div className="nav-brand text-gradient">
                        NITK Assist
                    </div>
                    <div className="nav-links">
                        <Link to="/home" className="nav-link">Events</Link>
                        <Link to="/chat" className="nav-link">AI Core</Link>
                        {userRole === 'admin' && (
                            <Link to="/admin" className="nav-link">System Admin</Link>
                        )}
                        <button className="btn-logout" onClick={() => { localStorage.clear(); window.location.href='/login'; }}>
                            Disconnect
                        </button>
                    </div>
                </div>
            </nav>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default function App() {
    return (
        <GoogleOAuthProvider clientId="748843608972-7kau66l3kvas9pqvq3upc9s6cqbm3s9i.apps.googleusercontent.com">
            <Router>
                <Routes>
                    <Route path="/login" element={<Auth isLogin={true} />} />
                    <Route path="/signup" element={<Auth isLogin={false} />} />
                    <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                    <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute roleRequired="admin"><Admin /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/home" />} />
                </Routes>
            </Router>
        </GoogleOAuthProvider>
    );
}