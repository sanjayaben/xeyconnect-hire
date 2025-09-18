const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subfolder = 'general';
    
    if (file.fieldname === 'resume') {
      subfolder = 'resumes';
    } else if (file.fieldname === 'jobDescription') {
      subfolder = 'job-descriptions';
    } else if (file.fieldname === 'testPaper') {
      subfolder = 'test-papers';
    } else if (file.fieldname === 'answerSheet') {
      subfolder = 'answer-sheets';
    }
    
    const fullPath = path.join(uploadDir, subfolder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    resume: ['.pdf', '.doc', '.docx'],
    jobDescription: ['.pdf', '.doc', '.docx'],
    testPaper: ['.pdf', '.doc', '.docx'],
    answerSheet: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
  };
  
  const ext = path.extname(file.originalname).toLowerCase();
  const fieldAllowedTypes = allowedTypes[file.fieldname] || ['.pdf', '.doc', '.docx'];
  
  if (fieldAllowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${fieldAllowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
