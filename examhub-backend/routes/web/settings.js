// routes/settings.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../../middleware/auth');
const settingsController = require('../../controllers/web/settings');

router.get('/', auth, settingsController.getSettings);
router.put(
  '/:key',
  auth,
  [body('setting_value').notEmpty()],
  settingsController.updateSetting
);
router.get('/metrics', auth, settingsController.getUserMetrics);
router.get('/default-roles', auth, settingsController.getDefaultRoles);

module.exports = router;
