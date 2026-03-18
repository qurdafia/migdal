import React, { useState, useEffect } from 'react';
import api from '../api';
import { ArrowLeft, Plus, Trash2, Server, Database, Network, Box, Copy, Settings, Edit2, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Inventory = () => {
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    
    // --- SEARCH & PAGINATION STATES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    // --- MODAL STATES ---
    const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
    const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
    
    // --- DATA STATES ---
    const [selectedDevice, setSelectedDevice] = useState(null); 
    // 👇 ADDED: ip_address and hostname to the default form state
    const [deviceForm, setDeviceForm] = useState({ name: '', type: 'server', ip_address: '', hostname: '' }); 
    const [currentMetrics, setCurrentMetrics] = useState([]); 
    const [metricForm, setMetricForm] = useState({ label: '', json_path: '', unit: '', threshold_warning: '', threshold_critical: '' });

    // ==========================
    // 1. DEVICE MANAGEMENT
    // ==========================
    
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchDevices();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, currentPage]); 

    const fetchDevices = async () => {
        try {
            const res = await api.get('/core/devices/', {
                params: {
                    search: searchTerm,
                    page: currentPage
                }
            });
            
            const rawData = res.data.results || res.data;
            setDevices(Array.isArray(rawData) ? rawData : []);
            
            if (res.data.count !== undefined) {
                setTotalPages(Math.ceil(res.data.count / 10) || 1);
            } else {
                setTotalPages(1);
            }
        } catch (err) { console.error("Load failed", err); }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); 
    };

    const openDeviceModal = (device = null) => {
        if (device) {
            setSelectedDevice(device);
            // 👇 ADDED: Map existing IP and Hostname to the form when editing
            setDeviceForm({ 
                name: device.name, 
                type: device.type,
                ip_address: device.ip_address || '',
                hostname: device.hostname || ''
            });
        } else {
            setSelectedDevice(null);
            // 👇 ADDED: Clear IP and Hostname for new devices
            setDeviceForm({ name: '', type: 'server', ip_address: '', hostname: '' });
        }
        setIsDeviceModalOpen(true);
    };

    const handleDeviceSubmit = async (e) => {
        e.preventDefault();
        try {
            // 👇 ADDED: Include IP and Hostname in the payload
            const payload = {
                name: deviceForm.name,
                type: deviceForm.type,
                ip_address: deviceForm.ip_address || null, // Send null if empty so Django doesn't complain
                hostname: deviceForm.hostname || null
            };

            if (selectedDevice) {
                await api.put(`/core/devices/manage/${selectedDevice.id}/`, payload);
            } else {
                await api.post('/core/devices/manage/', payload);
            }
            setIsDeviceModalOpen(false);
            fetchDevices();
        } catch (err) { alert("Operation failed. Check console for details."); }
    };

    const handleDeleteDevice = async (id) => {
        if(!window.confirm("Delete this device and ALL history?")) return;
        try {
            await api.delete(`/core/devices/manage/${id}/`);
            fetchDevices();
        } catch (err) { alert("Delete failed"); }
    };

    // ==========================
    // 2. METRIC CONFIGURATION
    // ==========================
    const openMetricModal = async (device) => {
        setSelectedDevice(device);
        setIsMetricModalOpen(true);
        loadMetrics(device.id);
    };

    const loadMetrics = async (id) => {
        try {
            const res = await api.get(`/core/devices/${id}/metrics/`);
            setCurrentMetrics(Array.isArray(res.data) ? res.data : []);
        } catch (e) { setCurrentMetrics([]); }
    };

    const handleAddMetric = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...metricForm,
                warning_threshold: metricForm.threshold_warning === '' ? null : Number(metricForm.threshold_warning),
                critical_threshold: metricForm.threshold_critical === '' ? null : Number(metricForm.threshold_critical),
            };

            await api.post(`/core/devices/${selectedDevice.id}/metrics/`, payload);
            setMetricForm({ label: '', json_path: '', unit: '', threshold_warning: '', threshold_critical: '' }); 
            loadMetrics(selectedDevice.id); 
        } catch (e) { alert("Failed to add metric"); }
    };

    const handleDeleteMetric = async (metricId) => {
        try {
            await api.delete(`/core/devices/${selectedDevice.id}/metrics/${metricId}/`);
            loadMetrics(selectedDevice.id);
        } catch (e) { alert("Failed to delete metric"); }
    };

    // ==========================
    // HELPER UTILS
    // ==========================
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("API Key copied!");
    };

    const getIcon = (type) => {
        switch(type) {
            case 'network': return <Network size={20} color="#2563eb" />;
            case 'storage': return <Database size={20} color="#9333ea" />;
            case 'hypervisor': return <Box size={20} color="#ea580c" />;
            default: return <Server size={20} color="#16a34a" />;
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Device Inventory</h1>
                </div>
                <button onClick={() => openDeviceModal()} style={styles.addBtn}>
                    <Plus size={16} /> Add Device
                </button>
            </div>

            {/* --- TOOLBAR: SEARCH --- */}
            <div style={styles.toolbar}>
                <div style={styles.searchBox}>
                    <Search size={18} color="#6b7280" />
                    <input 
                        type="text" 
                        placeholder="Search devices by name..." 
                        value={searchTerm}
                        onChange={handleSearchChange}
                        style={styles.searchInput}
                    />
                </div>
            </div>

            {/* DEVICE GRID */}
            {devices.length === 0 ? (
                <div style={styles.emptyState}>No devices found.</div>
            ) : (
                <div style={styles.grid}>
                    {devices.map(device => (
                        <div key={device.id} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    {getIcon(device.type)}
                                    <span style={{fontWeight:'bold'}}>{device.name}</span>
                                </div>
                                <span style={styles.badge}>{device.type}</span>
                            </div>
                            
                            <div style={styles.cardBody}>
                                <div style={styles.field}>
                                    <label>API Key (UUID):</label>
                                    <div style={styles.keyBox} onClick={() => copyToClipboard(device.id)}>
                                        {device.id.substring(0, 15)}... <Copy size={12} />
                                    </div>
                                </div>
                                <div style={styles.field}>
                                    <label>IP:</label> 
                                    <span style={{marginLeft: '5px', fontFamily:'monospace', color:'#666'}}>{device.ip_address || device.reported_ip || 'N/A'}</span>
                                </div>
                                {/* 👇 ADDED: Display Hostname on the Card */}
                                <div style={styles.field}>
                                    <label>Hostname:</label> 
                                    <span style={{marginLeft: '5px', fontFamily:'monospace', color:'#666'}}>{device.hostname || 'N/A'}</span>
                                </div>
                            </div>

                            <div style={styles.cardFooter}>
                                <button onClick={() => openMetricModal(device)} style={styles.iconBtn} title="Configure Metrics">
                                    <Settings size={16} color="#2563eb"/>
                                </button>
                                <button onClick={() => openDeviceModal(device)} style={styles.iconBtn} title="Edit Device">
                                    <Edit2 size={16} color="#ea580c"/>
                                </button>
                                <button onClick={() => handleDeleteDevice(device.id)} style={styles.iconBtn} title="Delete">
                                    <Trash2 size={16} color="#dc2626"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- PAGINATION CONTROLS --- */}
            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={styles.pageBtn}>
                        Previous
                    </button>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={styles.pageBtn}>
                        Next
                    </button>
                </div>
            )}

            {/* --- MODAL 1: ADD/EDIT DEVICE --- */}
            {isDeviceModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2>{selectedDevice ? 'Edit Device' : 'Add New Device'}</h2>
                        <form onSubmit={handleDeviceSubmit}>
                            <div style={styles.inputGroup}>
                                <label>Name</label>
                                <input 
                                    value={deviceForm.name || ''} 
                                    onChange={e => setDeviceForm({...deviceForm, name: e.target.value})}
                                    required style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label>Type</label>
                                <select 
                                    value={deviceForm.type || ''} 
                                    onChange={e => setDeviceForm({...deviceForm, type: e.target.value})}
                                    style={styles.select}
                                >
                                    <option value="server">Server</option>
                                    <option value="network">Network</option>
                                    <option value="storage">Storage</option>
                                    <option value="hypervisor">Hypervisor</option>
                                </select>
                            </div>
                            
                            {/* 👇 ADDED: Input for IP Address */}
                            <div style={styles.inputGroup}>
                                <label>IP Address (Optional)</label>
                                <input 
                                    placeholder="e.g. 192.168.1.100"
                                    value={deviceForm.ip_address || ''} 
                                    onChange={e => setDeviceForm({...deviceForm, ip_address: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            {/* 👇 ADDED: Input for Hostname */}
                            <div style={styles.inputGroup}>
                                <label>Hostname (Optional)</label>
                                <input 
                                    placeholder="e.g. srv-web-01.local"
                                    value={deviceForm.hostname || ''} 
                                    onChange={e => setDeviceForm({...deviceForm, hostname: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.modalActions}>
                                <button type="button" onClick={() => setIsDeviceModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
                                <button type="submit" style={styles.saveBtn}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: CONFIGURE METRICS --- */}
            {isMetricModalOpen && selectedDevice && (
                <div style={styles.modalOverlay}>
                    <div style={{...styles.modal, width: '600px'}}>
                        <div style={styles.modalHeader}>
                            <h2>Mapping: {selectedDevice.name}</h2>
                            <button onClick={() => setIsMetricModalOpen(false)} style={styles.closeBtn}><X size={20}/></button>
                        </div>

                        {/* List Existing Metrics */}
                        <div style={{maxHeight:'300px', overflowY:'auto', marginBottom:'20px'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
                                <thead>
                                    <tr style={{borderBottom:'1px solid #eee', textAlign:'left'}}>
                                        <th style={{padding:'8px'}}>Label</th>
                                        <th style={{padding:'8px'}}>Path</th>
                                        <th style={{padding:'8px'}}>Unit</th>
                                        <th style={{padding:'8px'}}>Warn</th>
                                        <th style={{padding:'8px'}}>Crit</th>
                                        <th style={{padding:'8px'}}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentMetrics.length === 0 ? (
                                        <tr><td colSpan="6" style={{padding:'15px', textAlign:'center', color:'#999'}}>No metrics configured.</td></tr>
                                    ) : (
                                        currentMetrics.map(m => (
                                            <tr key={m.id} style={{borderBottom:'1px solid #f9f9f9'}}>
                                                <td style={{padding:'8px', fontWeight:'500'}}>{m.label}</td>
                                                <td style={{padding:'8px', fontFamily:'monospace', color:'#666'}}>{m.json_path}</td>
                                                <td style={{padding:'8px'}}>{m.unit}</td>
                                                <td style={{padding:'8px', color: '#ea580c'}}>{m.threshold_warning || '-'}</td>
                                                <td style={{padding:'8px', color: '#dc2626'}}>{m.threshold_critical || '-'}</td>
                                                <td style={{padding:'8px'}}>
                                                    <button onClick={() => handleDeleteMetric(m.id)} style={{border:'none', background:'none', cursor:'pointer', color:'#dc2626'}}>
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Add New Metric Form */}
                        <form onSubmit={handleAddMetric} style={{backgroundColor:'#f9fafb', padding:'15px', borderRadius:'8px', marginTop: '15px'}}>
                            <h4 style={{margin:'0 0 10px 0'}}>Add New Mapping</h4>
                            
                            <div style={{display:'flex', gap:'10px', marginBottom: '10px'}}>
                                <input placeholder="Label (e.g. CPU)" value={metricForm.label} onChange={e=>setMetricForm({...metricForm, label:e.target.value})} required style={{...styles.miniInput, flex: 1}}/>
                                <input placeholder="Path (e.g. $.cpu)" value={metricForm.json_path} onChange={e=>setMetricForm({...metricForm, json_path:e.target.value})} required style={{...styles.miniInput, flex: 2}}/>
                            </div>
                            
                            <div style={{display:'flex', gap:'10px', alignItems: 'center'}}>
                                <input placeholder="Unit (%)" value={metricForm.unit} onChange={e=>setMetricForm({...metricForm, unit:e.target.value})} style={{...styles.miniInput, width: '80px', flex: 'none'}}/>
                                <input type="number" placeholder="Warn (80)" value={metricForm.threshold_warning} onChange={e=>setMetricForm({...metricForm, threshold_warning:e.target.value})} style={{...styles.miniInput, width: '100px', flex: 'none'}}/>
                                <input type="number" placeholder="Crit (90)" value={metricForm.threshold_critical} onChange={e=>setMetricForm({...metricForm, threshold_critical:e.target.value})} style={{...styles.miniInput, width: '100px', flex: 'none'}}/>
                                
                                <div style={{flex: 1, display: 'flex', justifyContent: 'flex-end'}}>
                                    <button type="submit" style={{...styles.saveBtn, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                        <Plus size={16}/> Add
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', margin: '0 0 5px 0' },
    backBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#666' },
    addBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' },
    
    toolbar: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
    searchBox: { display: 'flex', alignItems: 'center', backgroundColor: 'white', padding: '8px 15px', borderRadius: '8px', border: '1px solid #d1d5db', width: '350px', gap: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    searchInput: { border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem' },
    emptyState: { padding: '40px', textAlign: 'center', color: '#6b7280', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #d1d5db' },

    pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '30px' },
    pageBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer', color: '#374151' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    card: { backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' },
    cardHeader: { padding: '15px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' },
    badge: { fontSize: '10px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#e5e7eb', color: '#374151' },
    cardBody: { padding: '15px' },
    cardFooter: { padding: '10px 15px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    field: { marginBottom: '10px', fontSize: '13px' },
    keyBox: { fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '5px', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' },
    
    iconBtn: { backgroundColor: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'0.2s' },

    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modal: { backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
    modalHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'10px' },
    inputGroup: { marginBottom: '15px' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '5px' },
    select: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '5px' },
    modalActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' },
    saveBtn: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
    cancelBtn: { backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' },
    miniInput: { padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', flex: 1 },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#666' }
};

export default Inventory;