import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Activity, Database, HardDrive, Network } from 'lucide-react';

const categories = [
    { id: 'hypervisor', label: 'Hypervisors', icon: <Server size={32}/>, desc: 'vCenter, Nutanix, ESXi', color: '#3b82f6' },
    { id: 'network', label: 'Network', icon: <Network size={32}/>, desc: 'Switches, Routers, Firewalls', color: '#10b981' },
    { id: 'storage', label: 'Storage', icon: <HardDrive size={32}/>, desc: 'NAS, SAN Arrays', color: '#f59e0b' },
    { id: 'server', label: 'Servers', icon: <Database size={32}/>, desc: 'Linux, Windows, Bare Metal', color: '#6366f1' },
];

const DeviceCategories = () => {
    const navigate = useNavigate();

    return (
        <div style={{ padding: '40px' }}>
            <h1 style={{ marginBottom: '30px' }}>Infrastructure Overview</h1>
            <div style={styles.grid}>
                {categories.map(cat => (
                    <div 
                        key={cat.id} 
                        style={styles.card} 
                        onClick={() => navigate(`/devices/${cat.id}`)} // Navigate to filtered list
                    >
                        <div style={{...styles.iconBox, backgroundColor: cat.color + '20', color: cat.color}}>
                            {cat.icon}
                        </div>
                        <div>
                            <h3 style={{ margin: '0 0 5px 0' }}>{cat.label}</h3>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>{cat.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    card: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e5e7eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    iconBox: { width: '60px', height: '60px', borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default DeviceCategories;