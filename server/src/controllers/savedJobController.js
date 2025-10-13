const { SavedJob, Job } = require('../models');

const listSavedJobs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const jobs = await Job.findAll({
      include: [
        {
          association: 'savedByUsers',
          attributes: ['id'],
          where: { id: userId },
          required: true,
          through: { attributes: [] }
        }
      ]
    });
    return res.json({ message: 'OK', data: jobs });
  } catch (err) {
    console.error('List saved jobs error:', err);
    return res.status(500).json({ message: 'Failed to fetch saved jobs' });
  }
};

const saveJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: 'jobId is required' });
    await SavedJob.findOrCreate({ where: { userId, jobId }, defaults: { userId, jobId } });
    res.status(201).json({ message: 'Saved' });
  } catch (err) {
    console.error('Save job error:', err);
    res.status(500).json({ message: 'Failed to save job' });
  }
};

const unsaveJob = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobId } = req.params;
    if (!jobId) return res.status(400).json({ message: 'jobId is required' });
    await SavedJob.destroy({ where: { userId, jobId } });
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error('Unsave job error:', err);
    res.status(500).json({ message: 'Failed to remove saved job' });
  }
};

module.exports = { listSavedJobs, saveJob, unsaveJob };
