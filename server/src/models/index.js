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
const Notification = require('./Notification');
const Conversation = require('./Conversation'); 
const Message = require('./Message');           

const db = {
  Sequelize,
  sequelize,
  User,
  Job,
  CV,
  Application,
  SavedJob,
  Score,
  Notification,
  Conversation,
  Message,
};

let associationsApplied = false;

function applyAssociations() {
  if (associationsApplied) return;
  associationsApplied = true;

  // User (employer) -> Job (1-N)
  db.User.hasMany(db.Job, {
    foreignKey: 'employerId',
    as: 'jobs',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.Job.belongsTo(db.User, { foreignKey: 'employerId', as: 'employer' });

  // User (candidate) -> CV (1-N)
  db.User.hasMany(db.CV, {
    foreignKey: 'candidateId',
    as: 'cvs',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.CV.belongsTo(db.User, { foreignKey: 'candidateId', as: 'candidate' });

  // User (candidate) -> Application (1-N)
  db.User.hasMany(db.Application, {
    foreignKey: 'candidateId',
    as: 'applications',
  });
  db.Application.belongsTo(db.User, {
    foreignKey: 'candidateId',
    as: 'candidate',
  });

  // Job -> Application (1-N)
  db.Job.hasMany(db.Application, {
    foreignKey: 'jobId',
    as: 'applications',
  });
  db.Application.belongsTo(db.Job, {
    foreignKey: 'jobId',
    as: 'job',
  });

  // CV -> Application (1-N)
  db.CV.hasMany(db.Application, {
    foreignKey: 'cvId',
    as: 'applications',
  });
  db.Application.belongsTo(db.CV, {
    foreignKey: 'cvId',
    as: 'cv',
    onDelete: 'SET NULL',
  });

  // Application -> Score (1-N)
  db.Application.hasMany(db.Score, {
    foreignKey: 'applicationId',
    as: 'scores',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.Score.belongsTo(db.Application, {
    foreignKey: 'applicationId',
    as: 'application',
  });

  // Saved jobs (N-N): users <-> jobs qua saved_jobs
  db.User.belongsToMany(db.Job, {
    through: db.SavedJob,
    foreignKey: 'userId',
    otherKey: 'jobId',
    as: 'savedJobs',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.Job.belongsToMany(db.User, {
    through: db.SavedJob,
    foreignKey: 'jobId',
    otherKey: 'userId',
    as: 'savedByUsers',
    onDelete: 'CASCADE',
    hooks: true,
  });

  // User -> Notification (1-N)
  db.User.hasMany(db.Notification, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.Notification.belongsTo(db.User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Job -> Notification (1-N) - optional
  db.Job.hasMany(db.Notification, {
    foreignKey: 'jobId',
    as: 'notifications',
    onDelete: 'SET NULL',
  });
  db.Notification.belongsTo(db.Job, {
    foreignKey: 'jobId',
    as: 'job',
  });

  // ==== Chat associations ====

  // User (employer/candidate) -> Conversation (1-N)
  db.User.hasMany(db.Conversation, {
    foreignKey: 'employerId',
    as: 'employerConversations',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.User.hasMany(db.Conversation, {
    foreignKey: 'candidateId',
    as: 'candidateConversations',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.Conversation.belongsTo(db.User, {
    foreignKey: 'employerId',
    as: 'employer',
  });
  db.Conversation.belongsTo(db.User, {
    foreignKey: 'candidateId',
    as: 'candidate',
  });

  // Job -> Conversation (1-N)
  db.Job.hasMany(db.Conversation, {
    foreignKey: 'jobId',
    as: 'conversations',
    onDelete: 'SET NULL',
  });
  db.Conversation.belongsTo(db.Job, {
    foreignKey: 'jobId',
    as: 'job',
  });

  // Conversation -> Message (1-N)
  db.Conversation.hasMany(db.Message, {
    foreignKey: 'conversationId',
    as: 'messages',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.Message.belongsTo(db.Conversation, {
    foreignKey: 'conversationId',
    as: 'conversation',
  });

  // User -> Message (1-N)
  db.User.hasMany(db.Message, {
    foreignKey: 'senderId',
    as: 'messages',
    onDelete: 'CASCADE',
    hooks: true,
  });
  db.Message.belongsTo(db.User, {
    foreignKey: 'senderId',
    as: 'sender',
  });
}

applyAssociations();

// Tuỳ chọn: db.sync() nếu cần ở nơi khác
db.sync = (options = {}) => db.sequelize.sync(options);

module.exports = db;