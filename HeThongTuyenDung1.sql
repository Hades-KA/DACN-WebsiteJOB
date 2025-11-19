-- =====================================================
-- HỆ THỐNG TUYỂN DỤNG - DATABASE SCHEMA
-- Phiên bản: 2.0 (Bổ sung AI Scoring System)
-- Cập nhật: [Ngày hiện tại]
-- =====================================================

-- 0. Tạo Database nếu chưa có
---------------------------------
IF DB_ID(N'HeThongTuyenDung') IS NULL
BEGIN
    CREATE DATABASE [HeThongTuyenDung];
END
GO

USE [HeThongTuyenDung];
GO

/* ===================== USERS ===================== */
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[users] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [name] NVARCHAR(100) NOT NULL,
        [email] NVARCHAR(255) NOT NULL UNIQUE,
        [password] NVARCHAR(255) NOT NULL,
        [phone] NVARCHAR(20) NULL,
        [userType] NVARCHAR(20) NOT NULL DEFAULT 'candidate' CHECK ([userType] IN ('candidate','employer','admin')),
        [company] NVARCHAR(255) NULL,
        [avatar] NVARCHAR(500) NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [isVerified] BIT NOT NULL DEFAULT 0,
        [lastLogin] DATETIME NULL,
        [resetPasswordToken] NVARCHAR(255) NULL,
        [resetPasswordExpires] DATETIME NULL,
        [verificationToken] NVARCHAR(255) NULL,

        -- Hồ sơ ứng viên
        [position] NVARCHAR(255) NULL,
        [location] NVARCHAR(255) NULL,
        [about] NVARCHAR(MAX) NULL,
        [skills] NVARCHAR(MAX) NULL,
        [experience] NVARCHAR(MAX) NULL,
        [education] NVARCHAR(MAX) NULL,

        -- Metadata CV
        [cvUrl] NVARCHAR(500) NULL,
        [cvName] NVARCHAR(255) NULL,
        [cvSize] INT NULL,

        -- Hồ sơ công ty
        [companyWebsite]   NVARCHAR(255) NULL,
        [companySize]      NVARCHAR(50)  NULL, 
        [industry]         NVARCHAR(100) NULL,
        [taxCode]          NVARCHAR(50)  NULL,
        [businessLicense]  NVARCHAR(100) NULL,
        [companyCity]      NVARCHAR(100) NULL,
        [companyAddress]   NVARCHAR(255) NULL,
        [logoUrl]          NVARCHAR(500) NULL,
        [companyAbout]     NVARCHAR(MAX) NULL,

        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );
END
ELSE
BEGIN
    -- SAFE PATCH: thêm cột hồ sơ công ty nếu thiếu
    IF COL_LENGTH('dbo.users','companyWebsite')   IS NULL ALTER TABLE dbo.users ADD companyWebsite NVARCHAR(255);
    IF COL_LENGTH('dbo.users','companySize')      IS NULL ALTER TABLE dbo.users ADD companySize NVARCHAR(50);
    IF COL_LENGTH('dbo.users','industry')         IS NULL ALTER TABLE dbo.users ADD industry NVARCHAR(100);
    IF COL_LENGTH('dbo.users','taxCode')          IS NULL ALTER TABLE dbo.users ADD taxCode NVARCHAR(50);
    IF COL_LENGTH('dbo.users','businessLicense')  IS NULL ALTER TABLE dbo.users ADD businessLicense NVARCHAR(100);
    IF COL_LENGTH('dbo.users','companyCity')      IS NULL ALTER TABLE dbo.users ADD companyCity NVARCHAR(100);
    IF COL_LENGTH('dbo.users','companyAddress')   IS NULL ALTER TABLE dbo.users ADD companyAddress NVARCHAR(255);
    IF COL_LENGTH('dbo.users','logoUrl')          IS NULL ALTER TABLE dbo.users ADD logoUrl NVARCHAR(500);
    IF COL_LENGTH('dbo.users','companyAbout')     IS NULL ALTER TABLE dbo.users ADD companyAbout NVARCHAR(MAX);
