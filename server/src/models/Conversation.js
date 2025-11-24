// server/src/models/Conversation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Conversation = sequelize.define(
  'Conversation',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    employerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    candidateId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    lastMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastSenderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    lastSenderType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['employer', 'candidate', 'system']],
      },
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    unreadForEmployer: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    unreadForCandidate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    isArchivedByEmployer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isArchivedByCandidate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: 'conversations',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

module.exports = Conversation;