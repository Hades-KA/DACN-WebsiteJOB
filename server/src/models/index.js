// server/src/models/index.js
'use strict';

const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const User = require('./User');
const Job = require('./Job');
const CV = require('./CV');
const Application = require('./Application');
const SavedJob = require('./SavedJob');
const Score = require('./Score');

const db = {
  Sequelize,
  sequelize,
  User,
  Job,
  CV,
  Application,
  SavedJob,
  Score,
};

let associationsApplied = false;

function applyAssociations() {
  if (associationsApplied) return;
  associationsApplied = true;

  // User (employer) -> Job (1-N)
  db.User.hasMany(db.Job, { foreignKey: 'employerId', as: 'jobs', onDelete: 'CASCADE', hooks: true });
  db.Job.belongsTo(db.User, { foreignKey: 'employerId', as: 'employer' });

  // User (candidate) -> CV (1-N)
  db.User.hasMany(db.CV, { foreignKey: 'candidateId', as: 'cvs', onDelete: 'CASCADE', hooks: true });
  db.CV.belongsTo(db.User, { foreignKey: 'candidateId', as: 'candidate' });

  // User (candidate) -> Application (1-N)
  db.User.hasMany(db.Application, { foreignKey: 'candidateId', as: 'applications' });
  db.Application.belongsTo(db.User, { foreignKey: 'candidateId', as: 'candidate' });

  // Job -> Application (1-N)
  db.Job.hasMany(db.Application, { foreignKey: 'jobId', as: 'applications' });
  db.Application.belongsTo(db.Job, { foreignKey: 'jobId', as: 'job' });

  // CV -> Application (1-N)
  db.CV.hasMany(db.Application, { foreignKey: 'cvId', as: 'applications' });
  db.Application.belongsTo(db.CV, { foreignKey: 'cvId', as: 'cv', onDelete: 'SET NULL' });

  // Application -> Score (1-N)
  db.Application.hasMany(db.Score, { foreignKey: 'applicationId', as: 'scores', onDelete: 'CASCADE', hooks: true });
  db.Score.belongsTo(db.Application, { foreignKey: 'applicationId', as: 'application' });

  // Saved jobs (N-N): users <-> jobs qua saved_jobs
  db.User.belongsToMany(db.Job, { through: db.SavedJob, foreignKey: 'userId', otherKey: 'jobId', as: 'savedJobs', onDelete: 'CASCADE', hooks: true });
  db.Job.belongsToMany(db.User, { through: db.SavedJob, foreignKey: 'jobId', otherKey: 'userId', as: 'savedByUsers', onDelete: 'CASCADE', hooks: true });
}

applyAssociations();

// Tuỳ chọn: db.sync() nếu cần ở nơi khác
db.sync = (options = {}) => db.sequelize.sync(options);

module.exports = db;