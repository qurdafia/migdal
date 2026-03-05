import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Bot, Key, MessageSquare, Globe, Server } from 'lucide-react';

const AISettings = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        provider: 'gemini',
        model_name: '',
        api_key: '',
        api_url: '', // <--- NEW STATE
        system_prompt: ''
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.get('/ai/config/');
            setFormData({
                provider: res.data.provider_type,
                model_name: res.data.model_name,
                api_key: res.data.api_key_masked,
                api_url: res.data.api_url || '', // <--- Load URL
                system_prompt: res.data.system_prompt
            });
        } catch (err) {
            console.error("Failed to load settings");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/ai/config/', {
                provider_type: formData.provider,
                model_name: formData.model_name,
                api_key: formData.api_key,
                api_url: formData.api_url, // <--- Send URL
                system_prompt: formData.system_prompt
            });
            alert("Settings Saved Successfully!");
            loadSettings(); 
        } catch (err) {
            alert("Failed to save settings.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                {/* <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
                    <ArrowLeft size={16} /> Back
                </button> */}
                <div>
                    {/* <h1 style={styles.title}><Bot size={24} /> AI Model Configuration</h1> */}
                    <h1 style={styles.title}>AI Model Configuration</h1>
                    <p style={styles.subtitle}>Configure LLM model and prompt.</p>
                </div>
            </div>

            <div style={styles.card}>
                <form onSubmit={handleSave} style={styles.form}>
                    
                    {/* PROVIDER SELECT */}
                    <div style={styles.gridRow}>
                        <div style={styles.section}>
                            <label style={styles.label}>Provider</label>
                            <select 
                                value={formData.provider}
                                onChange={e => setFormData({...formData, provider: e.target.value})}
                                style={styles.input}
                            >
                                <option value="gemini">Google Gemini</option>
                                <option value="openai">OpenAI (GPT)</option>
                                <option value="ollama">Ollama (Local)</option>
                            </select>
                        </div>

                        {/* MODEL NAME (Editable with Suggestions) */}
                        <div style={styles.section}>
                            <label style={styles.label}>Model Name</label>
                            <input 
                                list="model-suggestions"
                                value={formData.model_name}
                                onChange={e => setFormData({...formData, model_name: e.target.value})}
                                placeholder="e.g. gemini-1.5-flash"
                                style={styles.input}
                            />
                            {/* Suggestions List */}
                            <datalist id="model-suggestions">
                                <option value="gemini-1.5-flash" />
                                <option value="gemini-1.5-pro" />
                                <option value="gpt-4o" />
                                <option value="gpt-3.5-turbo" />
                                <option value="llama3" />
                                <option value="mistral" />
                            </datalist>
                        </div>
                    </div>

                    {/* API URL (New Field) */}
                    <div style={styles.section}>
                        <label style={styles.label}><Globe size={14}/> API Endpoint URL (Optional)</label>
                        <input 
                            type="text"
                            value={formData.api_url}
                            onChange={e => setFormData({...formData, api_url: e.target.value})}
                            placeholder="https://... (Leave empty for default cloud API)"
                            style={styles.input}
                        />
                        <small style={{color:'#6b7280'}}>Required for Ollama (e.g. http://localhost:11434) or Azure OpenAI.</small>
                    </div>

                    {/* API KEY */}
                    <div style={styles.section}>
                        <label style={styles.label}><Key size={14}/> API Key</label>
                        <input 
                            type="password"
                            value={formData.api_key}
                            onChange={e => setFormData({...formData, api_key: e.target.value})}
                            placeholder="Enter API Key"
                            style={styles.input}
                        />
                        <small style={{color:'#6b7280'}}>Leave strictly as '****' to keep existing key.</small>
                    </div>

                    {/* SYSTEM PROMPT */}
                    <div style={styles.section}>
                        <label style={styles.label}><MessageSquare size={14}/> System Prompt</label>
                        <textarea 
                            value={formData.system_prompt}
                            onChange={e => setFormData({...formData, system_prompt: e.target.value})}
                            rows={6}
                            style={{...styles.input, fontFamily: 'monospace'}}
                        />
                    </div>

                    <button type="submit" style={styles.saveBtn} disabled={loading}>
                        <Save size={16} /> {loading ? "Saving..." : "Save Configuration"}
                    </button>

                </form>
            </div>
        </div>
    );
};

const styles = {
    //container: { padding: '0px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
    container: { maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', margin: '0 0 5px 0' },
    subtitle: { color: '#6b7280', margin: 0, fontSize: '0.95rem' },
    // header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: '5px' },
    card: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    gridRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    section: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' },
    input: { padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '1rem' },
    saveBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '10px' }
};

export default AISettings;