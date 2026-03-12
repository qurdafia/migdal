import React, { useState, useEffect } from 'react';
import api from '../api';
import { Terminal, FileCode, Key, Box, Plus, Save, X, Play, Edit2, Trash2, Activity } from 'lucide-react';
import Editor from '@monaco-editor/react';

const AutomationConsole = () => {
    const [activeTab, setActiveTab] = useState('jobs');
    
    // ==========================================
    // GLOBAL DATA FOR DROPDOWNS
    // ==========================================
    const [devices, setDevices] = useState([]);

    // ==========================================
    // STATE: JOBS & EXECUTION
    // ==========================================
    const [jobs, setJobs] = useState([]);
    const [activeRunId, setActiveRunId] = useState(null);
    const [liveLogs, setLiveLogs] = useState("");
    const [runStatus, setRunStatus] = useState("");
    const [showJobModal, setShowJobModal] = useState(false);
    const [jobForm, setJobForm] = useState({ id: null, name: '', playbook: '', environment: '', credential: '', targets: [], cron_schedule: '', is_active: true });

    // ==========================================
    // STATE: RUNS (EXECUTION HISTORY)
    // ==========================================
    const [runs, setRuns] = useState([]);
    const [selectedRun, setSelectedRun] = useState(null);
    const [showRunModal, setShowRunModal] = useState(false);

    // ==========================================
    // STATE: PLAYBOOKS
    // ==========================================
    const [playbooks, setPlaybooks] = useState([]);
    const [showPlaybookModal, setShowPlaybookModal] = useState(false);
    const [playbookForm, setPlaybookForm] = useState({ id: null, name: '', description: '', yaml_content: '---\n- name: Example\n  hosts: all\n  tasks:\n    - ping:\n' });

    // ==========================================
    // STATE: VAULT (CREDENTIALS)
    // ==========================================
    const [credentials, setCredentials] = useState([]);
    const [showCredModal, setShowCredModal] = useState(false);
    const [credForm, setCredForm] = useState({ id: null, name: '', credential_type: 'machine', username: '', secret: '' });
    const [showSecret, setShowSecret] = useState(false);

    // ==========================================
    // STATE: ENVIRONMENTS
    // ==========================================
    const [environments, setEnvironments] = useState([]);
    const [showEnvModal, setShowEnvModal] = useState(false);
    const [envForm, setEnvForm] = useState({ id: null, name: '', collections_json: '[\n  {"name": "community.general", "version": "latest"}\n]', python_packages_json: '[]' });

    // ==========================================
    // LIFECYCLE ROUTER
    // ==========================================
    useEffect(() => {
        fetchDevices();
        fetchPlaybooks();
        fetchCredentials();
        fetchEnvironments();
        fetchJobs();
        fetchRuns();
    }, []);

    // ==========================================
    // API FETCHERS
    // ==========================================
    const fetchDevices = async () => {
        try { const res = await api.get('/core/devices/'); setDevices(res.data.results || res.data || []); } catch (e) { console.error(e); }
    };
    const fetchJobs = async () => {
        try { const res = await api.get('automation/jobs/'); setJobs(res.data.results || res.data || []); } catch (e) { console.error(e); }
    };
    const fetchRuns = async () => {
        try { 
            const res = await api.get('automation/job-runs/'); 
            const data = res.data.results || res.data || [];
            // Sort to show newest first
            setRuns(data.sort((a, b) => b.id - a.id)); 
        } catch (e) { console.error(e); }
    };
    const fetchPlaybooks = async () => {
        try { const res = await api.get('automation/playbooks/'); setPlaybooks(res.data.results || res.data || []); } catch (e) { console.error(e); }
    };
    const fetchCredentials = async () => {
        try { const res = await api.get('automation/credentials/'); setCredentials(res.data.results || res.data || []); } catch (e) { console.error(e); }
    };
    const fetchEnvironments = async () => {
        try { const res = await api.get('automation/environments/'); setEnvironments(res.data.results || res.data || []); } catch (e) { console.error(e); }
    };

    // ==========================================
    // CRUD HANDLERS
    // ==========================================
    const handleSave = async (endpoint, formState, fetchFunc, setModalFunc, resetState) => {
        try {
            if (formState.id) {
                await api.put(`automation/${endpoint}/${formState.id}/`, formState);
            } else {
                await api.post(`automation/${endpoint}/`, formState);
            }
            setModalFunc(false);
            fetchFunc();
            resetState();
        } catch (e) { alert(`Failed to save. Error: ${e.response?.data ? JSON.stringify(e.response.data) : e.message}`); }
    };

    const handleDelete = async (endpoint, id, fetchFunc) => {
        if (!window.confirm("Are you sure you want to delete this? This action cannot be undone.")) return;
        try {
            await api.delete(`automation/${endpoint}/${id}/`);
            fetchFunc();
        } catch (e) { alert("Failed to delete. It might be in use by a Job."); }
    };

    // ==========================================
    // EXECUTION & POLLING
    // ==========================================
    const handleRunJob = async (jobId) => {
        setLiveLogs("Initializing job... waiting for backend engine...");
        setRunStatus("pending");
        try {
            const res = await api.post(`automation/jobs/${jobId}/execute/`);
            if (res.data.run_id) setActiveRunId(res.data.run_id);
            fetchRuns(); // Refresh runs immediately to show pending job
        } catch (error) { setLiveLogs("Critical Error: Could not reach the Migdal backend."); }
    };

    useEffect(() => {
        let pollInterval;
        const pollLogs = async () => {
            if (!activeRunId) return;
            try {
                const res = await api.get(`automation/runs/${activeRunId}/`);
                setRunStatus(res.data.status);
                if (res.data.stdout) setLiveLogs(res.data.stdout);
                
                if (['successful', 'failed', 'canceled'].includes(res.data.status)) {
                    clearInterval(pollInterval);
                    fetchRuns(); // Refresh runs list once job finishes
                }
            } catch (e) { console.error(e); }
        };

        if (activeRunId && ['pending', 'running'].includes(runStatus)) {
            pollInterval = setInterval(pollLogs, 2000);
        }
        return () => clearInterval(pollInterval);
    }, [activeRunId, runStatus]);


    // ==========================================
    // MODAL OPENERS (For Editing)
    // ==========================================
    const openEditPlaybook = (pb) => { setPlaybookForm(pb); setShowPlaybookModal(true); };
    const openEditCred = (c) => { 
        setCredForm({ ...c, secret: '' }); 
        setShowSecret(false); // Force hidden on open
        setShowCredModal(true); 
    };
    const openEditEnv = (e) => { 
        setEnvForm({ ...e, collections_json: JSON.stringify(e.collections_json, null, 2), python_packages_json: JSON.stringify(e.python_packages_json, null, 2) }); 
        setShowEnvModal(true); 
    };
    const openEditJob = (j) => { setJobForm(j); setShowJobModal(true); };

    // ==========================================
    // RENDERERS
    // ==========================================
    const renderRunsTab = () => (
        <div>
            <div style={styles.headerRow}>
                <h2 style={styles.sectionTitle}>Execution History</h2>
                <button style={styles.btnPrimary} onClick={fetchRuns}>↻ Refresh</button>
            </div>
            <div style={styles.card}>
                <table style={styles.table}>
                    <thead style={styles.th}>
                        <tr>
                            <th style={styles.thItem}>Run ID</th>
                            <th style={styles.thItem}>Job Name</th>
                            <th style={styles.thItem}>Status</th>
                            <th style={styles.thItem}>Finished At</th>
                            <th style={{...styles.thItem, textAlign: 'right'}}>Logs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.map(run => (
                            <tr key={run.id} style={styles.tr}>
                                <td style={styles.td}>#{run.id}</td>
                                <td style={styles.td}><strong>{run.job_name || `Job ID: ${run.job}`}</strong></td>
                                <td style={styles.td}>
                                    <span style={run.status === 'successful' ? styles.badgeActive : run.status === 'failed' ? styles.badgeInactive : styles.badgeDark}>
                                        {run.status ? run.status.toUpperCase() : 'UNKNOWN'}
                                    </span>
                                </td>
                                <td style={styles.td}>{run.finished_at ? new Date(run.finished_at).toLocaleString() : 'Running...'}</td>
                                <td style={{...styles.td, textAlign: 'right'}}>
                                    <button onClick={() => { setSelectedRun(run); setShowRunModal(true); }} style={styles.btnSecondary}>
                                        View Output
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {runs.length === 0 && <tr><td colSpan="5" style={{...styles.td, textAlign:'center'}}>No runs recorded yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderJobsTab = () => (
        <div>
            <div style={styles.headerRow}>
                <h2 style={styles.sectionTitle}>Scheduled Jobs</h2>
                <button style={styles.btnPrimary} onClick={() => { setJobForm({ id: null, name: '', playbook: '', environment: '', credential: '', targets: [], cron_schedule: '', is_active: true }); setShowJobModal(true); }}>
                    <Plus size={16} /> Create Job
                </button>
            </div>
            <div style={styles.card}>
                <table style={styles.table}>
                    <thead style={styles.th}>
                        <tr>
                            <th style={styles.thItem}>Job Name</th>
                            <th style={styles.thItem}>Schedule</th>
                            <th style={styles.thItem}>Status</th>
                            <th style={{...styles.thItem, textAlign: 'right'}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map(job => (
                            <tr key={job.id} style={styles.tr}>
                                <td style={styles.td}><strong>{job.name}</strong></td>
                                <td style={styles.td}>{job.cron_schedule || 'Manual'}</td>
                                <td style={styles.td}>
                                    <span style={job.is_active ? styles.badgeActive : styles.badgeInactive}>{job.is_active ? 'Active' : 'Disabled'}</span>
                                </td>
                                <td style={{...styles.td, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
                                    <button onClick={() => handleRunJob(job.id)} disabled={!job.is_active || runStatus === 'running'} style={styles.btnGreen}><Play size={14}/> Run</button>
                                    <button onClick={() => openEditJob(job)} style={styles.iconBtn}><Edit2 size={16} color="#4b5563"/></button>
                                    <button onClick={() => handleDelete('jobs', job.id, fetchJobs)} style={styles.iconBtn}><Trash2 size={16} color="#ef4444"/></button>
                                </td>
                            </tr>
                        ))}
                        {jobs.length === 0 && <tr><td colSpan="4" style={{...styles.td, textAlign:'center'}}>No jobs configured.</td></tr>}
                    </tbody>
                </table>
            </div>

            {activeRunId && (
                <div style={styles.terminalContainer}>
                    <div style={styles.terminalHeader}>
                        <span style={{display:'flex', alignItems:'center', gap:'8px'}}><Terminal size={14}/> Live Output</span>
                        <span style={{color: runStatus === 'successful' ? '#4ade80' : runStatus === 'failed' ? '#f87171' : '#facc15'}}>{runStatus.toUpperCase()}</span>
                    </div>
                    <div style={styles.terminalBody}>
                        <pre style={styles.terminalText}>{liveLogs}</pre>
                    </div>
                </div>
            )}
        </div>
    );

    const renderPlaybooksTab = () => (
        <div>
            <div style={styles.headerRow}>
                <h2 style={styles.sectionTitle}>Playbook Library</h2>
                <button style={styles.btnPrimary} onClick={() => { setPlaybookForm({ id: null, name: '', description: '', yaml_content: '---\n' }); setShowPlaybookModal(true); }}>
                    <Plus size={16} /> New Playbook
                </button>
            </div>
            <div style={styles.card}>
                <table style={styles.table}>
                    <thead style={styles.th}>
                        <tr>
                            <th style={styles.thItem}>Name</th>
                            <th style={styles.thItem}>Description</th>
                            <th style={styles.thItem}>Updated</th>
                            <th style={{...styles.thItem, textAlign: 'right'}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {playbooks.map(pb => (
                            <tr key={pb.id} style={styles.tr}>
                                <td style={styles.td}><div style={{display:'flex', alignItems:'center', gap:'8px'}}><FileCode size={16} color="#3b82f6"/> <strong>{pb.name}</strong></div></td>
                                <td style={styles.td}>{pb.description || '--'}</td>
                                <td style={styles.td}>{new Date(pb.updated_at).toLocaleDateString()}</td>
                                <td style={{...styles.td, textAlign: 'right'}}>
                                    <button onClick={() => openEditPlaybook(pb)} style={styles.iconBtn}><Edit2 size={16} color="#4b5563"/></button>
                                    <button onClick={() => handleDelete('playbooks', pb.id, fetchPlaybooks)} style={styles.iconBtn}><Trash2 size={16} color="#ef4444"/></button>
                                </td>
                            </tr>
                        ))}
                        {playbooks.length === 0 && <tr><td colSpan="4" style={{...styles.td, textAlign:'center'}}>No playbooks found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderCredentialsTab = () => (
        <div>
            <div style={styles.headerRow}>
                <h2 style={styles.sectionTitle}>Secure Vault</h2>
                <button style={styles.btnPrimary} onClick={() => { setCredForm({ id: null, name: '', credential_type: 'machine', username: '', secret: '' }); setShowCredModal(true); }}>
                    <Plus size={16} /> Add Credential
                </button>
            </div>
            <div style={styles.card}>
                <table style={styles.table}>
                    <thead style={styles.th}>
                        <tr>
                            <th style={styles.thItem}>Name</th>
                            <th style={styles.thItem}>Type</th>
                            <th style={styles.thItem}>Username</th>
                            <th style={{...styles.thItem, textAlign: 'right'}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {credentials.map(c => (
                            <tr key={c.id} style={styles.tr}>
                                <td style={styles.td}><div style={{display:'flex', alignItems:'center', gap:'8px'}}><Key size={16} color="#ca8a04"/> <strong>{c.name}</strong></div></td>
                                <td style={styles.td}><span style={styles.badgeDark}>{c.credential_type}</span></td>
                                <td style={styles.td}>{c.username || '--'}</td>
                                <td style={{...styles.td, textAlign: 'right'}}>
                                    <button onClick={() => openEditCred(c)} style={styles.iconBtn}><Edit2 size={16} color="#4b5563"/></button>
                                    <button onClick={() => handleDelete('credentials', c.id, fetchCredentials)} style={styles.iconBtn}><Trash2 size={16} color="#ef4444"/></button>
                                </td>
                            </tr>
                        ))}
                        {credentials.length === 0 && <tr><td colSpan="4" style={{...styles.td, textAlign:'center'}}>Vault is empty.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderEnvironmentsTab = () => (
        <div>
            <div style={styles.headerRow}>
                <h2 style={styles.sectionTitle}>Execution Environments</h2>
                <button style={styles.btnPrimary} onClick={() => { setEnvForm({ id: null, name: '', collections_json: '[]', python_packages_json: '[]' }); setShowEnvModal(true); }}>
                    <Plus size={16} /> New Environment
                </button>
            </div>
            <div style={styles.card}>
                <table style={styles.table}>
                    <thead style={styles.th}>
                        <tr>
                            <th style={styles.thItem}>Environment Name</th>
                            <th style={{...styles.thItem, textAlign: 'right'}}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {environments.map(e => (
                            <tr key={e.id} style={styles.tr}>
                                <td style={styles.td}><div style={{display:'flex', alignItems:'center', gap:'8px'}}><Box size={16} color="#9333ea"/> <strong>{e.name}</strong></div></td>
                                <td style={{...styles.td, textAlign: 'right'}}>
                                    <button onClick={() => openEditEnv(e)} style={styles.iconBtn}><Edit2 size={16} color="#4b5563"/></button>
                                    <button onClick={() => handleDelete('environments', e.id, fetchEnvironments)} style={styles.iconBtn}><Trash2 size={16} color="#ef4444"/></button>
                                </td>
                            </tr>
                        ))}
                        {environments.length === 0 && <tr><td colSpan="2" style={{...styles.td, textAlign:'center'}}>No environments defined.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ==========================================
    // MAIN RENDER
    // ==========================================
    return (
        <div style={styles.container}>
            {/* TABS */}
            <div style={styles.tabContainer}>
                <button style={activeTab === 'jobs' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('jobs')}><Terminal size={18} /> Jobs</button>
                <button style={activeTab === 'runs' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('runs')}><Activity size={18} /> Runs History</button>
                <button style={activeTab === 'playbooks' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('playbooks')}><FileCode size={18} /> Playbooks</button>
                <button style={activeTab === 'environments' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('environments')}><Box size={18} /> Environments</button>
                <button style={activeTab === 'credentials' ? styles.tabActive : styles.tabInactive} onClick={() => setActiveTab('credentials')}><Key size={18} /> Vault</button>
            </div>

            {/* CONTENT */}
            {activeTab === 'jobs' && renderJobsTab()}
            {activeTab === 'runs' && renderRunsTab()}
            {activeTab === 'playbooks' && renderPlaybooksTab()}
            {activeTab === 'environments' && renderEnvironmentsTab()}
            {activeTab === 'credentials' && renderCredentialsTab()}

            {/* ========================================== */}
            {/* MODALS */}
            {/* ========================================== */}
            
            {/* RUN LOGS TERMINAL MODAL */}
            {showRunModal && selectedRun && (
                <div style={styles.modalOverlay}>
                    <div style={{...styles.modalContentLarge, height: '70vh'}}>
                        <div style={styles.modalHeader}>
                            <h2 style={{margin: 0}}>Run #{selectedRun.id} Output</h2>
                            <button onClick={() => setShowRunModal(false)} style={styles.closeBtn}><X size={20}/></button>
                        </div>
                        <div style={{...styles.modalBody, backgroundColor: '#111827', padding: '20px'}}>
                            <pre style={styles.terminalText}>{selectedRun.stdout || "No output logged."}</pre>
                        </div>
                    </div>
                </div>
            )}

            {/* JOB MODAL */}
            {showJobModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentSmall}>
                        <div style={styles.modalHeader}><h2>{jobForm.id ? 'Edit' : 'Create'} Job</h2><button onClick={() => setShowJobModal(false)} style={styles.closeBtn}><X size={20}/></button></div>
                        <div style={styles.modalBody}>
                            <label style={styles.label}>Job Name</label>
                            <input style={styles.input} value={jobForm.name} onChange={e => setJobForm({...jobForm, name: e.target.value})} />
                            
                            <label style={styles.label}>Cron Schedule (Leave blank for manual)</label>
                            <input style={styles.input} placeholder="e.g. 0 2 * * 0" value={jobForm.cron_schedule} onChange={e => setJobForm({...jobForm, cron_schedule: e.target.value})} />
                            
                            <label style={styles.label}>Playbook</label>
                            <select style={styles.input} value={jobForm.playbook} onChange={e => setJobForm({...jobForm, playbook: e.target.value})}>
                                <option value="">-- Select Playbook --</option>
                                {playbooks.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>

                            <label style={styles.label}>Environment</label>
                            <select style={styles.input} value={jobForm.environment} onChange={e => setJobForm({...jobForm, environment: e.target.value})}>
                                <option value="">-- Select Environment --</option>
                                {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>

                            <label style={styles.label}>Vault Credential</label>
                            <select style={styles.input} value={jobForm.credential} onChange={e => setJobForm({...jobForm, credential: e.target.value})}>
                                <option value="">-- Select Credential --</option>
                                {credentials.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <label style={styles.label}>Target Devices (Hold CTRL/CMD to select multiple)</label>
                            <select multiple style={{...styles.input, height: '100px'}} value={jobForm.targets} onChange={e => {
                                const options = [...e.target.selectedOptions];
                                const values = options.map(option => option.value);
                                setJobForm({...jobForm, targets: values});
                            }}>
                                {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.ip_address || 'No IP'})</option>)}
                            </select>
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnPrimary} onClick={() => handleSave('jobs', jobForm, fetchJobs, setShowJobModal, () => {})}>Save Job</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PLAYBOOK MODAL */}
            {showPlaybookModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentLarge}>
                        <div style={styles.modalHeader}><h2>{playbookForm.id ? 'Edit' : 'Write'} Playbook</h2><button onClick={() => setShowPlaybookModal(false)} style={styles.closeBtn}><X size={20}/></button></div>
                        <div style={{display:'flex', gap:'10px', padding:'10px', backgroundColor:'#f9fafb', borderBottom:'1px solid #e5e7eb'}}>
                            <input style={styles.input} placeholder="Name" value={playbookForm.name} onChange={e => setPlaybookForm({...playbookForm, name: e.target.value})} />
                            <input style={styles.input} placeholder="Description" value={playbookForm.description} onChange={e => setPlaybookForm({...playbookForm, description: e.target.value})} />
                        </div>
                        <div style={{flex: 1, backgroundColor: '#1e1e1e'}}>
                            <Editor height="100%" defaultLanguage="yaml" theme="vs-dark" value={playbookForm.yaml_content} onChange={(val) => setPlaybookForm({...playbookForm, yaml_content: val})} options={{minimap: {enabled:false}, fontSize:14}}/>
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnPrimary} onClick={() => handleSave('playbooks', playbookForm, fetchPlaybooks, setShowPlaybookModal, () => {})}>Save Playbook</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREDENTIAL MODAL */}
            {showCredModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentSmall}>
                        <div style={styles.modalHeader}><h2>{credForm.id ? 'Edit' : 'Add'} Credential</h2><button onClick={() => setShowCredModal(false)} style={styles.closeBtn}><X size={20}/></button></div>
                        <div style={styles.modalBody}>
                            <label style={styles.label}>Name</label>
                            <input style={styles.input} value={credForm.name} onChange={e => setCredForm({...credForm, name: e.target.value})} />
                            <label style={styles.label}>Type</label>
                            <select style={styles.input} value={credForm.credential_type} onChange={e => setCredForm({...credForm, credential_type: e.target.value})}>
                                <option value="machine">Machine (SSH/WinRM)</option>
                                <option value="vcenter">VMware vCenter</option>
                                <option value="network">Network Device</option>
                                <option value="api">API Token</option>
                            </select>
                            <label style={styles.label}>Username</label>
                            <input style={styles.input} value={credForm.username} onChange={e => setCredForm({...credForm, username: e.target.value})} />
                            
                            {/* THE SECURE SECRET TOGGLE */}
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                <label style={{...styles.label, marginBottom: 0}}>Secret {credForm.id && "(Leave blank to keep existing)"}</label>
                                <button 
                                    type="button" 
                                    onClick={() => setShowSecret(!showSecret)} 
                                    style={{fontSize: '0.75rem', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}
                                >
                                    {showSecret ? 'Hide Secret' : 'Show / Paste SSH Key'}
                                </button>
                            </div>
                            
                            {showSecret ? (
                                <textarea 
                                    style={{...styles.input, height:'100px', fontFamily:'monospace'}} 
                                    placeholder="Paste multiline SSH Private Key here..." 
                                    value={credForm.secret} 
                                    onChange={e => setCredForm({...credForm, secret: e.target.value})} 
                                />
                            ) : (
                                <input 
                                    type="password" 
                                    style={styles.input} 
                                    placeholder="Enter Password..." 
                                    value={credForm.secret} 
                                    onChange={e => setCredForm({...credForm, secret: e.target.value})} 
                                />
                            )}
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnPrimary} onClick={() => handleSave('credentials', credForm, fetchCredentials, setShowCredModal, () => {})}>Encrypt & Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ENVIRONMENT MODAL */}
            {showEnvModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContentSmall}>
                        <div style={styles.modalHeader}><h2>{envForm.id ? 'Edit' : 'Add'} Environment</h2><button onClick={() => setShowEnvModal(false)} style={styles.closeBtn}><X size={20}/></button></div>
                        <div style={styles.modalBody}>
                            <label style={styles.label}>Name</label>
                            <input style={styles.input} value={envForm.name} onChange={e => setEnvForm({...envForm, name: e.target.value})} />
                            <label style={styles.label}>Ansible Collections (JSON Array)</label>
                            <textarea style={{...styles.input, height:'100px', fontFamily:'monospace'}} value={envForm.collections_json} onChange={e => setEnvForm({...envForm, collections_json: e.target.value})} />
                            <label style={styles.label}>Python Packages (JSON Array)</label>
                            <textarea style={{...styles.input, height:'100px', fontFamily:'monospace'}} value={envForm.python_packages_json} onChange={e => setEnvForm({...envForm, python_packages_json: e.target.value})} />
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnPrimary} onClick={() => {
                                try {
                                    const payload = { ...envForm, collections_json: JSON.parse(envForm.collections_json), python_packages_json: JSON.parse(envForm.python_packages_json) };
                                    handleSave('environments', payload, fetchEnvironments, setShowEnvModal, () => {});
                                } catch (e) { alert("Invalid JSON format!"); }
                            }}>Save Environment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// MATCHING STYLES (From your Dashboard.jsx)
// ==========================================
const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    sectionTitle: { margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' },
    
    tabContainer: { display: 'flex', backgroundColor: '#e5e7eb', padding: '4px', borderRadius: '8px', marginBottom: '20px', gap: '4px' },
    tabActive: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', color: '#4f46e5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' },
    tabInactive: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: 'transparent', border: 'none', color: '#4b5563', cursor: 'pointer', transition: '0.2s' },
    
    card: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
    
    // 👇 THIS IS THE NEW PADDING FOR THE HEADINGS ACROSS ALL TABS
    thItem: { padding: '16px 20px', fontWeight: '600', color: '#374151', textAlign: 'left' },
    
    tr: { borderBottom: '1px solid #e5e7eb', transition: '0.2s' },
    td: { padding: '16px', color: '#374151', fontSize: '0.9rem' },
    
    btnPrimary: { backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center', fontWeight: '600' },
    btnGreen: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center', fontWeight: '600' },
    btnSecondary: { backgroundColor: '#374151', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
    
    badgeActive: { backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
    badgeInactive: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
    badgeDark: { backgroundColor: '#374151', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' },
    
    terminalContainer: { marginTop: '20px', backgroundColor: '#111827', borderRadius: '12px', overflow: 'hidden', border: '1px solid #374151' },
    terminalHeader: { backgroundColor: '#1f2937', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', color: '#d1d5db', fontSize: '0.85rem', borderBottom: '1px solid #374151', fontWeight: 'bold' },
    terminalBody: { padding: '16px', height: '300px', overflowY: 'auto' },
    terminalText: { color: '#4ade80', fontFamily: 'monospace', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap' },

    // Modals
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
    modalContentSmall: { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    modalContentLarge: { backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '1000px', height: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    modalHeader: { padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' },
    modalBody: { padding: '20px', overflowY: 'auto', flex: 1 },
    modalFooter: { padding: '16px 20px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'flex-end' },
    closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
    
    // Forms
    label: { display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#374151' },
    input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' }
};

export default AutomationConsole;