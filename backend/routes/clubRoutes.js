const express = require('express');
const router = express.Router();
const clubController = require('../controllers/clubController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', clubController.getAllClubs);
// Admin only route to create clubs
router.post('/', authMiddleware(['admin']), clubController.createClub);
// Admin only route to delete clubs
router.delete('/:id', authMiddleware(['admin']), clubController.deleteClub);
router.post('/:id/follow', authMiddleware(), clubController.toggleFollowClub);
router.get('/my-clubs', authMiddleware(), clubController.getUserClubs);

module.exports = router;
