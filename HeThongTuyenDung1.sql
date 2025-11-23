-- =====================================================
-- HỆ THỐNG TUYỂN DỤNG - DATABASE SCHEMA
-- Phiên bản: 2.1 (Bổ sung AI Scoring + Notifications System)
-- Cập nhật: 19/11/2024
-- Mô tả: Schema đầy đủ cho hệ thống tuyển dụng với AI scoring và thông báo realtime
-- =====================================================

-- =====================================================
-- 0. TẠO DATABASE
-- =====================================================
IF DB_ID(N'HeThongTuyenDung') IS NULL
BEGIN
    CREATE DATABASE [HeThongTuyenDung];
    PRINT '✅ Đã tạo database HeThongTuyenDung';
END
ELSE
BEGIN
    PRINT 'ℹ️ Database HeThongTuyenDung đã tồn tại';
END
GO

USE [HeThongTuyenDung];
GO

PRINT '';
PRINT '========================================';
PRINT '   BẮT ĐẦU TẠO CẤU TRÚC DATABASE';
PRINT '========================================';
PRINT '';

-- =====================================================
-- 1. BẢNG USERS - Quản lý người dùng (Candidate/Employer/Admin)
-- =====================================================
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[users] (
        -- Thông tin cơ bản
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [name] NVARCHAR(100) NOT NULL,
        [email] NVARCHAR(255) NOT NULL UNIQUE,
        [password] NVARCHAR(255) NOT NULL,
        [phone] NVARCHAR(20) NULL,
        [userType] NVARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK ([userType] IN ('candidate','employer','admin')),
        [company] NVARCHAR(255) NULL,
        [avatar] NVARCHAR(500) NULL,
        
        -- Trạng thái tài khoản
        [isActive] BIT NOT NULL DEFAULT 1,
        [isVerified] BIT NOT NULL DEFAULT 0,
        [lastLogin] DATETIME NULL,
        
        -- Reset password & verification
        [resetPasswordToken] NVARCHAR(255) NULL,
        [resetPasswordExpires] DATETIME NULL,
        [verificationToken] NVARCHAR(255) NULL,

        -- Hồ sơ ứng viên (Candidate Profile)
        [position] NVARCHAR(255) NULL,
        [location] NVARCHAR(255) NULL,
        [about] NVARCHAR(MAX) NULL,
        [skills] NVARCHAR(MAX) NULL,
        [experience] NVARCHAR(MAX) NULL,
        [education] NVARCHAR(MAX) NULL,
        [level] NVARCHAR(50) NULL,
        [workType] NVARCHAR(50) NULL,
        [degree] NVARCHAR(50) NULL,
        [jobCategory] NVARCHAR(100) NULL,
        [experienceBand] NVARCHAR(50) NULL,
        [expectedSalary] INT NULL,
        [birthdate] DATE NULL,
        [address] NVARCHAR(255) NULL,
        [gender] NVARCHAR(10) NULL,
        [maritalStatus] NVARCHAR(20) NULL,
        [jobAlertOn] BIT NOT NULL DEFAULT 1,
        [careerGoals] NVARCHAR(MAX) NULL,

        -- Metadata CV
        [cvUrl] NVARCHAR(500) NULL,
        [cvName] NVARCHAR(255) NULL,
        [cvSize] INT NULL,

        -- Hồ sơ công ty (Employer Profile)
        [companyWebsite] NVARCHAR(255) NULL,
        [companySize] NVARCHAR(50) NULL, 
        [industry] NVARCHAR(100) NULL,
        [taxCode] NVARCHAR(50) NULL,
        [businessLicense] NVARCHAR(100) NULL,
        [companyCity] NVARCHAR(100) NULL,
        [companyAddress] NVARCHAR(255) NULL,
        [logoUrl] NVARCHAR(500) NULL,
        [companyAbout] NVARCHAR(MAX) NULL,

        -- Timestamps
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );
    PRINT '✅ Đã tạo bảng: users';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng users đã tồn tại - Đang kiểm tra cấu trúc...';
    
    -- SAFE PATCH: Thêm các cột nếu thiếu
    IF COL_LENGTH('dbo.users','companyWebsite') IS NULL   ALTER TABLE dbo.users ADD companyWebsite NVARCHAR(255);
    IF COL_LENGTH('dbo.users','companySize') IS NULL      ALTER TABLE dbo.users ADD companySize NVARCHAR(50);
    IF COL_LENGTH('dbo.users','industry') IS NULL         ALTER TABLE dbo.users ADD industry NVARCHAR(100);
    IF COL_LENGTH('dbo.users','taxCode') IS NULL          ALTER TABLE dbo.users ADD taxCode NVARCHAR(50);
    IF COL_LENGTH('dbo.users','businessLicense') IS NULL  ALTER TABLE dbo.users ADD businessLicense NVARCHAR(100);
    IF COL_LENGTH('dbo.users','companyCity') IS NULL      ALTER TABLE dbo.users ADD companyCity NVARCHAR(100);
    IF COL_LENGTH('dbo.users','companyAddress') IS NULL   ALTER TABLE dbo.users ADD companyAddress NVARCHAR(255);
    IF COL_LENGTH('dbo.users','logoUrl') IS NULL          ALTER TABLE dbo.users ADD logoUrl NVARCHAR(500);
    IF COL_LENGTH('dbo.users','companyAbout') IS NULL     ALTER TABLE dbo.users ADD companyAbout NVARCHAR(MAX);
    IF COL_LENGTH('dbo.users','level') IS NULL            ALTER TABLE dbo.users ADD [level] NVARCHAR(50);
    IF COL_LENGTH('dbo.users','workType') IS NULL         ALTER TABLE dbo.users ADD [workType] NVARCHAR(50);
    IF COL_LENGTH('dbo.users','degree') IS NULL           ALTER TABLE dbo.users ADD [degree] NVARCHAR(50);
    IF COL_LENGTH('dbo.users','jobCategory') IS NULL      ALTER TABLE dbo.users ADD [jobCategory] NVARCHAR(100);
    IF COL_LENGTH('dbo.users','experienceBand') IS NULL   ALTER TABLE dbo.users ADD [experienceBand] NVARCHAR(50);
    IF COL_LENGTH('dbo.users','expectedSalary') IS NULL   ALTER TABLE dbo.users ADD [expectedSalary] INT;
    IF COL_LENGTH('dbo.users','birthdate') IS NULL        ALTER TABLE dbo.users ADD [birthdate] DATE;
    IF COL_LENGTH('dbo.users','address') IS NULL          ALTER TABLE dbo.users ADD [address] NVARCHAR(255);
    IF COL_LENGTH('dbo.users','gender') IS NULL           ALTER TABLE dbo.users ADD [gender] NVARCHAR(10);
    IF COL_LENGTH('dbo.users','maritalStatus') IS NULL    ALTER TABLE dbo.users ADD [maritalStatus] NVARCHAR(20);
    IF COL_LENGTH('dbo.users','jobAlertOn') IS NULL       ALTER TABLE dbo.users ADD [jobAlertOn] BIT NOT NULL DEFAULT 1;
    IF COL_LENGTH('dbo.users','careerGoals') IS NULL      ALTER TABLE dbo.users ADD [careerGoals] NVARCHAR(MAX);
    
    PRINT '  → Đã kiểm tra và cập nhật cấu trúc';
