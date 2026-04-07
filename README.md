# NITK Assist Platform

NITK Assist is an advanced, agentic Retrieval-Augmented Generation (RAG) platform and event aggregator tailored for the student community. The project utilizes a microservices architecture separated into an AI Engine (Python), a core backend server (Node.js/Express), and a client interface (React/Vite).

---

## 🛠 Prerequisites
Before running this project, ensure you have the following installed on your machine:
- **Node.js** (v18+)
- **Python** (v3.10+)
- **MySQL Server** (running locally)

---

## 🚀 Step-by-Step Setup Guide

Follow these instructions strictly in order to set up the project locally.

### 1. Database & Backend Setup (. \\backend)
The backend manages users, events, and clubs using Prisma ORM with a MySQL database.

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Duplicate the `.env.example` file and rename it to `.env`.
   - Update `DATABASE_URL` with your local MySQL credentials.
   - Fill in your `JWT_SECRET` and `SYSTEM_API_KEY`.
4. Initialize the database schema:
   ```bash
   npx prisma db push
   ```
5. Seed the database with sample dummy clubs and events (highly recommended for new local setups):
   ```bash
   node seed.js
   ```
6. Start the backend server:
   ```bash
   npm start
   ```
   *(By default, this will run on `http://localhost:5000`)*

---

### 2. AI Service Engine (. \\ai-service)
The AI service powers the LangGraph RAG pipeline and processes factual queries and PDF retrieval.

1. Open a **new** terminal split and navigate to the ai-service directory:
   ```bash
   cd ai-service
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate it (Windows)
   .\venv\Scripts\activate

   # Activate it (Mac/Linux)
   source venv/bin/activate
   ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   - Duplicate `.env.example` and rename it to `.env`.
   - Add your API keys (`GROQ_API_KEY`, etc.).
5. Start the AI service:
   ```bash
   python main.py
   ```
   *(By default, this will run on `http://localhost:8000`)*

---

### 3. Frontend Client (. \\frontend)
The frontend uses React and Vite to provide the Chat interface and Calendar integrations.

1. Open a **third** terminal split and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. The terminal will output a local address (usually `http://localhost:5173`). Open this link in your browser to view the application!

---

## 🏗 Architecture Overview

- **Frontend**: Handles user interactions, calendar synchronization (Google Calendar API), and chatbot UI.
- **Backend Node.js**: Acts as the main router. Handles authentication, database interactions (Prisma), and forward requests to the AI Service.
- **AI Service Python**: LangGraph orchestration. It takes queries, intelligently routes them, retrieves from Chroma vector DB using BM25 and Flashrank reranking, and synthesizes answers using Groq LLMs.
