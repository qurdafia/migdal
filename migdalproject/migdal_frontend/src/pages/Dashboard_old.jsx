import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Server, Activity, FileText, Download, Play, LogOut, Settings, X, ShieldCheck, Bot } from 'lucide-react';

// Simple color palette for dynamic lines

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];

const Dashboard = () => {
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [telemetry, setTelemetry] = useState([]);
    const [metrics, setMetrics] = useState([]); // <--- NEW: Store your config
    const [loading, setLoading] = useState(false);

    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [licenseInfo, setLicenseInfo] = useState(null);

    // AI State

    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    // 1. Load Devices on Start

    useEffect(() => {
        fetchDevices();
    }, []);



    // 2. Load Telemetry AND Metrics when Device Selected
    useEffect(() => {
        if (selectedDevice) {
            fetchTelemetry(selectedDevice.id);
            fetchMetrics(selectedDevice.id); // <--- NEW: Get the map
            setAnalysisResult(null);

        }

    }, [selectedDevice]);

    const handleLicenseClick = async () => {
        try {
            const res = await api.get('/accounts/status/');
            setLicenseInfo(res.data);
            setShowLicenseModal(true);

        } catch (err) {
            console.error("Failed to fetch license info");
            alert("Could not load license details.");
        }

    };

    const fetchDevices = async () => {
        try {
            const res = await api.get('/core/devices/');
            setDevices(res.data);
            if (res.data.length > 0) setSelectedDevice(res.data[0]);
        } catch (err) {
            console.error("Failed to load devices", err);
        }

    };

    const fetchTelemetry = async (id) => {
        setLoading(true);
        try {
            const res = await api.get(`/core/devices/${id}/telemetry/`);

            // Handle Paginated Response
            // DRF returns: { count: 50, results: [...] }
            const records = res.data;

            console.log(records);

            // --- CLEANING STEP ---

            // Iterate over every record and force metrics to be real Numbers

            const cleanData = records.map(record => {
                const newRecord = { ...record };
                // Scan all keys in the record

                Object.keys(newRecord).forEach(key => {
                    let val = newRecord[key];

                    // Skip the timestamp and non-metric text

                    if (key === 'timestamp' || key === 'hostname' || key === 'id') return;



                    // 1. If it's a string like "79%", remove the "%"

                    if (typeof val === 'string' && val.includes('%')) {

                        val = val.replace('%', '');

                    }



                    // 2. Convert to Number (float)

                    const parsed = parseFloat(val);

                   

                    // 3. Only update if it is a valid number

                    if (!isNaN(parsed)) {

                        newRecord[key] = parsed;

                    }

                });

                return newRecord;

            });

            // ---------------------



            setTelemetry(cleanData);

        } catch (err) {

            console.error("Failed to load data", err);

        } finally {

            setLoading(false);

        }

    };



    // <--- NEW FUNCTION: Fetch the definitions you created

    const fetchMetrics = async (id) => {

        try {

            const res = await api.get(`/core/devices/${id}/metrics/`);

            setMetrics(res.data);

        } catch (err) {

            console.error("Failed to load metrics config");

        }

    };



    const runAIAnalysis = async () => {

        if (!selectedDevice) return;

        setAnalyzing(true);

        setAnalysisResult(null);



        try {

            const res = await api.post(`/ai/analyze/${selectedDevice.id}/`);

            setAnalysisResult(res.data);

        } catch (err) {

            console.error("Analysis Failed", err);

            alert("AI Analysis Failed. Check console for details.");

        } finally {

            setAnalyzing(false);

        }

    };



    const downloadPDF = async () => {

        if (!analysisResult) return;

        try {

            const response = await api.get(`/reports/download/${analysisResult.report_id}/`, {

                responseType: 'blob',

            });

            const url = window.URL.createObjectURL(new Blob([response.data]));

            const link = document.createElement('a');

            link.href = url;

            link.setAttribute('download', `Report-${selectedDevice.name}.pdf`);

            document.body.appendChild(link);

            link.click();

            link.parentNode.removeChild(link);

        } catch (err) {

            console.error("Download failed", err);

        }

    };



    const logout = () => {

        localStorage.clear();

        window.location.href = '/';

    };



    return (

        <div style={styles.container}>

            {/* SIDEBAR */}

            <div style={styles.sidebar}>

                <div style={styles.brand}>

                    <Server size={24} /> Migdal

                </div>

               

                <div style={styles.menu}>

                    <div style={styles.menuLabel}>DEVICES</div>

                    {devices.map(d => (

                        <div

                            key={d.id}

                            style={{...styles.menuItem, ...(selectedDevice?.id === d.id ? styles.activeItem : {})}}

                            onClick={() => setSelectedDevice(d)}

                        >

                            <div style={styles.statusDot}></div>

                            {d.name}

                        </div>

                    ))}



                    <div style={styles.menuLabel}>ADMINISTRATION</div>

                    <div style={styles.menuItem} onClick={() => navigate('/inventory')}>

                        <Server size={16} /> Inventory Manager

                    </div>

                    <div style={styles.menuItem} onClick={() => navigate('/ai-settings')}>

                        <Bot size={16} /> AI Configuration

                    </div>

                </div>



                <button onClick={logout} style={styles.logoutBtn}>

                    <LogOut size={16} /> Logout

                </button>

            </div>

                   

            {/* MAIN CONTENT */}

            <div style={styles.main}>

                {selectedDevice ? (

                    <>

                        <div style={styles.topBar}>

                            <h1>{selectedDevice.name}</h1>

                            <div

                                onClick={handleLicenseClick}

                                style={{...styles.badgeGreen, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}

                            >

                                <ShieldCheck size={12} /> Active License

                            </div>

                        </div>



                        {/* PAGINATION CONTROLS */}

                        <div style={{display:'flex', justifyContent:'center', gap:'10px', marginTop:'20px'}}>

                            <button

                                disabled={historyPage === 1}

                                onClick={() => {

                                    setHistoryPage(p => p - 1);

                                    fetchTelemetry(selectedDevice, historyPage - 1);

                                }}

                            >

                                Previous

                            </button>

                           

                            <span>Page {historyPage} of {totalPages}</span>

                           

                            <button

                                disabled={historyPage === totalPages}

                                onClick={() => {

                                    setHistoryPage(p => p + 1);

                                    fetchTelemetry(selectedDevice, historyPage + 1);

                                }}

                            >

                                Next

                            </button>

                        </div>



                        {/* CHARTS ROW */}

                        <div style={styles.chartCard}>

                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>

                                <h3><Activity size={18} /> Live Telemetry</h3>

                                <button

                                    onClick={() => navigate(`/inventory/metrics/${selectedDevice.id}`)}

                                    style={{border:'none', background:'none', color:'#2563eb', cursor:'pointer', fontSize:'0.8rem'}}

                                >

                                    Configure Graph

                                </button>

                            </div>



                            <div style={{ width: '100%', height: 300 }}>

                                <ResponsiveContainer>

                                    <LineChart data={telemetry}>

                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />

                                        <XAxis dataKey="timestamp" />

                                        <YAxis />

                                        <Tooltip />

                                        <Legend />

                                       

                                        {/* DYNAMIC LINES: Render a Line for each configured Metric */}

                                        {metrics.length > 0 ? (

                                            metrics.map((m, index) => (

                                                <Line

                                                    key={m.id}

                                                    type="monotone"

                                                    dataKey={m.json_path} // This matches the key in the JSON

                                                    name={m.label}        // This shows the readable name

                                                    stroke={COLORS[index % COLORS.length]} // Auto-assign color

                                                    strokeWidth={2}

                                                    dot={true}

                                                />

                                            ))

                                        ) : (

                                            // Fallback text if no metrics configured

                                            <text x="50%" y="50%" textAnchor="middle" fill="#999">

                                                No metrics configured. Click 'Configure Graph' to add some.

                                            </text>

                                        )}

                                       

                                    </LineChart>

                                </ResponsiveContainer>

                            </div>

                        </div>



                        {/* AI ACTION ROW */}

                        <div style={styles.aiCard}>

                            <div style={styles.aiHeader}>

                                <h3><FileText size={18} /> AI Analysis Engine</h3>

                                <button onClick={runAIAnalysis} disabled={analyzing} style={styles.aiBtn}>

                                    {analyzing ? "Analyzing..." : <><Play size={16} /> Run Analysis</>}

                                </button>

                            </div>

                           

                            <p style={{color: '#666', fontSize: '0.9rem', marginBottom: '15px'}}>

                                Uses Google Gemini to detect anomalies in recent telemetry.

                            </p>



                            {analysisResult && (

                                <div style={{

                                    marginTop: '15px',

                                    padding: '15px',

                                    backgroundColor: analysisResult.anomaly_detected ? '#fef2f2' : '#f0fdf4',

                                    border: analysisResult.anomaly_detected ? '1px solid #fca5a5' : '1px solid #86efac',

                                    borderRadius: '8px'

                                }}>

                                    <h4 style={{

                                        color: analysisResult.anomaly_detected ? '#b91c1c' : '#15803d',

                                        margin: '0 0 10px 0',

                                        display: 'flex', alignItems: 'center', gap: '8px'

                                    }}>

                                        {analysisResult.anomaly_detected ? "⚠️ Anomaly Detected" : "✅ System Healthy"}

                                    </h4>

                                    <p style={{fontSize: '0.9rem', color: '#374151', marginBottom: '15px'}}>

                                        {analysisResult.summary}

                                    </p>

                                   

                                    <button onClick={downloadPDF} style={{

                                        backgroundColor: 'white', border: '1px solid #d1d5db',

                                        padding: '8px 15px', borderRadius: '6px', cursor: 'pointer',

                                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'

                                    }}>

                                        <Download size={14} /> Download Official PDF Report

                                    </button>

                                </div>

                            )}

                        </div>

                    </>

                ) : (

                    <div style={styles.emptyState}>Select a device to view data</div>

                )}

            </div>



            {/* LICENSE MODAL */}

            {showLicenseModal && licenseInfo && (

                <div style={styles.modalOverlay}>

                    <div style={styles.modal}>

                        <div style={styles.modalHeader}>

                            <h2>License Details</h2>

                            <button onClick={() => setShowLicenseModal(false)} style={styles.closeBtn}>

                                <X size={20} />

                            </button>

                        </div>

                       

                        <div style={styles.modalBody}>

                            <div style={styles.infoRow}>

                                <span style={styles.label}>Organization:</span>

                                <strong>{licenseInfo.organization}</strong>

                            </div>

                            <div style={styles.infoRow}>

                                <span style={styles.label}>Status:</span>

                                <span style={{color: '#16a34a', fontWeight: 'bold'}}>● {licenseInfo.status}</span>

                            </div>

                            <div style={styles.infoRow}>

                                <span style={styles.label}>Expires:</span>

                                <span>{new Date(licenseInfo.expiry_date).toLocaleDateString()}</span>

                            </div>

                           

                            <hr style={styles.divider} />

                           

                            <div style={styles.usageContainer}>

                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px', fontSize:'0.9rem'}}>

                                    <span>Node Usage</span>

                                    <span>{licenseInfo.used_nodes} / {licenseInfo.max_nodes}</span>

                                </div>

                                {/* Progress Bar */}

                                <div style={{width: '100%', height: '10px', backgroundColor: '#e5e7eb', borderRadius: '5px', overflow:'hidden'}}>

                                    <div style={{

                                        width: `${(licenseInfo.used_nodes / licenseInfo.max_nodes) * 100}%`,

                                        height: '100%',

                                        backgroundColor: licenseInfo.used_nodes >= licenseInfo.max_nodes ? '#dc2626' : '#2563eb'

                                    }}></div>

                                </div>

                                <p style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '5px'}}>

                                    {licenseInfo.max_nodes - licenseInfo.used_nodes} licenses remaining.

                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

};



// --- STYLES ---

const styles = {

    container: { display: 'flex', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Inter, sans-serif' },

    sidebar: { width: '250px', backgroundColor: '#111827', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' },

    brand: { fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '40px' },

    menu: { flex: 1 },

    menuLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '10px', fontWeight: 'bold', marginTop: '20px' }, // Added marginTop for spacing

    menuItem: { padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#d1d5db', marginBottom: '5px' },

    activeItem: { backgroundColor: '#374151', color: 'white' },

    statusDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' },

    logoutBtn: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', padding: '10px' },

   

    main: { flex: 1, padding: '30px', overflowY: 'auto' },

    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },

    badges: { display: 'flex', gap: '10px' },

    badge: { backgroundColor: '#e5e7eb', padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem', color: '#374151' },

    badgeGreen: { backgroundColor: '#d1fae5', padding: '5px 10px', borderRadius: '15px', fontSize: '0.8rem', color: '#065f46' },

   

    chartCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' },

    aiCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '4px solid #8b5cf6' },

    aiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },

    aiBtn: { backgroundColor: '#8b5cf6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: '600' },

    emptyState: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },

    modal: { backgroundColor: 'white', padding: '0', borderRadius: '12px', width: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },

    modalHeader: { padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },

    modalBody: { padding: '20px' },

    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },

    infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '0.95rem' },

    label: { color: '#6b7280' },

    divider: { border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' },

    usageContainer: { backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }



};



export default Dashboard;