END
GO

-- PATCH: Thêm cột candidate profile mở rộng
BEGIN TRY
BEGIN TRAN;

IF COL_LENGTH('dbo.users','level')           IS NULL ALTER TABLE dbo.users ADD [level] NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.users','workType')        IS NULL ALTER TABLE dbo.users ADD [workType] NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.users','degree')          IS NULL ALTER TABLE dbo.users ADD [degree] NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.users','jobCategory')     IS NULL ALTER TABLE dbo.users ADD [jobCategory] NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.users','experienceBand')  IS NULL ALTER TABLE dbo.users ADD [experienceBand] NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.users','expectedSalary')  IS NULL ALTER TABLE dbo.users ADD [expectedSalary] INT NULL;
IF COL_LENGTH('dbo.users','birthdate')       IS NULL ALTER TABLE dbo.users ADD [birthdate] DATE NULL;
IF COL_LENGTH('dbo.users','address')         IS NULL ALTER TABLE dbo.users ADD [address] NVARCHAR(255) NULL;
IF COL_LENGTH('dbo.users','gender')          IS NULL ALTER TABLE dbo.users ADD [gender] NVARCHAR(10) NULL;
IF COL_LENGTH('dbo.users','maritalStatus')   IS NULL ALTER TABLE dbo.users ADD [maritalStatus] NVARCHAR(20) NULL;
IF COL_LENGTH('dbo.users','jobAlertOn')      IS NULL ALTER TABLE dbo.users ADD [jobAlertOn] BIT NOT NULL DEFAULT 1;
IF COL_LENGTH('dbo.users','careerGoals')     IS NULL ALTER TABLE dbo.users ADD [careerGoals] NVARCHAR(MAX) NULL;

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRAN;
THROW;
END CATCH;
GO

-- Index cho users
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Phone' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_Phone] ON [dbo].[users] ([phone]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_UserType' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_UserType] ON [dbo].[users] ([userType]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_LastLogin' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_LastLogin] ON [dbo].[users] ([lastLogin]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Users_Company_Employer' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_Users_Company_Employer] ON [dbo].[users] ([company]) WHERE [userType] = 'employer';
GO

