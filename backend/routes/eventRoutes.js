const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', eventController.getAllEvents); // Public or Chatbot use
router.get('/personalized', authMiddleware(), eventController.getPersonalizedEvents);

// Admin-only routes
router.post('/', authMiddleware(['admin']), eventController.createEvent);
router.post('/scrape', authMiddleware(['admin']), eventController.triggerScraper);

module.exports = router;
