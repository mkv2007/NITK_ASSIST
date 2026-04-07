const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temporary storage for PDFs

// Students can ask questions
router.post('/ask', authMiddleware(['student', 'admin']), aiController.askQuestion);

// ONLY Admins can upload or delete [cite: 104, 112]
router.post('/upload', authMiddleware(['admin']), upload.single('file'), aiController.uploadDocument);
router.delete('/delete/:filename', authMiddleware(['admin']), aiController.deleteDocument);

router.get('/documents', aiController.listDocuments);

module.exports = router;