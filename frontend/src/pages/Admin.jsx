import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Admin() {
    // Document State
    const [file, setFile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Club State
    const [clubs, setClubs] = useState([]);
    const [clubForm, setClubForm] = useState({ name: '', handle: '', description: '' });
    const [clubLoading, setClubLoading] = useState(false);

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/ai/documents');
            setDocuments(res.data);
        } catch {
            console.error("Failed to load document list");
        }
    };

    const fetchClubs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/clubs', { headers: { Authorization: `Bearer ${token}` } });
            setClubs(res.data);
        } catch {
            console.error("Failed to load clubs list");
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchClubs();
    }, []);

    const handleUpload = async () => {
        if (!file) return alert("Select a PDF first");

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            await api.post('/ai/upload', formData);
            setFile(null);
            alert("Document ingested successfully!");
            await fetchDocuments();
        } catch {
            alert("Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename) => {
        if (!window.confirm(`Delete ${filename}?`)) return;

        try {
            await api.delete(`/ai/documents/${filename}`);
            await fetchDocuments();
        } catch {
            alert("Delete failed");
        }
    };

    const handleAddClub = async () => {
        if (!clubForm.name || !clubForm.handle) return alert("Name and Handle are required");

        try {
            setClubLoading(true);
            const token = localStorage.getItem('token');
            await api.post('/api/clubs', clubForm, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setClubForm({ name: '', handle: '', description: '' });
            alert("Club registered successfully!");
            await fetchClubs();
        } catch (err) {
            alert(err.response?.data?.message || "Club creation failed");
        } finally {
            setClubLoading(false);
        }
    };

    const handleRunScraper = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/api/events/scrape', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data.message);
        } catch (err) {
            alert("Failed to manually trigger the scraper.");
        }
    };

    const handleDeleteClub = async (id, name) => {
        if (!window.confirm(`Delete ${name} from ingester? This will remove all their events too.`)) return;

        try {
            const token = localStorage.getItem('token');
            await api.delete(`/api/clubs/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Club deleted successfully!");
            await fetchClubs();
        } catch (err) {
            alert("Failed to delete club.");
        }
    };

    return (
        <div style={{ padding: '0 20px' }}>
            <div className="feed-header text-center" style={{ marginBottom: '40px' }}>
                <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>System Administration</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Manage the knowledge engine and data pipelines.</p>
            </div>

            <div className="admin-page">
                {/* AI Document Management */}
                <div className="glass-panel" style={{ padding: '30px' }}>
                    <h3 style={{ marginBottom: '20px', color: '#fff' }}>1. AI Knowledge Base (PDFs)</h3>
                    
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ color: '#fff', marginBottom: '4px' }}>Upload Context</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Add rulebooks, calendars, or syllabus PDFs.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files[0])}
                                style={{ color: 'var(--text-secondary)' }}
                            />
                            <button
                                className="btn-primary"
                                style={{ width: 'auto' }}
                                onClick={handleUpload}
                                disabled={loading}
                            >
                                {loading ? "Indexing..." : "Ingest PDF"}
                            </button>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>File Name</th>
                                    <th>Chunks</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>No PDFs indexed yet.</td>
                                    </tr>
                                ) : (
                                    documents.map(doc => (
                                        <tr key={doc.filename}>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{doc.filename}</td>
                                            <td>{doc.chunks}</td>
                                            <td>
                                                <span className={`status-badge ${doc.status === 'indexed' ? 'indexed' : 'pending'}`}>
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="btn-logout"
                                                    style={{ padding: '6px 12px' }}
                                                    onClick={() => handleDelete(doc.filename)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Instagram Club Scraper Management */}
                <div className="glass-panel" style={{ padding: '30px', marginTop: '30px' }}>
                    <h3 style={{ marginBottom: '20px', color: '#fff' }}>2. Data Pipelines (Clubs)</h3>
                    
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: 'var(--radius-lg)', marginBottom: '24px' }}>
                        <h4 style={{ color: '#fff', marginBottom: '8px' }}>Register a Club Handle</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>The Apify worker will scrape these handles automatically for new events.</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                            <input 
                                type="text" 
                                placeholder="Club Name" 
                                className="form-input"
                                value={clubForm.name}
                                onChange={e => setClubForm({...clubForm, name: e.target.value})}
                            />
                            <input 
                                type="text" 
                                placeholder="Instagram Handle" 
                                className="form-input"
                                value={clubForm.handle}
                                onChange={e => setClubForm({...clubForm, handle: e.target.value})}
                            />
                            <input 
                                type="text" 
                                placeholder="Short Description..." 
                                className="form-input"
                                value={clubForm.description}
                                onChange={e => setClubForm({...clubForm, description: e.target.value})}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <button
                                className="btn-secondary"
                                onClick={handleAddClub}
                                disabled={clubLoading}
                            >
                                {clubLoading ? "Registering..." : "+ Register Target"}
                            </button>
                            <button
                                className="btn-primary"
                                style={{ width: 'auto' }}
                                onClick={handleRunScraper}
                            >
                                Trigger Event Scraper
                            </button>
                        </div>
                    </div>

                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Club Name</th>
                                    <th>Handle</th>
                                    <th>Description</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clubs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>No targets registered.</td>
                                    </tr>
                                ) : (
                                    clubs.map(club => (
                                        <tr key={club.id}>
                                            <td style={{ color: '#fff', fontWeight: '500' }}>{club.name}</td>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--accent-purple)' }}>@{club.handle}</td>
                                            <td>{club.description || "-"}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="btn-logout"
                                                    style={{ padding: '6px 12px' }}
                                                    onClick={() => handleDeleteClub(club.id, club.name)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
