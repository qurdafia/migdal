import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    // FIX: Match the key used in Login.jsx ('token')
    const token = localStorage.getItem('token'); 

    if (!token) {
        // If no token, redirect to Login
        return <Navigate to="/login" replace />;
    }

    // If token exists, allow access
    return children;
};

export default ProtectedRoute;