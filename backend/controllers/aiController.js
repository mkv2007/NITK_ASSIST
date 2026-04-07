const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// -----------------------------
// ASK QUESTION
// -----------------------------
exports.askQuestion = async (req, res) => {
    try {
        const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/ask`,
            { 
                query: req.body.query,
                history: req.body.history || []
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error("AI Service Error:", error.response?.data || error.message);
        res.status(500).json({ error: "AI Service is offline or returned an error." });
    }
};


// -----------------------------
// UPLOAD DOCUMENT
// -----------------------------
exports.uploadDocument = async (req, res) => {
    try {
        const form = new FormData();

        // actual file stream
        form.append('file', fs.createReadStream(req.file.path));

        // IMPORTANT: send original filename
        form.append('original_filename', req.file.originalname);

        const response = await axios.post(
            `${process.env.AI_SERVICE_URL}/admin/ingest`,
            form,
            { headers: form.getHeaders() }
        );

        fs.unlinkSync(req.file.path);
        res.json(response.data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to ingest document." });
    }
};

// -----------------------------
// LIST DOCUMENTS (NEW)
// -----------------------------
exports.listDocuments = async (req, res) => {
    try {
        const response = await axios.get(
            `${process.env.AI_SERVICE_URL}/admin/documents`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch document list." });
    }
};


// -----------------------------
// DELETE DOCUMENT
// -----------------------------
exports.deleteDocument = async (req, res) => {
    try {
        const response = await axios.delete(
            `${process.env.AI_SERVICE_URL}/admin/documents/${req.params.filename}`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Could not delete document." });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const response = await axios.get(
            `${process.env.AI_SERVICE_URL}/admin/documents`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch documents." });
    }
};
