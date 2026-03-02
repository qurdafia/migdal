import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2, Settings } from 'lucide-react';

const MetricConfig = () => {
    const { deviceId } = useParams(); // Get ID from URL
    const navigate = useNavigate();
    
    const [metrics, setMetrics] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // New Metric Form
    const [newMetric, setNewMetric] = useState({ label: '', json_path: '', unit: '', threshold_warning: '', threshold_critical: '' });

    useEffect(() => {
        fetchMetrics();
    }, [deviceId]);

    const fetchMetrics = async () => {
        try {
            const res = await api.get(`/core/devices/${deviceId}/metrics/`);
            setMetrics(res.data);
        } catch (err) {
            console.error("Failed to load metrics");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (metricData) => {
        try {
            await api.post(`/core/devices/${deviceId}/metrics/`, metricData);
            fetchMetrics();
            setNewMetric({ label: '', json_path: '', unit: '', threshold_warning: '', threshold_critical: '' }); // Reset form
        } catch (err) {
            alert("Failed to save metric");
        }
    };

    const handleDelete = async (metricId) => {
        if(!confirm("Delete this mapping?")) return;
        try {
            await api.delete(`/core/devices/${deviceId}/metrics/${metricId}/`);
            fetchMetrics();
        } catch (err) {
            alert("Failed to delete");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate('/inventory')} style={styles.backBtn}>
                    <ArrowLeft size={16} /> Back
                </button>
                <h1><Settings size={24} /> Configure Metrics</h1>
            </div>

            <p style={styles.hint}>
                Map the JSON keys sent by Ansible to readable labels and set alert thresholds.
            </p>

            {/* LIST EXISTING METRICS */}
            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th>Label</th>
                            <th>JSON Path</th>
                            <th>Unit</th>
                            <th>Warning (&gt;)</th>
                            <th>Critical (&gt;)</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.map(m => (
                            <tr key={m.id}>
                                <td>{m.label}</td>
                                <td><code style={styles.code}>{m.json_path}</code></td>
                                <td>{m.unit}</td>
                                <td style={{color: '#eab308'}}>{m.threshold_warning || '-'}</td>
                                <td style={{color: '#dc2626'}}>{m.threshold_critical || '-'}</td>
                                <td>
                                    <button onClick={() => handleDelete(m.id)} style={styles.iconBtn}>
                                        <Trash2 size={16} color="#ef4444" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {metrics.length === 0 && (
                            <tr><td colSpan="6" style={{textAlign:'center', padding:'20px', color:'#999'}}>No metrics configured yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ADD NEW FORM */}
            <div style={styles.formCard}>
                <h3>Add New Metric</h3>
                <div style={styles.formGrid}>
                    <div>
                        <label>Label Name</label>
                        <input 
                            placeholder="e.g. CPU Load" 
                            value={newMetric.label}
                            onChange={e => setNewMetric({...newMetric, label: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div>
                        <label>JSON Key (Path)</label>
                        <input 
                            placeholder="e.g. cpu_usage" 
                            value={newMetric.json_path}
                            onChange={e => setNewMetric({...newMetric, json_path: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div>
                        <label>Unit</label>
                        <input 
                            placeholder="e.g. %" 
                            value={newMetric.unit}
                            onChange={e => setNewMetric({...newMetric, unit: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div>
                        <label>Warning Limit</label>
                        <input 
                            type="number" placeholder="80" 
                            value={newMetric.threshold_warning}
                            onChange={e => setNewMetric({...newMetric, threshold_warning: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div>
                        <label>Critical Limit</label>
                        <input 
                            type="number" placeholder="95" 
                            value={newMetric.threshold_critical}
                            onChange={e => setNewMetric({...newMetric, threshold_critical: e.target.value})}
                            style={styles.input}
                        />
                    </div>
                    <div style={{display:'flex', alignItems:'flex-end'}}>
                        <button onClick={() => handleSave(newMetric)} style={styles.saveBtn}>
                            <Plus size={16} /> Add Metric
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
    header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#666' },
    hint: { color: '#666', marginBottom: '20px', fontSize: '14px' },
    
    tableCard: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: '30px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    code: { backgroundColor: '#f3f4f6', padding: '2px 5px', borderRadius: '4px', fontFamily: 'monospace' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer' },

    formCard: { backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
    input: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', marginTop: '5px' },
    saveBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', height: '38px' }
};

export default MetricConfig;