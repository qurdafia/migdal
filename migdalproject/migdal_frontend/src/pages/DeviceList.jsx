import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Activity, Cpu, HardDrive, FileText, Calendar } from 'lucide-react';

const DeviceList = () => {
    const { category } = useParams(); // Get 'hypervisor' from URL
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Today
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                // Fetch ALL devices (Backend filtering is better for prod, but JS filter is fine for MVP)
                const res = await api.get('/core/devices/');
                
                // Filter by category (Case insensitive)
                const filtered = res.data.filter(d => d.type.toLowerCase() === category.toLowerCase());
                setDevices(filtered);
            } catch (err) {
                console.error("Failed to load devices");
            } finally {
                setLoading(false);
            }
        };
        fetchDevices();
    }, [category]);

    // --- HELPER: Extract Key Metrics based on Category ---
    const getMetrics = (device) => {
        const data = device.latest_snapshot || {};
        
        if (category === 'hypervisor') {
            return (
                <div style={styles.metricRow}>
                    <Badge label="CPU" value={data.cluster_cpu_usage_pct || data.cpu_usage || 'N/A'} unit="%" color="blue" />
                    <Badge label="RAM" value={data.cluster_memory_usage_pct || data.memory_usage || 'N/A'} unit="%" color="purple" />
                    <Badge label="Storage" value={data.datastore_usage_pct || 'N/A'} unit="%" color="orange" isCritical={data.datastore_usage_pct > 90} />
                </div>
            );
        }
        if (category === 'network') {
            return (
                <div style={styles.metricRow}>
                    <Badge label="CPU" value={data.cpu_1min || 'N/A'} unit="%" color="green" />
                    <Badge label="Status" value={data.interfaces ? `${data.interfaces.length} Ifaces` : 'OK'} color="gray" />
                </div>
            );
        }
        return <span style={{color: '#9ca3af'}}>No quick metrics available</span>;
    };

    const handleDownloadReport = async () => {
        try {
            // Trigger blob download
            const response = await api.get(`/reports/category/${category}/download/`, {
                params: { start_date: startDate, end_date: endDate },
                responseType: 'blob'
            });
            
            // Create hidden link to force download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${category}_report_${startDate}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert("Failed to generate report.");
        }
    };

    return (
        <div style={{ padding: '40px' }}>
            <button onClick={() => navigate('/devices')} style={styles.backBtn}><ArrowLeft size={16}/> Back to Categories</button>
            <h1 style={{ textTransform: 'capitalize', marginBottom: '20px' }}>{category} Devices</h1>

            {/* --- REPORT TOOLBAR --- */}
            <div style={styles.toolbar}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <Calendar size={18} color="#6b7280"/>
                    <span style={styles.label}>Report Range:</span>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        style={styles.dateInput}
                    />
                    <span>to</span>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        style={styles.dateInput}
                    />
                </div>
                
                <button onClick={handleDownloadReport} style={styles.reportBtn}>
                    <FileText size={16} /> Generate {category} Report
                </button>
            </div>
            {/* ---------------------- */}

            {loading ? <p>Loading...</p> : (
                <div style={styles.grid}>
                    {devices.length === 0 ? <p>No devices found in this category.</p> : devices.map(d => (
                        <div key={d.id} style={styles.card} onClick={() => navigate(`/dashboard?device=${d.id}`)}>
                            <div style={styles.cardHeader}>
                                <h3>{d.name}</h3>
                                <span style={styles.ip}>{d.ip_address}</span>
                            </div>
                            <hr style={styles.divider} />
                            
                            {/* DYNAMIC METRICS AREA */}
                            <div style={styles.metricsContainer}>
                                {getMetrics(d)}
                            </div>

                            <div style={styles.footer}>
                                <Activity size={14} color="#10b981" /> 
                                <span>Active</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Simple Badge Component for the metrics
const Badge = ({ label, value, unit = '', color, isCritical }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ 
            fontWeight: 'bold', 
            color: isCritical ? '#dc2626' : '#374151',
            fontSize: '1.1rem' 
        }}>
            {typeof value === 'number' ? Math.round(value) : value}{unit}
        </span>
    </div>
);

const styles = {
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: '5px', marginBottom: '20px', color: '#6b7280' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: '0.2s' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    ip: { fontSize: '0.85rem', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' },
    divider: { border: 'none', borderTop: '1px solid #f3f4f6', margin: '10px 0' },
    metricsContainer: { padding: '10px 0' },
    metricRow: { display: 'flex', justifyContent: 'space-around' },
    footer: { marginTop: '15px', fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' },
    toolbar: { backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    dateInput: { padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' },
    reportBtn: { backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' },
    label: { fontSize: '0.9rem', color: '#374151', fontWeight: '500' }
};

export default DeviceList;