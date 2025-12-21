import { useState } from 'react';
import api from '../services/api';

export default function Admin() {
    const [file, setFile] = useState(null);

    const handleUpload = async () => {
        if(!file) return alert("Select a PDF first");
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            await api.post('/ai/upload', formData);
            alert("Document added to NITK Knowledge Base!");
        } catch (err) {
            alert("Upload failed.");
        }
    };

    return (
        <div>
            <h2>Admin Management</h2>
            <p>Upload new PDFs (Hostel rules, Syllabi, etc.) to the KURSE engine.</p>
            <div className="admin-card">
                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} />
                <br /><br />
                <button className="btn-primary" style={{width: '200px'}} onClick={handleUpload}>
                    Ingest Document
                </button>
            </div>
        </div>
    );
}