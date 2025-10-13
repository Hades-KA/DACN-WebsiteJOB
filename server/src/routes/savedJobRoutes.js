const express = require('express');
const { auth } = require('../middleware/auth');
const { listSavedJobs, saveJob, unsaveJob } = require('../controllers/savedJobController');

const router = express.Router();

router.get('/', auth, listSavedJobs);
router.post('/', auth, saveJob);
router.delete('/:jobId', auth, unsaveJob);

module.exports = router;
