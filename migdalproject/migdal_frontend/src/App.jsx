import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Note: Inventory and AISettings are now rendered INSIDE Dashboard based on the URL
// so we don't need to import them here directly unless you have standalone pages.

// Import Components
import ProtectedRoute from './components/ProtectedRoute';
import AutomationConsole from './pages/AutomationConsole';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/login" element={<Login />} />

        {/* --- PROTECTED ROUTES --- */}
        {/* 1. Root: Redirect to the default dashboard view */}
        <Route 
          path="/" 
          element={<Navigate to="/infrastructure/hypervisor" replace />} 
        />

        {/* 2. Dashboard & Infrastructure (Handles Sidebar + Content) */}
        {/* This single route handles:
            - /infrastructure/hypervisor
            - /infrastructure/server
            - /infrastructure/inventory  (Dashboard renders Inventory.jsx)
            - /infrastructure/ai-settings (Dashboard renders AISettings.jsx)
        */}
        <Route 
            path="/infrastructure/:category/:deviceId?" 
            element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } 
        />

        {/* 3. Direct Dashboard Access (Redirects to default infra) */}
        <Route 
            path="/dashboard" 
            element={<Navigate to="/infrastructure/hypervisor" replace />} 
        />

        {/* --- CATCH ALL --- */}
        {/* Any unknown route redirects to Login or Root */}
        <Route path="*" element={<Navigate to="/" replace />} />

        <Route path="/automation" element={<AutomationConsole />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;