const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const auth = require('../../middleware/auth');
const ctrl = require('../../controllers/web/roles');

router.get('/', auth, ctrl.list);
router.post('/', auth, [
  body('name').trim().notEmpty().isLength({ max: 50 }),
  body('description').optional().isLength({ max: 255 }),
  body('permissions').isArray().withMessage('permissions must be an array of strings')
], ctrl.create);

router.put('/:id', auth, [
  param('id').isInt(),
  body('name').trim().notEmpty().isLength({ max: 50 }),
  body('description').optional().isLength({ max: 255 }),
  body('permissions').isArray()
], ctrl.update);

router.delete('/:id', auth, [ param('id').isInt() ], ctrl.remove);

module.exports = router;
