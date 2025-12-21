import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Chat from './components/Chat';
import Admin from './pages/Admin';
import './App.css';

const ProtectedRoute = ({ children, roleRequired }) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    if (!token) return <Navigate to="/login" />;
    if (roleRequired && userRole !== roleRequired) return <Navigate to="/chat" />;
    
    return (
        <div className="container">
            <nav className="navbar">
                <h1 style={{color: '#003366'}}>NITK Assist</h1>
                <button className="btn-logout" onClick={() => { localStorage.clear(); window.location.href='/login'; }}>
                    Logout
                </button>
            </nav>
            {children}
        </div>
    );
};

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Auth isLogin={true} />} />
                <Route path="/signup" element={<Auth isLogin={false} />} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute roleRequired="admin"><Admin /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        </Router>
    );
}