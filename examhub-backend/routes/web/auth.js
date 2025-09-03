const express = require('express');
const router = express.Router();
const authController = require('../../controllers/web/authController');

router.get('/test', (req, res) => {
  console.log('Test GET endpoint hit');
  res.json({ message: 'Test route working' });
});

router.post('/login', authController.login);

module.exports = router;
