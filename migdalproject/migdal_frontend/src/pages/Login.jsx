import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Server } from 'lucide-react'; // Icons

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        
        try {
            // 1. Send Credentials to Django
            const response = await api.post('/accounts/login/', {
                username,
                password
            });

            // 2. Save the Token
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('org_name', response.data.organization);
            
            // 3. Go to Dashboard
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            setError('Invalid Credentials or Server Error');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <Server size={48} color="#2563eb" />
                    <h1 style={styles.title}>Migdal Platform</h1>
                    <p style={styles.subtitle}>Enterprise Infrastructure Intelligence</p>
                </div>

                <form onSubmit={handleLogin} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <User size={20} color="#666" style={styles.icon} />
                        <input 
                            type="text" 
                            placeholder="Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <Lock size={20} color="#666" style={styles.icon} />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                        />
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <button type="submit" style={styles.button}>
                        Sign In
                    </button>
                </form>
                
                <div style={styles.footer}>
                    Protected System • Authorized Access Only
                </div>
            </div>
        </div>
    );
};

// Simple CSS-in-JS for a quick professional look
const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        fontFamily: 'Inter, sans-serif'
    },
    card: {
        backgroundColor: 'white',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
    },
    header: { marginBottom: '2rem' },
    title: { fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: '10px 0 5px 0' },
    subtitle: { color: '#6b7280', fontSize: '0.875rem' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    inputGroup: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        padding: '0.75rem',
        backgroundColor: '#f9fafb'
    },
    icon: { marginRight: '10px' },
    input: {
        border: 'none',
        outline: 'none',
        background: 'transparent',
        width: '100%',
        fontSize: '1rem'
    },
    button: {
        backgroundColor: '#2563eb',
        color: 'white',
        padding: '0.75rem',
        borderRadius: '6px',
        fontWeight: '600',
        cursor: 'pointer',
        border: 'none',
        marginTop: '10px',
        transition: 'background-color 0.2s'
    },
    error: { color: '#dc2626', fontSize: '0.875rem', textAlign: 'left' },
    footer: { marginTop: '2rem', fontSize: '0.75rem', color: '#9ca3af' }
};

export default Login;