END
GO

-- Indexes cho bảng users
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Phone' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_Phone] ON [dbo].[users] ([phone]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_UserType' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_UserType] ON [dbo].[users] ([userType]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_LastLogin' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_LastLogin] ON [dbo].[users] ([lastLogin]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Users_Company_Employer' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_Users_Company_Employer] ON [dbo].[users] ([company]) WHERE [userType] = 'employer';
GO

-- Trigger tự động cập nhật updatedAt
IF OBJECT_ID(N'dbo.trg_Users_UpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Users_UpdatedAt;
GO

CREATE TRIGGER [dbo].[trg_Users_UpdatedAt]
ON [dbo].[users]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE u SET [updatedAt] = GETDATE()
    FROM [dbo].[users] u
    INNER JOIN inserted i ON u.[id] = i.[id];
END
GO

PRINT '  → Đã tạo indexes và trigger cho users';
PRINT '';

-- =====================================================
-- 2. BẢNG JOBS - Quản lý tin tuyển dụng
-- =====================================================
IF OBJECT_ID(N'dbo.jobs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[jobs] (
        -- Thông tin cơ bản
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [title] NVARCHAR(255) NOT NULL,
        [company] NVARCHAR(255) NOT NULL,
        [location] NVARCHAR(255) NOT NULL,
        [salary] NVARCHAR(100) NULL,
        [type] NVARCHAR(50) NOT NULL DEFAULT 'full-time' CHECK ([type] IN ('full-time','part-time','contract','intern')),
        [experience] NVARCHAR(50) NULL,
        
        -- Mô tả công việc
        [description] NVARCHAR(MAX) NOT NULL,
        [requirements] NVARCHAR(MAX) NOT NULL,
        [benefits] NVARCHAR(MAX) NULL,
        
        -- Phân loại
        [category] NVARCHAR(100) NOT NULL,
        [skills] NVARCHAR(MAX) NULL,
        
        -- AI Scoring - Job Description chi tiết
        [jdText] NVARCHAR(MAX) NULL,
        [mustHaveSkills] NVARCHAR(MAX) NULL,   -- JSON: ["react","javascript"]
        [niceToHaveSkills] NVARCHAR(MAX) NULL, -- JSON: ["typescript","nextjs"]
        [jdVersion] INT NOT NULL DEFAULT 1,
        
        -- Thông tin bổ sung
        [level] NVARCHAR(50) NULL,
        [education] NVARCHAR(50) NULL,
        [experienceBand] NVARCHAR(50) NULL,
        [salaryBand] NVARCHAR(50) NULL,
        [workMode] NVARCHAR(20) NULL,
        [headcount] INT NULL,
        
        -- Thông tin liên hệ
        [contactName] NVARCHAR(255) NULL,
        [contactEmail] NVARCHAR(255) NULL,
        [contactPhone] NVARCHAR(50) NULL,
        [contactAddress] NVARCHAR(255) NULL,
        [jobCode] NVARCHAR(50) NULL,
        
        -- ✅ ĐỊA CHỈ LÀM VIỆC CỤ THỂ (hỗ trợ đa chi nhánh)
        -- Ưu tiên: workAddress || companyAddress (từ users table)
        [workAddress] NVARCHAR(500) NULL,
        -- Trạng thái
        [deadline] DATETIME NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [isFeatured] BIT NOT NULL DEFAULT 0,
        
        -- Thống kê
        [applicationsCount] INT NOT NULL DEFAULT 0,
        [viewsCount] INT NOT NULL DEFAULT 0,
        
        -- Quan hệ
        [employerId] UNIQUEIDENTIFIER NOT NULL,
        
        -- Timestamps
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_Jobs_Employer] FOREIGN KEY ([employerId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
    );
    PRINT '✅ Đã tạo bảng: jobs';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng jobs đã tồn tại - Đang kiểm tra cấu trúc...';
    
    -- SAFE PATCH: Thêm các cột nếu thiếu
    IF COL_LENGTH('dbo.jobs','level') IS NULL           ALTER TABLE dbo.jobs ADD [level] NVARCHAR(50);
    IF COL_LENGTH('dbo.jobs','education') IS NULL       ALTER TABLE dbo.jobs ADD [education] NVARCHAR(50);
    IF COL_LENGTH('dbo.jobs','experienceBand') IS NULL  ALTER TABLE dbo.jobs ADD [experienceBand] NVARCHAR(50);
    IF COL_LENGTH('dbo.jobs','salaryBand') IS NULL      ALTER TABLE dbo.jobs ADD [salaryBand] NVARCHAR(50);
    IF COL_LENGTH('dbo.jobs','workMode') IS NULL        ALTER TABLE dbo.jobs ADD [workMode] NVARCHAR(20);
    IF COL_LENGTH('dbo.jobs','headcount') IS NULL       ALTER TABLE dbo.jobs ADD [headcount] INT;
    IF COL_LENGTH('dbo.jobs','contactName') IS NULL     ALTER TABLE dbo.jobs ADD [contactName] NVARCHAR(255);
    IF COL_LENGTH('dbo.jobs','contactEmail') IS NULL    ALTER TABLE dbo.jobs ADD [contactEmail] NVARCHAR(255);
    IF COL_LENGTH('dbo.jobs','contactPhone') IS NULL    ALTER TABLE dbo.jobs ADD [contactPhone] NVARCHAR(50);
    IF COL_LENGTH('dbo.jobs','contactAddress') IS NULL  ALTER TABLE dbo.jobs ADD [contactAddress] NVARCHAR(255);
    IF COL_LENGTH('dbo.jobs','jobCode') IS NULL         ALTER TABLE dbo.jobs ADD [jobCode] NVARCHAR(50);
    IF COL_LENGTH('dbo.jobs','jdText') IS NULL          ALTER TABLE dbo.jobs ADD jdText NVARCHAR(MAX);
    IF COL_LENGTH('dbo.jobs','mustHaveSkills') IS NULL  ALTER TABLE dbo.jobs ADD mustHaveSkills NVARCHAR(MAX);
    IF COL_LENGTH('dbo.jobs','niceToHaveSkills') IS NULL ALTER TABLE dbo.jobs ADD niceToHaveSkills NVARCHAR(MAX);
    IF COL_LENGTH('dbo.jobs','jdVersion') IS NULL       ALTER TABLE dbo.jobs ADD jdVersion INT NOT NULL DEFAULT 1;
    
    PRINT '  → Đã kiểm tra và cập nhật cấu trúc';
END
GO

-- Indexes cho bảng jobs
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Category' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Category] ON [dbo].[jobs] ([category]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Location' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Location] ON [dbo].[jobs] ([location]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Type' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Type] ON [dbo].[jobs] ([type]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_IsActive' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_IsActive] ON [dbo].[jobs] ([isActive]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_EmployerId' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_EmployerId] ON [dbo].[jobs] ([employerId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Jobs_CreatedAt' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Jobs_CreatedAt] ON [dbo].[jobs] ([createdAt]);
GO

PRINT '  → Đã tạo indexes cho jobs';
PRINT '';

-- =====================================================
-- 3. BẢNG CVS - Quản lý CV ứng viên
-- =====================================================
IF OBJECT_ID(N'dbo.cvs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[cvs] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        
        -- Thông tin ứng viên
        [candidateName] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) NOT NULL,
        [phone] NVARCHAR(20) NULL,
        [position] NVARCHAR(255) NOT NULL,
        [experience] INT NOT NULL DEFAULT 0,
        [location] NVARCHAR(255) NULL,
        
        -- Thông tin CV (JSON)
        [skills] NVARCHAR(MAX) NULL DEFAULT '[]',
        [education] NVARCHAR(MAX) NULL DEFAULT '[]',
        [workExperience] NVARCHAR(MAX) NULL DEFAULT '[]',
        [projects] NVARCHAR(MAX) NULL DEFAULT '[]',
        [languages] NVARCHAR(MAX) NULL DEFAULT '[]',
        [certifications] NVARCHAR(MAX) NULL DEFAULT '[]',
        
        -- File metadata
        [fileName] NVARCHAR(255) NOT NULL,
        [filePath] NVARCHAR(500) NOT NULL,
        [fileSize] INT NOT NULL,
        [fileType] NVARCHAR(50) NOT NULL,
        
        -- AI Analysis
        [aiScore] DECIMAL(3,1) NULL CHECK ([aiScore] BETWEEN 0 AND 10),
        [aiAnalysis] NVARCHAR(MAX) NULL DEFAULT '{}',
        [isAnalyzed] BIT NOT NULL DEFAULT 0,
        
        -- Trạng thái
        [isActive] BIT NOT NULL DEFAULT 1,
        
        -- Quan hệ
        [candidateId] UNIQUEIDENTIFIER NULL,
        
        -- Timestamps
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_CVs_Candidate] FOREIGN KEY ([candidateId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
    );
    PRINT '✅ Đã tạo bảng: cvs';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng cvs đã tồn tại';
END
GO

-- =====================================================
-- 4. BẢNG APPLICATIONS - Quản lý đơn ứng tuyển
-- =====================================================
IF OBJECT_ID(N'dbo.applications', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[applications] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        
        -- Trạng thái
        [status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
        
        -- Thông tin ứng tuyển
        [coverLetter] NVARCHAR(MAX) NULL,
        [expectedSalary] DECIMAL(10,2) NULL,
        [availableFrom] DATETIME NULL,
        [notes] NVARCHAR(MAX) NULL,
        
        -- AI Scoring
        [aiMatchScore] DECIMAL(3,1) NULL CHECK ([aiMatchScore] BETWEEN 0 AND 10),
        [aiAnalysis] NVARCHAR(MAX) NULL DEFAULT '{}',
        [isAnalyzed] BIT NOT NULL DEFAULT 0,
        
        -- Snapshot & metadata
        [candidateSnapshot] NVARCHAR(MAX) NULL,
        [cvName] NVARCHAR(255) NULL,
        [cvFilePath] NVARCHAR(500) NULL,
        [statusHistory] NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        
        -- Quan hệ
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [candidateId] UNIQUEIDENTIFIER NOT NULL,
        [cvId] UNIQUEIDENTIFIER NULL,
        
        -- Timestamps
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_Apps_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id]),
        CONSTRAINT [FK_Apps_Candidate] FOREIGN KEY ([candidateId]) 
            REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Apps_CV] FOREIGN KEY ([cvId]) 
            REFERENCES [dbo].[cvs]([id]) ON DELETE SET NULL
    );
    
    CREATE UNIQUE INDEX [UQ_Application_Job_Candidate] 
        ON [dbo].[applications]([jobId],[candidateId]);
    
    PRINT '✅ Đã tạo bảng: applications';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng applications đã tồn tại - Đang kiểm tra cấu trúc...';
    
    IF COL_LENGTH('dbo.applications','candidateSnapshot') IS NULL
        ALTER TABLE dbo.applications ADD candidateSnapshot NVARCHAR(MAX);
    IF COL_LENGTH('dbo.applications','cvName') IS NULL
        ALTER TABLE dbo.applications ADD cvName NVARCHAR(255);
    IF COL_LENGTH('dbo.applications','cvFilePath') IS NULL
        ALTER TABLE dbo.applications ADD cvFilePath NVARCHAR(500);
    IF COL_LENGTH('dbo.applications','statusHistory') IS NULL
        ALTER TABLE dbo.applications ADD statusHistory NVARCHAR(MAX) NOT NULL DEFAULT '[]';
    
    PRINT '  → Đã kiểm tra và cập nhật cấu trúc';
