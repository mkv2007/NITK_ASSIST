
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

exports.askQuestion = async (req, res) => {
    try {
        // Log the outgoing request for debugging
        console.log("Sending query to AI Service:", req.body.query);

        const response = await axios.post(`${process.env.AI_SERVICE_URL}/ask`, { 
            query: req.body.query 
        });

        // Ensure we send back the object React expects
        // Python returns { "answer": "..." }, so response.data already has the key
        res.json(response.data); 
    } catch (error) {
        // This log will tell you EXACTLY why it's failing in your terminal
        console.error("AI Service Error:", error.response?.data || error.message);
        res.status(500).json({ error: "AI Service is offline or returned an error." });
    }
};

exports.uploadDocument = async (req, res) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(req.file.path));

        const response = await axios.post(`${process.env.AI_SERVICE_URL}/admin/ingest`, form, {
            headers: { ...form.getHeaders() }
        });

        fs.unlinkSync(req.file.path); 
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to ingest document." });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const response = await axios.delete(`${process.env.AI_SERVICE_URL}/admin/documents/${req.params.filename}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Could not delete document." });
    }
};