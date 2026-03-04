import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import {
    Server, Activity, FileText, Download, Play, LogOut, Table, X,
    ShieldCheck, Bot, Network, Database, HardDrive, ArrowLeft, Calendar,
    AlertTriangle, CheckCircle, XCircle, Mail
} from 'lucide-react';

import EmailConfig from './EmailConfig';
import Inventory from './Inventory';
import AISettings from './AISettings';
import ReportingConsole from './ReportingConsole';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2'];

const Dashboard = () => {
    const navigate = useNavigate();
    const { category, deviceId } = useParams();

    // ==========================================
    // SHARED STATE
    // ==========================================
    const [loading, setLoading] = useState(false);
    const [devices, setDevices] = useState([]);
    const [listPage, setListPage] = useState(1);
    const [listTotalPages, setListTotalPages] = useState(1);
    // const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    // const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Detail View State
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [telemetry, setTelemetry] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('all'); // NEW: Dropdown State
    const [graphPage, setGraphPage] = useState(1);
    const [graphTotalPages, setGraphTotalPages] = useState(1);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [licenseInfo, setLicenseInfo] = useState(null);

    // useEffect(() => {
    //     if (category && category !== 'inventory' && category !== 'ai-settings') {
    //         loadInfrastructureList();
    //     }
    // }, [category, deviceId, listPage]);

    useEffect(() => {
        const nonDeviceCategories = ['inventory', 'ai-settings', 'email-settings', 'reporting'];
        if (category && !nonDeviceCategories.includes(category)) {
            loadInfrastructureList();
        }
    }, [category, deviceId, listPage]);

    // ==========================================
    // DATA FETCHERS
    // ==========================================
    const loadInfrastructureList = async () => {
        setLoading(true);
        try {
            const res = await api.get('/core/devices/', { params: { page: listPage, type: category } });

            const allResults = res.data.results || res.data;
            const filtered = Array.isArray(allResults)
                ? allResults.filter(d => d.type.toLowerCase() === category.toLowerCase())
                : [];

            setDevices(filtered);
            setListTotalPages(Math.ceil((res.data.count || filtered.length) / 10) || 1);

            if (deviceId) {
                let found = filtered.find(d => d.id === parseInt(deviceId) || d.id === deviceId);
                if (!found) {
                     try { const direct = await api.get(`/core/devices/${deviceId}/`); found = direct.data; } catch(e){}
                }
                if (found) {
                    setSelectedDevice(found);
                    fetchMetrics(found.id);
                    fetchTelemetry(found.id, 1);
                }
            } else {
                setSelectedDevice(null);
            }
        } catch (err) { console.error("Infra Load Failed"); }
        setLoading(false);
    };

    const fetchMetrics = async (id) => {
        try {
            const res = await api.get(`/core/devices/${id}/metrics/`);
            setMetrics(Array.isArray(res.data) ? res.data : []);
        } catch (e) { setMetrics([]); }
    };

    const fetchTelemetry = async (id, page) => {
        try {
            const res = await api.get(`/core/devices/${id}/telemetry/?page=${page}`);
            const rawRecords = res.data.results || [];

            const flatData = rawRecords.map(r => {
                const parsedPayload = {};
                for (let key in r.payload) {
                    let val = r.payload[key];

                    // Backwards compatibility to clean up old string metrics
                    if (typeof val === 'string') {
                        // Strip out any letters, %, spaces, or slashes (e.g. "0.17 ms" -> "0.17")
                        const stripped = val.replace(/[a-zA-Z%\s/]/g, '').trim();
                        // If it's a valid number (and not an IP address with multiple dots), convert it
                        if (stripped !== '' && !isNaN(Number(stripped))) {
                            val = Number(stripped);
                        }
                    }
                    parsedPayload[key] = val;
                }

                return {
                    id: r.id,
                    timestamp: new Date(r.timestamp).toLocaleTimeString(),
                    ...parsedPayload
                };
            });

            // ⚠️ REMOVED THE AUTO-GENERATION BLOCK HERE ⚠️
            // The frontend will now STRICTLY wait for fetchMetrics to populate the dropdown and graph.

            // Important: reverse the data so it reads left-to-right (oldest to newest) on the graph
            setTelemetry(flatData.reverse());
            setGraphTotalPages(Math.ceil((res.data.count || 0) / 10) || 1);
        } catch (e) { console.error("Telemetry error", e); }
    };

    // const fetchTelemetry = async (id, page, currentMetrics = metrics) => {
    //     try {
    //         const res = await api.get(`/core/devices/${id}/telemetry/?page=${page}`);
    //         const rawRecords = res.data.results || [];

    //         const flatData = rawRecords.map(r => {
    //             const parsedPayload = {};
    //             for (let key in r.payload) {
    //                 let val = r.payload[key];

    //                 // Backwards compatibility to clean up old string metrics
    //                 if (typeof val === 'string') {
    //                     // Strip out any letters, %, spaces, or slashes (e.g. "0.17 ms" -> "0.17")
    //                     const stripped = val.replace(/[a-zA-Z%\s/]/g, '').trim();
    //                     // If it's a valid number (and not an IP address with multiple dots), convert it
    //                     if (stripped !== '' && !isNaN(Number(stripped))) {
    //                         val = Number(stripped);
    //                     }
    //                 }
    //                 parsedPayload[key] = val;
    //             }

    //             return {
    //                 id: r.id,
    //                 timestamp: new Date(r.timestamp).toLocaleTimeString(),
    //                 ...parsedPayload
    //             };
    //         });

    //         if (flatData.length > 0 && (!currentMetrics || currentMetrics.length === 0)) {
    //             // Find all keys that are numbers
    //             const auto = Object.keys(flatData[0])
    //                 .filter(k => !['id','timestamp','source'].includes(k) && typeof flatData[0][k] === 'number')
    //                 .map((k, i) => ({
    //                     id: i, json_path: k, label: k.toUpperCase(), color: COLORS[i % COLORS.length]
    //                 }));
    //             setMetrics(auto);
    //         }

    //         // Important: reverse the data so it reads left-to-right (oldest to newest) on the graph
    //         setTelemetry(flatData.reverse());
    //         setGraphTotalPages(Math.ceil((res.data.count || 0) / 10) || 1);
    //     } catch (e) { console.error("Telemetry error", e); }
    // };

    // ==========================================
    // HEALTH LOGIC ENGINE
    // ==========================================
    const calculateHealth = (device) => {
        // 1. Check Offline
        if (device.status !== 'active') {
            return { label: 'Offline', color: '#9ca3af', icon: <XCircle size={12}/> };
        }

        // 2. Check No Data
        const snap = device.latest_snapshot || {};
        if (Object.keys(snap).length === 0) {
            return { label: 'No Data', color: '#9ca3af', icon: <Activity size={12}/> };
        }

        // 3. Analyze Metrics (Defaults: Critical > 90%, Warning > 75%)
        const cpu = snap.cpu_1min || snap.cluster_cpu_usage_pct || snap.cpu_usage || snap.cpu_load || 0;
        const mem = snap.memory_usage || snap.ram_usage || 0;

        if (cpu > 90 || mem > 90) {
            return { label: 'Critical', color: '#dc2626', icon: <AlertTriangle size={12}/> };
        }
        if (cpu > 75 || mem > 75) {
            return { label: 'Warning', color: '#ea580c', icon: <AlertTriangle size={12}/> };
        }

        return { label: 'Healthy', color: '#16a34a', icon: <CheckCircle size={12}/> };
    };

    // ==========================================
    // ACTION HANDLERS
    // ==========================================
    const handleLicenseClick = async () => {
        try { const res = await api.get('/accounts/status/'); setLicenseInfo(res.data); setShowLicenseModal(true); } catch(e) {}
    };

    const handleReportDownload = async (type) => {
        const ext = type === 'pdf' ? 'pdf' : 'csv';
        const endpoint = type === 'pdf' ? 'download' : 'csv';
        try {
            const res = await api.get(`/reports/category/${category}/${endpoint}/`, {
                params: { start_date: startDate, end_date: endDate },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${category}_Report.${ext}`);
            document.body.appendChild(link);
            link.click();
        } catch (e) { alert("Report failed"); }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const runAI = async () => {
        setAnalyzing(true);
        try { const res = await api.post(`/ai/analyze/${selectedDevice.id}/`); setAnalysisResult(res.data); } catch (e) { alert("AI Failed"); }
        setAnalyzing(false);
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
        } catch (err) { console.error("Download failed", err); }
    };

    // ==========================================
    // RENDERERS
    // ==========================================
    const renderSidebar = () => (
        <div style={styles.sidebar}>
            <div style={styles.brand}><Server size={24} /> Migdal</div>
            <div style={styles.menu}>
                <div style={styles.menuLabel}>INFRASTRUCTURE</div>
                {['hypervisor', 'network', 'storage', 'server'].map(cat => (
                    <div key={cat} onClick={() => navigate(`/infrastructure/${cat}`)}
                        style={{...styles.menuItem, backgroundColor: category === cat ? '#374151' : 'transparent', color: category === cat ? 'white' : '#d1d5db'}}>
                        {cat === 'hypervisor' && <Server size={18}/>}
                        {cat === 'network' && <Network size={18}/>}
                        {cat === 'storage' && <HardDrive size={18}/>}
                        {cat === 'server' && <Database size={18}/>}
                        <span style={{textTransform:'capitalize'}}>{cat}s</span>
                    </div>
                ))}
                <div style={styles.menuLabel}>MANAGEMENT</div>
                <div style={{...styles.menuItem, backgroundColor: category === 'inventory' ? '#374151' : 'transparent', color: category === 'inventory' ? 'white' : '#d1d5db'}}
                     onClick={() => navigate('/infrastructure/inventory')}>
                    <Table size={18}/> Inventory
                </div>
                <div style={{...styles.menuItem, backgroundColor: category === 'ai-settings' ? '#374151' : 'transparent', color: category === 'ai-settings' ? 'white' : '#d1d5db'}}
                     onClick={() => navigate('/infrastructure/ai-settings')}>
                    <Bot size={18}/> AI Config
                </div>
                <div style={{...styles.menuItem, backgroundColor: category === 'email-settings' ? '#374151' : 'transparent', color: category === 'email-settings' ? 'white' : '#d1d5db'}}
                     onClick={() => navigate('/infrastructure/email-settings')}>
                    <Mail size={18}/> Email Config
                </div>
                <div style={{...styles.menuItem, backgroundColor: category === 'reporting' ? '#374151' : 'transparent', color: category === 'reporting' ? 'white' : '#d1d5db'}}
                    onClick={() => navigate('/infrastructure/reporting')}>
                    <Calendar size={18}/> Reporting
                </div>
                <div style={{...styles.menuItem}}>
                    <div onClick={handleLicenseClick} style={{...styles.licenseBadge, cursor:'pointer'}}><ShieldCheck size={14}/> Licensed</div>
                </div>
            </div>
            <div style={styles.logout} onClick={handleLogout}>
                <LogOut size={16}/> Logout
            </div>
        </div>
    );

    const renderInfraList = () => (
        <>
            <div style={styles.topBar}>
                <h1 style={{textTransform:'capitalize'}}>{category} Fleet</h1>
                <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={() => handleReportDownload('pdf')} style={styles.btnPrimary}><FileText size={14}/> Live PDF</button>
                    <button onClick={() => handleReportDownload('csv')} style={styles.btnGreen}><Table size={14}/> Live CSV</button>
                </div>
            </div>
            {loading ? <p>Loading...</p> : (
                <div style={styles.grid}>
                    {devices.map(d => {
                        const health = calculateHealth(d);

                        return (
                            <div key={d.id} style={styles.card} onClick={() => navigate(`/infrastructure/${category}/${d.id}`)}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                    <strong>{d.name}</strong>
                                    <span style={styles.ipBadge}>{d.ip_address || d.host_ip}</span>
                                </div>
                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', color:'#6b7280'}}>
                                    <span>
                                        CPU: {
                                            d.latest_snapshot?.cpu_1min ||
                                            d.latest_snapshot?.cluster_cpu_usage_pct ||
                                            d.latest_snapshot?.cpu_usage ||
                                            d.latest_snapshot?.cpu_load ||
                                            'N/A'
                                        }%
                                    </span>
                                    <span style={{color: health.color, display:'flex', alignItems:'center', gap:'4px'}}>
                                        {health.icon} {health.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <div style={styles.pagination}>
                <button disabled={listPage===1} onClick={()=>setListPage(p=>p-1)}>Prev</button>
                <span>Page {listPage} of {listTotalPages}</span>
                <button disabled={listPage===listTotalPages} onClick={()=>setListPage(p=>p+1)}>Next</button>
            </div>
        </>
    );

    const renderInfraDetail = () => (
        <>
            <button onClick={() => navigate(`/infrastructure/${category}`)} style={styles.backBtn}><ArrowLeft size={16}/> Back</button>
            <div style={styles.topBar}>
                <h1>{selectedDevice?.name}</h1>
                <div style={styles.badges}>
                    <span style={styles.ipBadge}>{selectedDevice?.ip_address || selectedDevice?.host_ip}</span>
                </div>
            </div>
            <div style={styles.chartCard}>
                
                {/* --- NEW HEADER WITH DROPDOWN SELECTOR --- */}
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems: 'center'}}>
                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                        <h3 style={{margin: 0}}><Activity size={18}/> Live Telemetry</h3>
                        <select 
                            value={selectedMetric} 
                            onChange={(e) => setSelectedMetric(e.target.value)}
                            style={styles.metricSelect}
                        >
                            <option value="all">Show All Metrics</option>
                            {metrics.map(m => (
                                <option key={m.json_path} value={m.json_path}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{display:'flex', gap:'10px'}}>
                        <button disabled={graphPage===graphTotalPages} onClick={()=>{setGraphPage(p=>p+1); fetchTelemetry(selectedDevice.id, graphPage+1)}}>← Older</button>
                        <button disabled={graphPage===1} onClick={()=>{setGraphPage(p=>p-1); fetchTelemetry(selectedDevice.id, graphPage-1)}}>Newer →</button>
                    </div>
                </div>

                <div style={{width:'100%', height:300}}>
                    <ResponsiveContainer>
                        <LineChart data={telemetry} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis
                                dataKey="timestamp"
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(label) => {
                                    const date = new Date(label);
                                    return isNaN(date.getTime()) ? label : date.toLocaleString();
                                }}
                            />
                            <Legend />

                            {/* --- NEW FILTERED METRICS MAPPING --- */}
                            {Array.isArray(metrics) && metrics
                                .filter(m => selectedMetric === 'all' || m.json_path === selectedMetric)
                                .map((m, i) => {
                                    const cleanKey = m.json_path.replace('$.', '');

                                    return (
                                        <React.Fragment key={m.id || i}>
                                            <Line
                                                type="monotone"
                                                dataKey={cleanKey}
                                                name={m.label}
                                                stroke={m.color || COLORS[i % COLORS.length]}
                                                dot={false}
                                                strokeWidth={2}
                                            />

                                            {m.threshold_warning != null && (
                                                <ReferenceLine
                                                    y={Number(m.threshold_warning)}
                                                    stroke="#ea580c"
                                                    strokeDasharray="5 5"
                                                    label={{ position: 'right', value: 'Warn', fill: '#ea580c', fontSize: 10 }}
                                                />
                                            )}

                                            {m.threshold_critical != null && (
                                                <ReferenceLine
                                                    y={Number(m.threshold_critical)}
                                                    stroke="#dc2626"
                                                    strokeWidth={1.5}
                                                    label={{ position: 'insideTopRight', value: 'Crit', fill: '#dc2626', fontSize: 10 }}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div style={styles.aiCard}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h3><Bot size={18}/> AI Analysis</h3>
                    <button onClick={runAI} disabled={analyzing} style={styles.aiBtn}>{analyzing ? 'Analyzing...' : <><Play size={16}/> Run Analysis</>}</button>
                </div>
                {analysisResult && (
                    <div style={{marginTop:'15px', padding:'15px', borderRadius:'8px', backgroundColor: analysisResult.anomaly_detected ? '#fef2f2' : '#f0fdf4', border: `1px solid ${analysisResult.anomaly_detected ? '#fca5a5' : '#86efac'}`}}>
                        <h4 style={{color: analysisResult.anomaly_detected ? '#b91c1c' : '#15803d', margin:'0 0 10px 0'}}>{analysisResult.anomaly_detected ? "⚠️ Issue" : "✅ Healthy"}</h4>
                        <p>{analysisResult.summary}</p>
                        <button onClick={downloadPDF} style={{backgroundColor: 'white', border: '1px solid #d1d5db', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'}}>
                            <Download size={14} /> Download Official PDF Report
                        </button>
                    </div>
                )}
            </div>
        </>
    );

    const renderMainContent = () => {
        if (category === 'inventory') return <Inventory />;
        if (category === 'ai-settings') return <AISettings />;
        if (category === 'email-settings') return <EmailConfig />;
        if (category === 'reporting') return <ReportingConsole />;
        if (deviceId && selectedDevice) return renderInfraDetail();
        return renderInfraList();
    };

    return (
        <div style={styles.container}>
            {renderSidebar()}
            <div style={styles.main}>
                {renderMainContent()}
            </div>

            {showLicenseModal && licenseInfo && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h2>License Details</h2>
                            <button onClick={() => setShowLicenseModal(false)} style={styles.closeBtn}><X size={20}/></button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.infoRow}><span>Organization:</span><strong>{licenseInfo.organization}</strong></div>
                            <div style={styles.infoRow}><span>Status:</span><span style={{color: '#16a34a'}}>● {licenseInfo.status}</span></div>
                            <div style={styles.infoRow}><span>Expires:</span><span>{new Date(licenseInfo.expiry_date).toLocaleDateString()}</span></div>
                            <hr style={styles.divider} />
                            <div style={{backgroundColor:'#f9fafb', padding:'15px', borderRadius:'8px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9rem', marginBottom:'5px'}}>
                                    <span>Node Usage</span><span>{licenseInfo.used_nodes} / {licenseInfo.max_nodes}</span>
                                </div>
                                <div style={{width: '100%', height: '10px', backgroundColor: '#e5e7eb', borderRadius: '5px', overflow:'hidden'}}>
                                    <div style={{width: `${(licenseInfo.used_nodes / licenseInfo.max_nodes) * 100}%`, height: '100%', backgroundColor: '#2563eb'}}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { display: 'flex', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'Inter, sans-serif' },
    sidebar: { width: '250px', backgroundColor: '#111827', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' },
    brand: { fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '40px' },
    menu: { flex: 1 },
    menuLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '10px', fontWeight: 'bold', marginTop: '20px', letterSpacing:'0.05em' },
    menuItem: { padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', transition:'0.2s', color:'#d1d5db' },
    logout: { cursor:'pointer', display:'flex', gap:'10px', color:'#9ca3af', padding:'10px' },
    main: { flex: 1, padding: '30px', overflowY: 'auto' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
    dateControl: { display: 'flex', gap: '10px', alignItems: 'center', backgroundColor:'white', padding:'8px', borderRadius:'8px', boxShadow:'0 1px 2px rgba(0,0,0,0.05)' },
    dateInput: { border:'1px solid #d1d5db', borderRadius:'4px', padding:'4px' },
    grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' },
    card: { backgroundColor:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e5e7eb', cursor:'pointer', boxShadow:'0 2px 4px rgba(0,0,0,0.05)' },
    chartCard: { backgroundColor:'white', padding:'20px', borderRadius:'12px', marginBottom:'20px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
    aiCard: { backgroundColor:'white', padding:'20px', borderRadius:'12px', borderLeft:'4px solid #8b5cf6', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
    btnPrimary: { backgroundColor:'#4f46e5', color:'white', border:'none', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center' },
    btnGreen: { backgroundColor:'#10b981', color:'white', border:'none', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center' },
    aiBtn: { backgroundColor:'#8b5cf6', color:'white', border:'none', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center', fontWeight:'600' },
    backBtn: { background:'none', border:'none', cursor:'pointer', display:'flex', gap:'5px', marginBottom:'15px', color:'#6b7280' },
    ipBadge: { backgroundColor:'#f3f4f6', padding:'2px 8px', borderRadius:'4px', fontSize:'0.8rem', color:'#6b7280' },
    licenseBadge: { backgroundColor:'#d1fae5', padding:'4px 8px', borderRadius:'12px', fontSize:'0.8rem', color:'#065f46', display:'flex', gap:'5px', alignItems:'center' },
    badges: { display:'flex', gap:'10px' },
    pagination: { marginTop:'20px', display:'flex', justifyContent:'center', gap:'10px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '0', borderRadius: '12px', width: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    modalHeader: { padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalBody: { padding: '20px' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
    infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '0.95rem' },
    divider: { border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' },
    metricSelect: { padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', backgroundColor: '#f9fafb' } // NEW: Dropdown style
};

export default Dashboard;
