import axios from 'axios';

// Create an axios instance with your Node.js backend URL
const api = axios.create({
    baseURL: 'http://localhost:5000',
});

// Request Interceptor: Automatically add JWT to the headers of every call
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;