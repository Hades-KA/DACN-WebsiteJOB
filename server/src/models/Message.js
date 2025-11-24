// server/src/models/Message.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },

    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    senderType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['employer', 'candidate', 'system']],
      },
    },

    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    attachments: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('attachments');
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      set(value) {
        if (!value) {
          this.setDataValue('attachments', null);
        } else if (Array.isArray(value)) {
          this.setDataValue('attachments', JSON.stringify(value));
        } else {
          this.setDataValue('attachments', JSON.stringify([value]));
        }
      },
    },

    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'messages',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false,
  }
);

module.exports = Message;