END
GO

-- Indexes cho bảng applications
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_JobId' AND object_id=OBJECT_ID('dbo.applications'))
    CREATE INDEX IDX_Apps_JobId ON dbo.applications(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_CandidateId' AND object_id=OBJECT_ID('dbo.applications'))
    CREATE INDEX IDX_Apps_CandidateId ON dbo.applications(candidateId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_CreatedAt' AND object_id=OBJECT_ID('dbo.applications'))
    CREATE INDEX IDX_Apps_CreatedAt ON dbo.applications(createdAt);
GO

PRINT '  → Đã tạo indexes cho applications';
PRINT '';

-- =====================================================
-- 5. BẢNG SCORES - Lưu kết quả chấm điểm AI
-- =====================================================
IF OBJECT_ID(N'dbo.scores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.scores (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [applicationId] UNIQUEIDENTIFIER NOT NULL,
        
        -- Điểm số và phân tích
        [scoreTotal] INT NOT NULL DEFAULT 0,
        [matchedSkills] NVARCHAR(MAX) NULL,      -- JSON array
        [missingSkills] NVARCHAR(MAX) NULL,      -- JSON array (thiếu nice-to-have)
        [missingMustHave] NVARCHAR(MAX) NULL,    -- JSON array (thiếu bắt buộc)
        
        -- Metadata
        [modelVersion] NVARCHAR(50) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'success' CHECK ([status] IN ('pending','success','error')),
        [errorMessage] NVARCHAR(1000) NULL,
        [generatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT FK_Scores_Application FOREIGN KEY ([applicationId]) 
            REFERENCES dbo.applications([id]) ON DELETE CASCADE
    );
    
    CREATE INDEX IDX_Scores_Application ON dbo.scores([applicationId]);
    CREATE INDEX IDX_Scores_GeneratedAt ON dbo.scores([generatedAt]);
    
    PRINT '✅ Đã tạo bảng: scores';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng scores đã tồn tại';
END
GO

-- View: Lấy điểm mới nhất của mỗi application
IF OBJECT_ID(N'dbo.v_latest_scores', N'V') IS NOT NULL
    DROP VIEW dbo.v_latest_scores;
GO

CREATE VIEW dbo.v_latest_scores AS
SELECT s.*
FROM (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY applicationId ORDER BY generatedAt DESC) AS rn
    FROM dbo.scores
) s
WHERE s.rn = 1;
GO

PRINT '  → Đã tạo view: v_latest_scores';
PRINT '';

-- =====================================================
-- 6. BẢNG SAVED_JOBS - Việc làm đã lưu
-- =====================================================
IF OBJECT_ID(N'dbo.saved_jobs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[saved_jobs] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_SavedJobs_User] FOREIGN KEY ([userId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SavedJobs_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_SavedJobs] UNIQUE ([userId],[jobId])
    );
    PRINT '✅ Đã tạo bảng: saved_jobs';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng saved_jobs đã tồn tại';
END
GO

-- Indexes cho saved_jobs
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Saved_JobId' AND object_id=OBJECT_ID('dbo.saved_jobs'))
    CREATE INDEX IDX_Saved_JobId ON dbo.saved_jobs(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Saved_UserId' AND object_id=OBJECT_ID('dbo.saved_jobs'))
    CREATE INDEX IDX_Saved_UserId ON dbo.saved_jobs(userId);
GO

PRINT '  → Đã tạo indexes cho saved_jobs';
PRINT '';

-- =====================================================
-- 7. BẢNG INVITATIONS - Lời mời phỏng vấn
-- =====================================================
IF OBJECT_ID(N'dbo.invitations', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[invitations] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [employerId] UNIQUEIDENTIFIER NOT NULL,
        [candidateId] UNIQUEIDENTIFIER NOT NULL,
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' 
            CHECK ([status] IN ('pending','accepted','declined','expired')),
        [message] NVARCHAR(MAX) NULL,
        [scheduleAt] DATETIME NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_Inv_Employer] FOREIGN KEY ([employerId]) 
            REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Inv_Candidate] FOREIGN KEY ([candidateId]) 
            REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Inv_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id])
    );
    PRINT '✅ Đã tạo bảng: invitations';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng invitations đã tồn tại';
