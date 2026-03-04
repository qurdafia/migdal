import React, { useState } from 'react';
import api from '../api';
import { Calendar, Download, Clock, Activity } from 'lucide-react';

const ReportingConsole = () => {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isDownloading, setIsDownloading] = useState(false);

    // Quick-Select Timeframes
    const setPreset = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        
        setEndDate(end.toISOString().split('T')[0]);
        setStartDate(start.toISOString().split('T')[0]);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            // Call the new Historical Django View!
            const res = await api.get('/reports/historical/', {
                params: { start_date: startDate, end_date: endDate },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Migdal_Historical_Report_${startDate}_to_${endDate}.xlsx`);
            // link.setAttribute('download', `Migdal_Historical_Report_${startDate}_to_${endDate}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (e) {
            alert("Failed to generate historical report.");
        }
        setIsDownloading(false);
    };

    return (
        <div style={{ padding: '30px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={28} color="#4f46e5" /> Historical Reporting
                </h1>
                <p style={{ color: '#6b7280', margin: 0 }}>Generate tabular CSV data separated by device category.</p>
            </div>

            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
                
                <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <Clock size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Timeframe Selection
                </h3>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                    <button onClick={() => setPreset(1)} style={presetBtnStyle}>Last 24 Hours</button>
                    <button onClick={() => setPreset(7)} style={presetBtnStyle}>Last 7 Days</button>
                    <button onClick={() => setPreset(30)} style={presetBtnStyle}>Last 30 Days</button>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
                    </div>
                </div>

                <button 
                    onClick={handleDownload} 
                    disabled={isDownloading}
                    style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 'bold', width: '100%', justifyContent: 'center', fontSize: '1rem', transition: '0.2s', opacity: isDownloading ? 0.7 : 1 }}
                >
                    {isDownloading ? <Activity className="animate-spin" size={20} /> : <Download size={20} />}
                    {isDownloading ? 'Generating Report...' : 'Download Historical CSV'}
                </button>
            </div>
        </div>
    );
};

const presetBtnStyle = { flex: 1, padding: '10px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '500' };
const dateInputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', color: '#111827' };

export default ReportingConsole;