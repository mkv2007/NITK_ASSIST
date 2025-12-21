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
        <div className="auth-card">
            <h2>{isLogin ? 'Login' : 'Signup'}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input type="email" placeholder="Email (@nitk.edu.in)" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary">{isLogin ? 'Login' : 'Signup'}</button>
            </form>
            <p style={{marginTop: '15px', fontSize: '14px'}}>
                {isLogin ? "New student? " : "Already have an account? "}
                <Link to={isLogin ? "/signup" : "/login"}>{isLogin ? "Create account" : "Login here"}</Link>
            </p>
        </div>
    );
}