END
GO

-- Indexes cho invitations
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_JobId' AND object_id=OBJECT_ID('dbo.invitations'))
    CREATE INDEX IDX_Inv_JobId ON dbo.invitations(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_EmployerId' AND object_id=OBJECT_ID('dbo.invitations'))
    CREATE INDEX IDX_Inv_EmployerId ON dbo.invitations(employerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_CandidateId' AND object_id=OBJECT_ID('dbo.invitations'))
    CREATE INDEX IDX_Inv_CandidateId ON dbo.invitations(candidateId);
GO

PRINT '  → Đã tạo indexes cho invitations';
PRINT '';

-- =====================================================
-- 8. BẢNG NOTIFICATIONS - Hệ thống thông báo
-- Mục đích: Gửi thông báo realtime cho user
-- - Ứng viên: Thông báo ứng tuyển, lời mời phỏng vấn, gợi ý việc làm
-- - Nhà tuyển dụng: Thông báo ứng viên mới, AI gợi ý
-- =====================================================
IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[notifications] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        
        -- Người nhận
        [userId] UNIQUEIDENTIFIER NOT NULL,
        
        -- Loại thông báo
        [type] NVARCHAR(50) NOT NULL DEFAULT 'info',
        -- Các loại: info, new_application, interview_invite, job_match, 
        --           application_update, job_expired, system
        
        -- Nội dung
        [title] NVARCHAR(255) NOT NULL,
        [message] NVARCHAR(MAX) NULL,
        [content] NVARCHAR(MAX) NULL,
        
        -- Liên kết
        [jobId] UNIQUEIDENTIFIER NULL,
        
        -- Dữ liệu bổ sung (JSON)
        [payload] NVARCHAR(MAX) NULL DEFAULT '{}',
        
        -- Trạng thái
        [isRead] BIT NOT NULL DEFAULT 0,
        
        -- Timestamps
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        -- Foreign Keys
        CONSTRAINT [FK_Noti_User] FOREIGN KEY ([userId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Noti_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id]) ON DELETE SET NULL
    );
    
    -- Indexes cho query nhanh
    CREATE INDEX [IDX_Noti_UserId] ON dbo.notifications([userId]);
    CREATE INDEX [IDX_Noti_IsRead] ON dbo.notifications([isRead]);
    CREATE INDEX [IDX_Noti_CreatedAt] ON dbo.notifications([createdAt]);
    CREATE INDEX [IDX_Noti_Type] ON dbo.notifications([type]);
    
    PRINT '✅ Đã tạo bảng: notifications';
    PRINT '  → Bảng mới hoàn toàn (hỗ trợ realtime notifications)';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng notifications đã tồn tại - Đang cập nhật cấu trúc...';
    
    -- Thêm các cột mới nếu chưa có
    IF COL_LENGTH('dbo.notifications', 'title') IS NULL
    BEGIN
        ALTER TABLE dbo.notifications ADD [title] NVARCHAR(255) NULL;
        PRINT '  → Đã thêm cột: title';
    END

    IF COL_LENGTH('dbo.notifications', 'message') IS NULL
    BEGIN
        ALTER TABLE dbo.notifications ADD [message] NVARCHAR(MAX) NULL;
        PRINT '  → Đã thêm cột: message';
    END

    IF COL_LENGTH('dbo.notifications', 'content') IS NULL
    BEGIN
        ALTER TABLE dbo.notifications ADD [content] NVARCHAR(MAX) NULL;
        PRINT '  → Đã thêm cột: content';
    END

    IF COL_LENGTH('dbo.notifications', 'jobId') IS NULL
    BEGIN
        ALTER TABLE dbo.notifications ADD [jobId] UNIQUEIDENTIFIER NULL;
        PRINT '  → Đã thêm cột: jobId';
    END

    IF COL_LENGTH('dbo.notifications', 'updatedAt') IS NULL
    BEGIN
        ALTER TABLE dbo.notifications ADD [updatedAt] DATETIME NOT NULL DEFAULT GETDATE();
        PRINT '  → Đã thêm cột: updatedAt';
    END

    -- Đảm bảo title NOT NULL
    BEGIN TRY
        UPDATE dbo.notifications SET title = N'Thông báo' WHERE title IS NULL;
        ALTER TABLE dbo.notifications ALTER COLUMN title NVARCHAR(255) NOT NULL;
        PRINT '  → Đã đặt title NOT NULL';
    END TRY
    BEGIN CATCH
        PRINT '  ⚠️ Không thể đặt title NOT NULL (đã được set)';
    END CATCH

    -- Thêm Foreign Key tới jobs
    IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_Noti_Job' 
        AND parent_object_id = OBJECT_ID('dbo.notifications')
    )
    BEGIN
        ALTER TABLE dbo.notifications
        ADD CONSTRAINT [FK_Noti_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id]) ON DELETE SET NULL;
        PRINT '  → Đã thêm Foreign Key: FK_Noti_Job';
    END

    -- Tạo indexes
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_UserId' AND object_id = OBJECT_ID('dbo.notifications'))
    BEGIN
        CREATE INDEX [IDX_Noti_UserId] ON dbo.notifications([userId]);
        PRINT '  → Đã tạo index: IDX_Noti_UserId';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_IsRead' AND object_id = OBJECT_ID('dbo.notifications'))
    BEGIN
        CREATE INDEX [IDX_Noti_IsRead] ON dbo.notifications([isRead]);
        PRINT '  → Đã tạo index: IDX_Noti_IsRead';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_CreatedAt' AND object_id = OBJECT_ID('dbo.notifications'))
    BEGIN
        CREATE INDEX [IDX_Noti_CreatedAt] ON dbo.notifications([createdAt]);
        PRINT '  → Đã tạo index: IDX_Noti_CreatedAt';
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_Type' AND object_id = OBJECT_ID('dbo.notifications'))
    BEGIN
        CREATE INDEX [IDX_Noti_Type] ON dbo.notifications([type]);
        PRINT '  → Đã tạo index: IDX_Noti_Type';
    END
