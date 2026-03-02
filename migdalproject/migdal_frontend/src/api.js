import axios from 'axios';

// Point to your Django Backend
// const API_URL = 'http://127.0.0.1:8000/api';

const API_URL = '/api/';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: Check if we have a token in LocalStorage and attach it
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Token ${token}`;
    }
    return config;
});

export default api;
