import React, { useState, useEffect } from 'react';
import api from '../api';
import { Mail, Save, Server, Shield, Users, FileText, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const EmailConfig = () => {
    const [config, setConfig] = useState({
        smtp_server: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        use_tls: true,
        from_address: '',
        recipient_list: '',
        subject: '',
        message_body: '',
        is_active: false
    });
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await api.get('/core/email-config/');
            
            // Scrub the data: Convert any 'null' from Django into '' for React
            const sanitizedData = { ...res.data };
            Object.keys(sanitizedData).forEach(key => {
                if (sanitizedData[key] === null) {
                    sanitizedData[key] = '';
                }
            });

            setConfig(sanitizedData);
        } catch (err) {
            console.error("Failed to load email config", err);
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleToggleActive = () => {
        setConfig(prev => ({ ...prev, is_active: !prev.is_active }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/core/email-config/', config);
            setMessage({ type: 'success', text: 'Email configuration saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save configuration.' });
        }
        setSaving(false);
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading configuration...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    {/* <h1 style={styles.title}><Mail size={24} color="#4f46e5" /> Automated Email Configuration</h1> */}
                    <h1 style={styles.title}>Automated Email Configuration</h1>
                    <p style={styles.subtitle}>Configure the SMTP settings used to send Ansible post-run reports.</p>
                </div>
                
                {/* Master Active Toggle */}
                <div style={styles.activeToggle} onClick={handleToggleActive}>
                    <span style={{ fontWeight: 'bold', color: config.is_active ? '#16a34a' : '#6b7280' }}>
                        {config.is_active ? 'Automated Emails ON' : 'Automated Emails OFF'}
                    </span>
                    {config.is_active 
                        ? <ToggleRight size={32} color="#16a34a" /> 
                        : <ToggleLeft size={32} color="#9ca3af" />
                    }
                </div>
            </div>

            {message && (
                <div style={{...styles.alert, backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2', color: message.type === 'success' ? '#065f46' : '#991b1b'}}>
                    {message.type === 'success' && <CheckCircle size={18} />}
                    {message.text}
                </div>
            )}

            <div style={styles.grid}>
                {/* SMTP Server Settings Card */}
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}><Server size={18} /> SMTP Server Settings</h3>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>SMTP Server Address</label>
                        <input type="text" name="smtp_server" value={config.smtp_server} onChange={handleChange} style={styles.input} placeholder="smtp.office365.com" />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>SMTP Port</label>
                        <input type="number" name="smtp_port" value={config.smtp_port} onChange={handleChange} style={styles.input} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <input type="checkbox" name="use_tls" checked={config.use_tls} onChange={handleChange} id="tls" style={{ cursor: 'pointer' }} />
                        <label htmlFor="tls" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Use TLS Encryption</label>
                    </div>

                    <h3 style={styles.cardTitle}><Shield size={18} /> Credentials</h3>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>SMTP Username</label>
                        <input type="text" name="smtp_username" value={config.smtp_username} onChange={handleChange} style={styles.input} placeholder="alerts@domain.com" />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>SMTP Password / App Password</label>
                        <input type="password" name="smtp_password" value={config.smtp_password} onChange={handleChange} style={styles.input} placeholder="••••••••••••" />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Routing Card */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}><Users size={18} /> Routing</h3>
                        
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>From Address</label>
                            <input type="email" name="from_address" value={config.from_address} onChange={handleChange} style={styles.input} placeholder="migdal-alerts@domain.com" />
                        </div>
                        
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Recipient List (Comma Separated)</label>
                            <textarea name="recipient_list" value={config.recipient_list} onChange={handleChange} style={{...styles.input, minHeight: '60px'}} placeholder="admin@domain.com, noc@domain.com" />
                            <p style={styles.helpText}>Reports will be sent to all addresses listed above.</p>
                        </div>
                    </div>

                    {/* Template Card */}
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}><FileText size={18} /> Email Template</h3>
                        
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email Subject</label>
                            <input type="text" name="subject" value={config.subject} onChange={handleChange} style={styles.input} />
                        </div>
                        
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Message Body</label>
                            <textarea name="message_body" value={config.message_body} onChange={handleChange} style={{...styles.input, minHeight: '100px'}} />
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.footer}>
                <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
                    <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: { maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    // header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    title: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', margin: '0 0 5px 0' },
    subtitle: { color: '#6b7280', margin: 0, fontSize: '0.95rem' },
    activeToggle: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    cardTitle: { display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px', color: '#111827', fontSize: '1.1rem' },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '8px' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.95rem', boxSizing: 'border-box', fontFamily: 'inherit' },
    helpText: { fontSize: '0.75rem', color: '#6b7280', marginTop: '5px' },
    footer: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' },
    saveBtn: { backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)' },
    alert: { padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }
};

export default EmailConfig;