END
GO

-- Trigger tự động cập nhật updatedAt cho notifications
IF OBJECT_ID(N'dbo.trg_Notifications_UpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Notifications_UpdatedAt;
GO

CREATE TRIGGER [dbo].[trg_Notifications_UpdatedAt]
ON [dbo].[notifications]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE n SET [updatedAt] = GETDATE()
    FROM [dbo].[notifications] n
    INNER JOIN inserted i ON n.[id] = i.[id];
END
GO

PRINT '  → Đã tạo trigger: trg_Notifications_UpdatedAt';
PRINT '';

-- =====================================================
-- 9. BẢNG REVIEWS - Đánh giá công ty
-- =====================================================
IF OBJECT_ID(N'dbo.reviews', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[reviews] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [companyUserId] UNIQUEIDENTIFIER NOT NULL,
        [reviewerId] UNIQUEIDENTIFIER NOT NULL,
        [rating] INT NOT NULL CHECK ([rating] BETWEEN 1 AND 5),
        [title] NVARCHAR(255) NULL,
        [content] NVARCHAR(MAX) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' 
            CHECK ([status] IN ('pending','approved','rejected')),
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_Rev_Company] FOREIGN KEY ([companyUserId]) 
            REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Rev_Reviewer] FOREIGN KEY ([reviewerId]) 
            REFERENCES [dbo].[users]([id])
    );
    PRINT '✅ Đã tạo bảng: reviews';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng reviews đã tồn tại';
END
GO

-- =====================================================
-- 10. BẢNG OAUTH_ACCOUNTS - Liên kết OAuth
-- =====================================================
IF OBJECT_ID(N'dbo.oauth_accounts', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[oauth_accounts] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [provider] NVARCHAR(50) NOT NULL CHECK ([provider] IN ('google','linkedin')),
        [providerUserId] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_OAuth_User] FOREIGN KEY ([userId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_OAuth] UNIQUE ([provider],[providerUserId])
    );
    PRINT '✅ Đã tạo bảng: oauth_accounts';
END
ELSE
BEGIN
    PRINT 'ℹ️ Bảng oauth_accounts đã tồn tại';
END
GO

PRINT '';

-- =====================================================
-- 11. CONSTRAINT: CHỈ MỘT ADMIN DUY NHẤT
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Users_SingleAdmin' AND object_id = OBJECT_ID('[dbo].[users]'))
BEGIN
    CREATE UNIQUE INDEX [UQ_Users_SingleAdmin]
    ON [dbo].[users] ([userType])
    WHERE [userType] = 'admin';
    PRINT '✅ Đã tạo constraint: Chỉ 1 admin duy nhất';
END
ELSE
BEGIN
    PRINT 'ℹ️ Constraint SingleAdmin đã tồn tại';