-- Trigger cập nhật updatedAt (idempotent)
IF OBJECT_ID(N'dbo.trg_UpdateUpdatedAt', N'TR') IS NULL
EXEC('
CREATE TRIGGER [dbo].[trg_UpdateUpdatedAt]
ON [dbo].[users]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE u SET [updatedAt] = GETDATE()
    FROM [dbo].[users] u
    INNER JOIN inserted i ON u.[id] = i.[id];
END
');
GO

/* ===================== JOBS ===================== */
IF OBJECT_ID(N'dbo.jobs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[jobs] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [title] NVARCHAR(255) NOT NULL,
        [company] NVARCHAR(255) NOT NULL,
        [location] NVARCHAR(255) NOT NULL,
        [salary] NVARCHAR(100) NULL,
        [type] NVARCHAR(50) NOT NULL DEFAULT 'full-time' CHECK ([type] IN ('full-time','part-time','contract','intern')),
        [experience] NVARCHAR(50) NULL,
        [description] NVARCHAR(MAX) NOT NULL,
        [requirements] NVARCHAR(MAX) NOT NULL,
        [benefits] NVARCHAR(MAX) NULL,
        [category] NVARCHAR(100) NOT NULL,
        [skills] NVARCHAR(MAX) NULL,
        [deadline] DATETIME NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [isFeatured] BIT NOT NULL DEFAULT 0,
        [applicationsCount] INT NOT NULL DEFAULT 0,
        [viewsCount] INT NOT NULL DEFAULT 0,
        [employerId] UNIQUEIDENTIFIER NOT NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_Jobs_Employer] FOREIGN KEY ([employerId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
    );
END
GO

-- SAFE PATCH: thêm cột cho jobs nếu thiếu
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
GO

/* =====================================================
   🆕 AI SCORING: Bổ sung cột JD cho bảng jobs
   - jdText: Mô tả công việc chi tiết (dùng cho AI)
   - mustHaveSkills: JSON array kỹ năng bắt buộc
   - niceToHaveSkills: JSON array kỹ năng ưu tiên
   - jdVersion: Version để track thay đổi JD
   ===================================================== */
IF COL_LENGTH('dbo.jobs','jdText') IS NULL
    ALTER TABLE dbo.jobs ADD jdText NVARCHAR(MAX) NULL;

IF COL_LENGTH('dbo.jobs','mustHaveSkills') IS NULL
    ALTER TABLE dbo.jobs ADD mustHaveSkills NVARCHAR(MAX) NULL;   -- JSON: '["react","javascript"]'

IF COL_LENGTH('dbo.jobs','niceToHaveSkills') IS NULL
    ALTER TABLE dbo.jobs ADD niceToHaveSkills NVARCHAR(MAX) NULL; -- JSON: '["typescript","nextjs"]'

IF COL_LENGTH('dbo.jobs','jdVersion') IS NULL
BEGIN
    ALTER TABLE dbo.jobs ADD jdVersion INT NOT NULL CONSTRAINT DF_Jobs_JdVersion DEFAULT(1);
END
GO

-- Index cho jobs (filter/sort)
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
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Jobs_Level' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Jobs_Level] ON [dbo].[jobs]([level]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Jobs_Education' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Jobs_Education] ON [dbo].[jobs]([education]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Jobs_ExpBand' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Jobs_ExpBand] ON [dbo].[jobs]([experienceBand]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Jobs_SalaryBand' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Jobs_SalaryBand] ON [dbo].[jobs]([salaryBand]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Jobs_CreatedAt' AND object_id = OBJECT_ID('dbo.jobs'))
    CREATE INDEX [IDX_Jobs_CreatedAt] ON [dbo].[jobs]([createdAt]);
GO

/* ===================== CVS ===================== */
IF OBJECT_ID(N'dbo.cvs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[cvs] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [candidateName] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) NOT NULL,
        [phone] NVARCHAR(20) NULL,
        [position] NVARCHAR(255) NOT NULL,
        [experience] INT NOT NULL DEFAULT 0,
        [location] NVARCHAR(255) NULL,
        [skills] NVARCHAR(MAX) NULL DEFAULT '[]',
        [education] NVARCHAR(MAX) NULL DEFAULT '[]',
        [workExperience] NVARCHAR(MAX) NULL DEFAULT '[]',
        [projects] NVARCHAR(MAX) NULL DEFAULT '[]',
        [languages] NVARCHAR(MAX) NULL DEFAULT '[]',
        [certifications] NVARCHAR(MAX) NULL DEFAULT '[]',
        [fileName] NVARCHAR(255) NOT NULL,
        [filePath] NVARCHAR(500) NOT NULL,
        [fileSize] INT NOT NULL,
        [fileType] NVARCHAR(50) NOT NULL,
        [aiScore] DECIMAL(3,1) NULL CHECK ([aiScore] BETWEEN 0 AND 10),
        [aiAnalysis] NVARCHAR(MAX) NULL DEFAULT '{}',
        [isAnalyzed] BIT NOT NULL DEFAULT 0,
        [isActive] BIT NOT NULL DEFAULT 1,
        [candidateId] UNIQUEIDENTIFIER NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_CVs_Candidate] FOREIGN KEY ([candidateId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
    );
END
GO

/* ===================== APPLICATIONS ===================== */
IF OBJECT_ID(N'dbo.applications', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[applications] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
        [coverLetter] NVARCHAR(MAX) NULL,
        [expectedSalary] DECIMAL(10,2) NULL,
        [availableFrom] DATETIME NULL,
        [notes] NVARCHAR(MAX) NULL,
        [aiMatchScore] DECIMAL(3,1) NULL CHECK ([aiMatchScore] BETWEEN 0 AND 10),
        [aiAnalysis] NVARCHAR(MAX) NULL DEFAULT '{}',
        [isAnalyzed] BIT NOT NULL DEFAULT 0,
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [candidateId] UNIQUEIDENTIFIER NOT NULL,
        [cvId] UNIQUEIDENTIFIER NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_Apps_Job]       FOREIGN KEY ([jobId])      REFERENCES [dbo].[jobs]([id]),
        CONSTRAINT [FK_Apps_Candidate] FOREIGN KEY ([candidateId]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Apps_CV]        FOREIGN KEY ([cvId])       REFERENCES [dbo].[cvs]([id]) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX [UQ_Application_Job_Candidate] ON [dbo].[applications]([jobId],[candidateId]);
END
GO

-- PATCH: Thêm các cột mới (snapshot + CV metadata)
BEGIN TRY
BEGIN TRAN;

IF COL_LENGTH('dbo.applications','candidateSnapshot') IS NULL
    ALTER TABLE dbo.applications ADD candidateSnapshot NVARCHAR(MAX) NULL;

IF COL_LENGTH('dbo.applications','cvName') IS NULL
    ALTER TABLE dbo.applications ADD cvName NVARCHAR(255) NULL;

IF COL_LENGTH('dbo.applications','cvFilePath') IS NULL
    ALTER TABLE dbo.applications ADD cvFilePath NVARCHAR(500) NULL;

IF COL_LENGTH('dbo.applications','statusHistory') IS NULL
    ALTER TABLE dbo.applications ADD statusHistory NVARCHAR(MAX) NULL;

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRAN;
THROW;
END CATCH;
GO

-- PATCH: Đặt DEFAULT cho statusHistory
IF COL_LENGTH('dbo.applications','statusHistory') IS NOT NULL
BEGIN
    DECLARE @hasDefault bit = 0;

    IF EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.applications') AND c.name = 'statusHistory'
    )
    SET @hasDefault = 1;

    IF (@hasDefault = 0)
        EXEC('ALTER TABLE dbo.applications ADD CONSTRAINT DF_Applications_StatusHistory DEFAULT ''[]'' FOR statusHistory');

    EXEC('UPDATE dbo.applications SET statusHistory = ''[]'' WHERE statusHistory IS NULL');
    EXEC('ALTER TABLE dbo.applications ALTER COLUMN statusHistory NVARCHAR(MAX) NOT NULL');
END
GO

/* =====================================================
   🆕 BẢNG MỚI: scores
   Lưu kết quả chấm điểm AI cho từng application
   - scoreTotal: Tổng điểm (0-100)
   - matchedSkills: JSON array kỹ năng khớp
   - missingSkills: JSON array kỹ năng thiếu (nice-to-have)
   - missingMustHave: JSON array kỹ năng thiếu (bắt buộc)
   - status: pending/success/error
   ===================================================== */
IF OBJECT_ID(N'dbo.scores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.scores (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        applicationId UNIQUEIDENTIFIER NOT NULL,
        scoreTotal INT NOT NULL DEFAULT 0,
        matchedSkills NVARCHAR(MAX) NULL,       -- JSON array
        missingSkills NVARCHAR(MAX) NULL,       -- JSON array (thiếu nice-to-have)
        missingMustHave NVARCHAR(MAX) NULL,     -- JSON array (thiếu bắt buộc)
        modelVersion NVARCHAR(50) NULL,
        status NVARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('pending','success','error')),
        errorMessage NVARCHAR(1000) NULL,
        generatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Scores_Application FOREIGN KEY (applicationId) 
            REFERENCES dbo.applications(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IDX_Scores_Application ON dbo.scores(applicationId);
    CREATE INDEX IDX_Scores_GeneratedAt ON dbo.scores(generatedAt);
    
    PRINT '✅ Bảng scores đã được tạo';
END
ELSE
    PRINT 'ℹ️ Bảng scores đã tồn tại';
GO

/* =====================================================
   🆕 VIEW: v_latest_scores
   Lấy điểm mới nhất của mỗi application (tối ưu query)
   ===================================================== */
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

PRINT '✅ View v_latest_scores đã được tạo';
GO

/* ===================== saved_jobs ===================== */
IF OBJECT_ID(N'dbo.saved_jobs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[saved_jobs] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_SavedJobs_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SavedJobs_Job]  FOREIGN KEY ([jobId])  REFERENCES [dbo].[jobs]([id])  ON DELETE CASCADE,
        CONSTRAINT [UQ_SavedJobs] UNIQUE ([userId],[jobId])
    );
END
GO

/* ===================== invitations ===================== */
IF OBJECT_ID(N'dbo.invitations', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[invitations] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [employerId] UNIQUEIDENTIFIER NOT NULL,
        [candidateId] UNIQUEIDENTIFIER NOT NULL,
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ([status] IN ('pending','accepted','declined','expired')),
        [message] NVARCHAR(MAX) NULL,
        [scheduleAt] DATETIME NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_Inv_Employer] FOREIGN KEY ([employerId]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Inv_Candidate] FOREIGN KEY ([candidateId]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Inv_Job]       FOREIGN KEY ([jobId])       REFERENCES [dbo].[jobs]([id])
    );
END
GO

/* ===================== notifications ===================== */
IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[notifications] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [type] NVARCHAR(50) NOT NULL,
        [payload] NVARCHAR(MAX) NULL DEFAULT '{}',
        [isRead] BIT NOT NULL DEFAULT 0,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_Noti_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
    );
END
GO

/* ===================== reviews ===================== */
IF OBJECT_ID(N'dbo.reviews', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[reviews] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [companyUserId] UNIQUEIDENTIFIER NOT NULL,
        [reviewerId] UNIQUEIDENTIFIER NOT NULL,
        [rating] INT NOT NULL CHECK ([rating] BETWEEN 1 AND 5),
        [title] NVARCHAR(255) NULL,
        [content] NVARCHAR(MAX) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ([status] IN ('pending','approved','rejected')),
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_Rev_Company]  FOREIGN KEY ([companyUserId]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Rev_Reviewer] FOREIGN KEY ([reviewerId])   REFERENCES [dbo].[users]([id])
    );
