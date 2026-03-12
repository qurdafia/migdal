import React, { useState, useEffect } from 'react';

import api from '../api' 

const AutomationJobsList = () => {
    const [jobs, setJobs] = useState([]);
    const [activeRunId, setActiveRunId] = useState(null);
    const [liveLogs, setLiveLogs] = useState("");
    const [runStatus, setRunStatus] = useState("");

    // 1. Fetch the available Jobs on load
    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const response = await api.get('automation/jobs/');
            
            // 🛡️ Safe Extraction: Grab the 'results' array if paginated, otherwise fallback to raw data
            const jobData = response.data.results || response.data;
            
            // Ensure it's definitively an array before setting state to prevent .map crashes
            setJobs(Array.isArray(jobData) ? jobData : []);
            
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
            setJobs([]); // Fallback to empty array on error
        }
    };

    // 2. The Magic "Run" Button Handler
    const handleRunJob = async (jobId) => {
        setLiveLogs("Initializing job... waiting for backend engine...");
        setRunStatus("pending");
        
        try {
            const response = await api.post(`automation/jobs/${jobId}/execute/`);
            
            if (response.data.run_id) {
                // Set the active run ID, which triggers the polling effect below
                setActiveRunId(response.data.run_id);
            }
        } catch (error) {
            console.error("Failed to execute job:", error);
            setLiveLogs("Critical Error: Could not reach the Migdal backend.");
        }
    };

    // 3. The Live Polling Engine (Terminal Streamer)
    useEffect(() => {
        let pollInterval;

        const pollLogs = async () => {
            if (!activeRunId) return;

            try {
                const response = await api.get(`automation/runs/${activeRunId}/`);
                const data = response.data;

                setRunStatus(data.status);
                if (data.stdout) {
                    setLiveLogs(data.stdout);
                }

                // If the job finishes or crashes, stop polling!
                if (data.status === 'successful' || data.status === 'failed' || data.status === 'canceled') {
                    clearInterval(pollInterval);
                }
            } catch (error) {
                console.error("Failed to fetch logs:", error);
            }
        };

        // If we have an active run, poll every 2 seconds
        if (activeRunId && (runStatus === 'pending' || runStatus === 'running')) {
            pollInterval = setInterval(pollLogs, 2000);
        }

        // Cleanup the interval when the component unmounts or run finishes
        return () => clearInterval(pollInterval);
    }, [activeRunId, runStatus]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Automation Jobs</h1>
            
            {/* The Job Table */}
            <div className="bg-white shadow rounded-lg mb-8">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {jobs.map(job => (
                            <tr key={job.id}>
                                <td className="px-6 py-4 font-medium text-gray-900">{job.name}</td>
                                <td className="px-6 py-4 text-gray-500">{job.cron_schedule || 'Manual'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {job.is_active ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleRunJob(job.id)}
                                        disabled={!job.is_active || runStatus === 'running'}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                    >
                                        Run Now
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* The Live Terminal Display */}
            {activeRunId && (
                <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden mt-8">
                    <div className="bg-gray-800 px-4 py-2 flex justify-between items-center border-b border-gray-700">
                        <span className="text-gray-300 font-mono text-sm">Live Execution Logs</span>
                        <span className={`text-xs font-bold uppercase ${runStatus === 'successful' ? 'text-green-400' : runStatus === 'failed' ? 'text-red-400' : 'text-yellow-400 animate-pulse'}`}>
                            {runStatus}
                        </span>
                    </div>
                    <div className="p-4 h-64 overflow-y-auto">
                        <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                            {liveLogs}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutomationJobsList;