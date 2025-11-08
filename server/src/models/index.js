const { sequelize } = require('../config/database');

// Nạp các model (mỗi model tự dùng chung instance sequelize từ config)
const User = require('./User');
const Job = require('./Job');
const CV = require('./CV');
const Application = require('./Application');
const SavedJob = require('./SavedJob');

// Tách hàm applyAssociations để đảm bảo khai báo 1 lần, gọn và rõ ràng
function applyAssociations() {
  // User (employer) -> Job (1-N)
  // SQL: FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE CASCADE
  User.hasMany(Job, {
    foreignKey: 'employerId',
    as: 'jobs',
    onDelete: 'CASCADE',
    hooks: true,
  });
  Job.belongsTo(User, {
    foreignKey: 'employerId',
    as: 'employer',
  });

  // User (candidate) -> CV (1-N)
  // SQL: FOREIGN KEY (candidateId) REFERENCES users(id) ON DELETE CASCADE
  User.hasMany(CV, {
    foreignKey: 'candidateId',
    as: 'cvs',
    onDelete: 'CASCADE',
    hooks: true,
  });
  CV.belongsTo(User, {
    foreignKey: 'candidateId',
    as: 'candidate',
  });

  // User (candidate) -> Application (1-N)
  // SQL: FOREIGN KEY (candidateId) REFERENCES users(id) ON DELETE NO ACTION (mặc định)
  User.hasMany(Application, {
    foreignKey: 'candidateId',
    as: 'applications',
  });
  Application.belongsTo(User, {
    foreignKey: 'candidateId',
    as: 'candidate',
  });

  // Job -> Application (1-N)
  // SQL: FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE NO ACTION
  Job.hasMany(Application, {
    foreignKey: 'jobId',
    as: 'applications',
  });
  Application.belongsTo(Job, {
    foreignKey: 'jobId',
    as: 'job',
  });

  // CV -> Application (1-N)
  // SQL: FOREIGN KEY (cvId) REFERENCES cvs(id) ON DELETE SET NULL
  CV.hasMany(Application, {
    foreignKey: 'cvId',
    as: 'applications',
  });
  Application.belongsTo(CV, {
    foreignKey: 'cvId',
    as: 'cv',
    onDelete: 'SET NULL',
  });

  // Saved jobs (N-N): users <-> jobs qua bảng saved_jobs
  // SQL: cả 2 FK ON DELETE CASCADE
  User.belongsToMany(Job, {
    through: SavedJob,
    foreignKey: 'userId',
    otherKey: 'jobId',
    as: 'savedJobs',
    onDelete: 'CASCADE',
    hooks: true,
  });
  Job.belongsToMany(User, {
    through: SavedJob,
    foreignKey: 'jobId',
    otherKey: 'userId',
    as: 'savedByUsers',
    onDelete: 'CASCADE',
    hooks: true,
  });
}

// Áp dụng quan hệ (chỉ cần gọi 1 lần khi load models)
applyAssociations();

module.exports = {
  sequelize,
  User,
  Job,
  CV,
  Application,
  SavedJob,
};