require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Core Route Controllers
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const clubRoutes = require('./routes/clubRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

// Middleware Setup
// CORS allows the React frontend to communicate with this backend API
app.use(cors());
// Parse incoming JSON payloads
app.use(express.json());

// Main Application Routes
app.use('/auth', authRoutes);        // Authentication (Login/Register) using Prisma + JWT
app.use('/ai', aiRoutes);            // AI endpoints communicating with Python LangGraph service
app.use('/api/clubs', clubRoutes);   // Club management and Instagram integration 
app.use('/api/events', eventRoutes); // Event fetching for the frontend Calendar

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});