END
GO

-- =====================================================
-- 12. TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH
-- =====================================================
DECLARE @AdminEmail NVARCHAR(255) = N'admin@jobhire.local';
DECLARE @AdminPassword NVARCHAR(255) = N'Admin@123';

BEGIN TRY
    BEGIN TRAN;
    
    -- Đổi các admin cũ thành candidate
    UPDATE [dbo].[users] 
    SET [userType] = 'candidate' 
    WHERE [userType] = 'admin' AND [email] <> @AdminEmail;
    
    -- Tạo hoặc cập nhật admin mới
    IF EXISTS (SELECT 1 FROM [dbo].[users] WHERE [email] = @AdminEmail)
    BEGIN
        UPDATE [dbo].[users] 
        SET [userType] = 'admin',
            [isVerified] = 1,
            [isActive] = 1
        WHERE [email] = @AdminEmail;
        PRINT '✅ Đã cập nhật tài khoản admin: ' + @AdminEmail;
    END
    ELSE
    BEGIN
        INSERT INTO [dbo].[users] ([name],[email],[password],[userType],[isVerified],[isActive])
        VALUES (N'System Admin', @AdminEmail, @AdminPassword, 'admin', 1, 1);
        PRINT '✅ Đã tạo tài khoản admin mới: ' + @AdminEmail;
    END
    
    COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    PRINT '❌ Lỗi khi tạo admin: ' + ERROR_MESSAGE();
