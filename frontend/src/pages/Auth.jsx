import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function Auth({ isLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const res = await api.post(endpoint, { email, password });
            
            if (isLogin) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('role', res.data.role);
                navigate(res.data.role === 'admin' ? '/admin' : '/chat');
            } else {
                alert("Account created! Log in now.");
                navigate('/login');
            }
        } catch (err) {
            alert(err.response?.data?.message || "Auth error");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-blob-1"></div>
            <div className="auth-blob-2"></div>
            <div className="auth-card glass-panel">
                <h2 className="auth-title text-gradient">{isLogin ? 'Welcome Back' : 'Join NITK Assist'}</h2>
                <p className="auth-subtitle">{isLogin ? 'Sign in to access your customized academic hub.' : 'Create an account to streamline your campus life.'}</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input className="form-input" type="email" placeholder="student@nitk.edu.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary">{isLogin ? 'Access System' : 'Create Account'}</button>
                </form>
                
                <div className="auth-divider">OR</div>
                
                <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <Link to={isLogin ? "/signup" : "/login"} style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>
                        {isLogin ? "Sign up here" : "Login instead"}
                    </Link>
                </p>
            </div>
        </div>
    );
}