END
GO

/* ===================== oauth_accounts ===================== */
IF OBJECT_ID(N'dbo.oauth_accounts', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[oauth_accounts] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [provider] NVARCHAR(50) NOT NULL CHECK ([provider] IN ('google','linkedin')),
        [providerUserId] NVARCHAR(255) NOT NULL,
        [email] NVARCHAR(255) NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_OAuth_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_OAuth] UNIQUE ([provider],[providerUserId])
    );
END
GO

/* ============ SAFE PATCH BỔ SUNG CHO HIỆU NĂNG & DỌN TRIGGER CŨ =========== */
BEGIN TRY
  BEGIN TRAN;

  -- Index thêm cho apps/invitations/saved_jobs (nếu thiếu)
  IF OBJECT_ID(N'dbo.applications', N'U') IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_JobId'       AND object_id=OBJECT_ID('dbo.applications'))
      CREATE INDEX IDX_Apps_JobId       ON dbo.applications(jobId);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_CandidateId' AND object_id=OBJECT_ID('dbo.applications'))
      CREATE INDEX IDX_Apps_CandidateId ON dbo.applications(candidateId);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_CreatedAt'   AND object_id=OBJECT_ID('dbo.applications'))
      CREATE INDEX IDX_Apps_CreatedAt   ON dbo.applications(createdAt);
  END

  IF OBJECT_ID(N'dbo.invitations', N'U') IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_JobId'       AND object_id=OBJECT_ID('dbo.invitations'))
      CREATE INDEX IDX_Inv_JobId       ON dbo.invitations(jobId);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_EmployerId'  AND object_id=OBJECT_ID('dbo.invitations'))
      CREATE INDEX IDX_Inv_EmployerId  ON dbo.invitations(employerId);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_CandidateId' AND object_id=OBJECT_ID('dbo.invitations'))
      CREATE INDEX IDX_Inv_CandidateId ON dbo.invitations(candidateId);
  END

  IF OBJECT_ID(N'dbo.saved_jobs', N'U') IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Saved_JobId' AND object_id=OBJECT_ID('dbo.saved_jobs'))
      CREATE INDEX IDX_Saved_JobId ON dbo.saved_jobs(jobId);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Saved_UserId' AND object_id=OBJECT_ID('dbo.saved_jobs'))
      CREATE INDEX IDX_Saved_UserId ON dbo.saved_jobs(userId);
  END

  -- Dọn trigger xóa jobs nếu lỡ tạo trước đó (để backend xử lý)
  IF OBJECT_ID(N'dbo.trg_Job_Delete', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Job_Delete;
  IF OBJECT_ID(N'dbo.trg_AfterDeleteJob', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AfterDeleteJob;

  COMMIT TRAN;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH;
GO

/* ===================== Admin duy nhất ===================== */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Users_SingleAdmin' AND object_id = OBJECT_ID('[dbo].[users]'))
BEGIN
    CREATE UNIQUE INDEX [UQ_Users_SingleAdmin]
    ON [dbo].[users] ([userType])
    WHERE [userType] = 'admin';
END
GO

/* ===================== Admin mặc định ===================== */
DECLARE @NewAdminEmail NVARCHAR(255) = N'admin@jobhire.local';
BEGIN TRY
    BEGIN TRAN;
    UPDATE [dbo].[users] SET [userType] = 'candidate' WHERE [userType] = 'admin' AND [email] <> @NewAdminEmail;
    IF EXISTS (SELECT 1 FROM [dbo].[users] WHERE [email] = @NewAdminEmail)
        UPDATE [dbo].[users] SET [userType] = 'admin' WHERE [email] = @NewAdminEmail;
    ELSE
        INSERT INTO [dbo].[users] ([name],[email],[password],[userType],[isVerified])
        VALUES (N'System Admin', @NewAdminEmail, N'Admin@123', 'admin', 1);
    COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
END CATCH;
GO

/* =====================================================
   📊 KIỂM TRA KẾT QUẢ
   ===================================================== */
PRINT '';
PRINT '========================================';
PRINT '   KIỂM TRA CẤU TRÚC DATABASE';
PRINT '========================================';
PRINT '';

-- Kiểm tra bảng Jobs (cột AI)
PRINT '✅ Cột JD trong bảng jobs:';
SELECT TOP 1 
    id, title, jdText, mustHaveSkills, niceToHaveSkills, jdVersion 
FROM dbo.jobs 
ORDER BY createdAt DESC;

-- Kiểm tra bảng Scores
PRINT '';
PRINT '✅ Bảng scores (lúc đầu trống):';
SELECT TOP 5 * FROM dbo.scores ORDER BY generatedAt DESC;

-- Kiểm tra View
PRINT '';
PRINT '✅ View v_latest_scores:';
SELECT * FROM dbo.v_latest_scores;

-- Kiểm tra FK tới jobs
PRINT '';
PRINT '✅ Foreign Keys tham chiếu tới jobs:';
SELECT fk.name AS fk_name,
       OBJECT_NAME(fk.parent_object_id) AS child_table,
       fk.delete_referential_action_desc AS on_delete
FROM sys.foreign_keys fk
WHERE fk.referenced_object_id = OBJECT_ID('dbo.jobs');

-- Kiểm tra Admin
PRINT '';
PRINT '✅ Admin hiện có:';
SELECT [id],[email],[userType] FROM [dbo].[users] WHERE [userType] = 'admin';

PRINT '';
PRINT '========================================';
PRINT '   🎉 HOÀN TẤT CẤU TRÚC DATABASE';
PRINT '========================================';
PRINT '';
PRINT '📝 THAY ĐỔI MỚI (AI Scoring):';
PRINT '   1. Bảng jobs: +4 cột (jdText, mustHaveSkills, niceToHaveSkills, jdVersion)';
PRINT '   2. Bảng scores: MỚI (lưu kết quả chấm điểm AI)';
PRINT '   3. View v_latest_scores: Lấy điểm mới nhất';
PRINT '';
PRINT '🔄 BƯỚC TIẾP THEO:';
PRINT '   → Cấu hình backend Node.js (aiClient + scoreService)';
PRINT '   → Tích hợp vào route Apply';
PRINT '';
GO