END CATCH;
GO

PRINT '';
PRINT '========================================';
PRINT '   KIỂM TRA KẾT QUẢ';
PRINT '========================================';
PRINT '';

-- Liệt kê tất cả bảng
PRINT '📋 Danh sách bảng:';
SELECT 
    name AS [Tên bảng],
    create_date AS [Ngày tạo]
FROM sys.tables
WHERE schema_id = SCHEMA_ID('dbo')
ORDER BY name;

PRINT '';
PRINT '👤 Tài khoản admin:';
SELECT [id],[email],[userType],[isVerified]
FROM [dbo].[users] 
WHERE [userType] = 'admin';

PRINT '';
PRINT '🔔 Cấu trúc bảng notifications:';
SELECT 
    c.name AS [Cột],
    t.name AS [Kiểu],
    c.max_length AS [Độ dài],
    c.is_nullable AS [NULL?]
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.notifications')
ORDER BY c.column_id;

PRINT '';
PRINT '========================================';
PRINT '   🎉 HOÀN TẤT CẤU TRÚC DATABASE';
PRINT '========================================';
PRINT '';
PRINT '📊 Tổng quan:';
PRINT '   • 10 bảng chính';
PRINT '   • AI Scoring System (jobs + scores)';
PRINT '   • Notification System (realtime)';
PRINT '   • 1 Admin mặc định (admin@jobhire.local)';
PRINT '';
PRINT '🆕 Tính năng mới:';
PRINT '   → Bảng notifications: Hỗ trợ thông báo realtime';
PRINT '   → Bảng scores: Chấm điểm AI cho ứng viên';
PRINT '   → View v_latest_scores: Lấy điểm mới nhất';
PRINT '';
PRINT '🔄 Bước tiếp theo:';
PRINT '   1. Cấu hình Sequelize models trong Node.js';
PRINT '   2. Tích hợp AI Client (OpenAI/Gemini)';
PRINT '   3. Uncomment code notifications trong backend';
PRINT '';
PRINT '📧 Đăng nhập Admin:';
PRINT '   Email: admin@jobhire.local';
PRINT '   Password: Admin@123';
PRINT '';
GO