const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Job = require('./Job');
const CV = require('./CV');
const Application = require('./Application');
const SavedJob = require('./SavedJob');

// Define associations
User.hasMany(Job, { foreignKey: 'employerId', as: 'jobs' });
Job.belongsTo(User, { foreignKey: 'employerId', as: 'employer' });

User.hasMany(CV, { foreignKey: 'candidateId', as: 'cvs' });
CV.belongsTo(User, { foreignKey: 'candidateId', as: 'candidate' });

User.hasMany(Application, { foreignKey: 'candidateId', as: 'applications' });
Application.belongsTo(User, { foreignKey: 'candidateId', as: 'candidate' });

Job.hasMany(Application, { foreignKey: 'jobId', as: 'applications' });
Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });

CV.hasMany(Application, { foreignKey: 'cvId', as: 'applications' });
Application.belongsTo(CV, { foreignKey: 'cvId', as: 'cv' });

// Saved jobs (many-to-many)
User.belongsToMany(Job, { through: SavedJob, foreignKey: 'userId', otherKey: 'jobId', as: 'savedJobs' });
Job.belongsToMany(User, { through: SavedJob, foreignKey: 'jobId', otherKey: 'userId', as: 'savedByUsers' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Job,
  CV,
  Application,
  SavedJob
};
