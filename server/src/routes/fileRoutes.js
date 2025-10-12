const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { auth } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    try {
      await fs.access(uploadDir);
    } catch (error) {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// Upload file
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded'
      });
    }

    const fileData = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.userId
    };

    res.status(201).json({
      message: 'File uploaded successfully',
      data: fileData
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      message: 'Failed to upload file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Download file
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real application, you would get file info from database
    // For now, we'll use the file path directly
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', id);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    res.download(filePath);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      message: 'Failed to download file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', id);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      return res.status(404).json({
        message: 'File not found'
      });
    }

    res.json({
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get file info
const getFileInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', id);
    
    try {
      const stats = await fs.stat(filePath);
      res.json({
        message: 'File info retrieved successfully',
        data: {
          id,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        }
      });
    } catch (error) {
      return res.status(404).json({
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      message: 'Failed to get file info',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Routes
router.post('/upload', upload.single('file'), uploadFile);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);
router.get('/:id', getFileInfo);

module.exports = router;
