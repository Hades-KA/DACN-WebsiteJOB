/* =====================================================
   HỆ THỐNG TUYỂN DỤNG - DATABASE SCHEMA
   Phiên bản: 2.4 (FIX LỖI NỘP ĐƠN - UPDATED)
   Nội dung: Full code cũ + Fix lỗi ngày tháng bảng Applications
   ===================================================== */

--------------------------------------------------------
-- 0. TẠO DATABASE NẾU CHƯA CÓ
--------------------------------------------------------
IF DB_ID(N'HeThongTuyenDungDB') IS NULL
BEGIN
    CREATE DATABASE [HeThongTuyenDungDB];
    PRINT 'Đã tạo database HeThongTuyenDungDB';
END
GO

USE [HeThongTuyenDungDB];
GO

/* =====================================================
   1. BẢNG USERS
   ===================================================== */
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[users] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [name] NVARCHAR(100) NOT NULL,
        [email] NVARCHAR(255) NOT NULL UNIQUE,
        [password] NVARCHAR(255) NOT NULL,
        [phone] NVARCHAR(20) NULL,
        [userType] NVARCHAR(20) NOT NULL DEFAULT 'candidate'
            CHECK ([userType] IN ('candidate','employer','admin')),
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

        -- Hồ sơ công ty (employer)
        [companyWebsite] NVARCHAR(255) NULL,
        [companySize] NVARCHAR(50) NULL, 
        [industry] NVARCHAR(100) NULL,
        [taxCode] NVARCHAR(50) NULL,
        [businessLicense] NVARCHAR(100) NULL,
        [companyCity] NVARCHAR(100) NULL,
        [companyAddress] NVARCHAR(255) NULL,
        [logoUrl] NVARCHAR(500) NULL,
        [companyAbout] NVARCHAR(MAX) NULL,

        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );
END
ELSE
BEGIN
    -- SAFE PATCH
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
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Phone' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_Phone] ON [dbo].[users] ([phone]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_UserType' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_UserType] ON [dbo].[users] ([userType]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_LastLogin' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_LastLogin] ON [dbo].[users] ([lastLogin]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Users_Company_Employer' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_Users_Company_Employer] ON [dbo].[users] ([company]) WHERE [userType] = 'employer';
GO

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

/* =====================================================
   2. BẢNG JOBS
   ===================================================== */
IF OBJECT_ID(N'dbo.jobs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[jobs] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [title] NVARCHAR(255) NOT NULL,
        [company] NVARCHAR(255) NOT NULL,
        [location] NVARCHAR(255) NOT NULL,
        [salary] NVARCHAR(100) NULL,
        [type] NVARCHAR(50) NOT NULL DEFAULT 'full-time'
            CHECK ([type] IN ('full-time','part-time','contract','intern')),
        [experience] NVARCHAR(50) NULL,

        [description] NVARCHAR(MAX) NOT NULL,
        [requirements] NVARCHAR(MAX) NOT NULL,
        [benefits] NVARCHAR(MAX) NULL,

        [category] NVARCHAR(100) NOT NULL,
        [skills] NVARCHAR(MAX) NULL,

        [jdText] NVARCHAR(MAX) NULL,
        [mustHaveSkills] NVARCHAR(MAX) NULL,
        [niceToHaveSkills] NVARCHAR(MAX) NULL,
        [jdVersion] INT NOT NULL DEFAULT 1,

        [level] NVARCHAR(50) NULL,
        [education] NVARCHAR(50) NULL,
        [experienceBand] NVARCHAR(50) NULL,
        [salaryBand] NVARCHAR(50) NULL,
        [workMode] NVARCHAR(20) NULL,
        [headcount] INT NULL,

        [contactName] NVARCHAR(255) NULL,
        [contactEmail] NVARCHAR(255) NULL,
        [contactPhone] NVARCHAR(50) NULL,
        [contactAddress] NVARCHAR(255) NULL,
        [jobCode] NVARCHAR(50) NULL,

        [workAddress] NVARCHAR(500) NULL,

        [deadline] DATETIME NULL,
        [isActive] BIT NOT NULL DEFAULT 1,
        [isFeatured] BIT NOT NULL DEFAULT 0,

        [applicationsCount] INT NOT NULL DEFAULT 0,
        [viewsCount] INT NOT NULL DEFAULT 0,

        [employerId] UNIQUEIDENTIFIER NOT NULL,

        -- v2.3: dùng DATETIMEOFFSET để tránh lỗi convert khi Sequelize gửi chuỗi có +00:00
        [createdAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        [updatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT [FK_Jobs_Employer] FOREIGN KEY ([employerId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
    );
END
ELSE
BEGIN
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

    -- v2.3 PATCH: nếu DB cũ còn dùng DATETIME cho createdAt/updatedAt thì convert sang DATETIMEOFFSET
    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'jobs'
          AND COLUMN_NAME = 'createdAt'
          AND DATA_TYPE = 'datetime'
    )
    BEGIN
        DECLARE @dfJobsCreated NVARCHAR(128), @dfJobsUpdated NVARCHAR(128);

        SELECT @dfJobsCreated = dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID('dbo.jobs') AND c.name = 'createdAt';

        SELECT @dfJobsUpdated = dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID('dbo.jobs') AND c.name = 'updatedAt';

        IF @dfJobsCreated IS NOT NULL EXEC('ALTER TABLE dbo.jobs DROP CONSTRAINT ' + @dfJobsCreated);
        IF @dfJobsUpdated IS NOT NULL EXEC('ALTER TABLE dbo.jobs DROP CONSTRAINT ' + @dfJobsUpdated);

        ALTER TABLE dbo.jobs ALTER COLUMN createdAt DATETIMEOFFSET NOT NULL;
        ALTER TABLE dbo.jobs ALTER COLUMN updatedAt DATETIMEOFFSET NOT NULL;

        ALTER TABLE dbo.jobs
          ADD CONSTRAINT DF_Jobs_CreatedAt DEFAULT SYSDATETIMEOFFSET() FOR createdAt;
        ALTER TABLE dbo.jobs
          ADD CONSTRAINT DF_Jobs_UpdatedAt DEFAULT SYSDATETIMEOFFSET() FOR updatedAt;
    END
END
GO

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

/* =====================================================
   3. BẢNG CVS
   ===================================================== */
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
        CONSTRAINT [FK_CVs_Candidate] FOREIGN KEY ([candidateId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE
    );
END
GO

/* =====================================================
   4. BẢNG APPLICATIONS (ĐÃ SỬA LỖI)
   ===================================================== */
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
        [candidateSnapshot] NVARCHAR(MAX) NULL,
        [cvName] NVARCHAR(255) NULL,
        [cvFilePath] NVARCHAR(500) NULL,
        [statusHistory] NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [candidateId] UNIQUEIDENTIFIER NOT NULL,
        [cvId] UNIQUEIDENTIFIER NULL,

        -- [FIX]: Dùng DATETIMEOFFSET để tránh lỗi 500 khi nộp đơn
        [createdAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        [updatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT [FK_Apps_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id]),
        CONSTRAINT [FK_Apps_Candidate] FOREIGN KEY ([candidateId]) 
            REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Apps_CV] FOREIGN KEY ([cvId]) 
            REFERENCES [dbo].[cvs]([id]) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX [UQ_Application_Job_Candidate] 
        ON [dbo].[applications]([jobId],[candidateId]);
END
ELSE
BEGIN
    IF COL_LENGTH('dbo.applications','candidateSnapshot') IS NULL
        ALTER TABLE dbo.applications ADD candidateSnapshot NVARCHAR(MAX);
    IF COL_LENGTH('dbo.applications','cvName') IS NULL
        ALTER TABLE dbo.applications ADD cvName NVARCHAR(255);
    IF COL_LENGTH('dbo.applications','cvFilePath') IS NULL
        ALTER TABLE dbo.applications ADD cvFilePath NVARCHAR(500);
    IF COL_LENGTH('dbo.applications','statusHistory') IS NULL
        ALTER TABLE dbo.applications ADD statusHistory NVARCHAR(MAX) NOT NULL DEFAULT '[]';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_JobId' AND object_id=OBJECT_ID('dbo.applications'))
    CREATE INDEX IDX_Apps_JobId ON dbo.applications(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_CandidateId' AND object_id=OBJECT_ID('dbo.applications'))
    CREATE INDEX IDX_Apps_CandidateId ON dbo.applications(candidateId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Apps_CreatedAt' AND object_id=OBJECT_ID('dbo.applications'))
    CREATE INDEX IDX_Apps_CreatedAt ON dbo.applications(createdAt);
GO

/* =====================================================
   5. BẢNG SCORES
   ===================================================== */
IF OBJECT_ID(N'dbo.scores', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.scores (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [applicationId] UNIQUEIDENTIFIER NOT NULL,
        [scoreTotal] INT NOT NULL DEFAULT 0,
        [matchedSkills] NVARCHAR(MAX) NULL,
        [missingSkills] NVARCHAR(MAX) NULL,
        [missingMustHave] NVARCHAR(MAX) NULL,
        [modelVersion] NVARCHAR(50) NULL,
        [status] NVARCHAR(20) NOT NULL DEFAULT 'success'
            CHECK ([status] IN ('pending','success','error')),
        [errorMessage] NVARCHAR(1000) NULL,
        [generatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Scores_Application FOREIGN KEY ([applicationId]) 
            REFERENCES dbo.applications([id]) ON DELETE CASCADE
    );
    CREATE INDEX IDX_Scores_Application ON dbo.scores([applicationId]);
    CREATE INDEX IDX_Scores_GeneratedAt ON dbo.scores([generatedAt]);
END
GO

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

/* =====================================================
   6. BẢNG SAVED_JOBS
   ===================================================== */
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
            REFERENCES [dbo].[jobs]([id]) ON DELETE NO ACTION,
        CONSTRAINT [UQ_SavedJobs] UNIQUE ([userId],[jobId])
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Saved_JobId' AND object_id=OBJECT_ID('dbo.saved_jobs'))
    CREATE INDEX IDX_Saved_JobId ON dbo.saved_jobs(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Saved_UserId' AND object_id=OBJECT_ID('dbo.saved_jobs'))
    CREATE INDEX IDX_Saved_UserId ON dbo.saved_jobs(userId);
GO

/* =====================================================
   7. BẢNG INVITATIONS
   ===================================================== */
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
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_JobId' AND object_id=OBJECT_ID('dbo.invitations'))
    CREATE INDEX IDX_Inv_JobId ON dbo.invitations(jobId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_EmployerId' AND object_id=OBJECT_ID('dbo.invitations'))
    CREATE INDEX IDX_Inv_EmployerId ON dbo.invitations(employerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_Inv_CandidateId' AND object_id=OBJECT_ID('dbo.invitations'))
    CREATE INDEX IDX_Inv_CandidateId ON dbo.invitations(candidateId);
GO

/* =====================================================
   8. BẢNG NOTIFICATIONS
   ===================================================== */
IF OBJECT_ID(N'dbo.notifications', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[notifications] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [type] NVARCHAR(50) NOT NULL DEFAULT 'info',
        [title] NVARCHAR(255) NOT NULL,
        [message] NVARCHAR(MAX) NULL,
        [content] NVARCHAR(MAX) NULL,
        [jobId] UNIQUEIDENTIFIER NULL,
        [payload] NVARCHAR(MAX) NULL DEFAULT '{}',
        [isRead] BIT NOT NULL DEFAULT 0,
        -- v2.3: dùng DATETIMEOFFSET cho createdAt/updatedAt để tương thích Sequelize
        [createdAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        [updatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT [FK_Noti_User] FOREIGN KEY ([userId]) 
            REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Noti_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id]) ON DELETE NO ACTION
    );
    CREATE INDEX [IDX_Noti_UserId]   ON dbo.notifications([userId]);
    CREATE INDEX [IDX_Noti_IsRead]   ON dbo.notifications([isRead]);
    CREATE INDEX [IDX_Noti_CreatedAt]ON dbo.notifications([createdAt]);
    CREATE INDEX [IDX_Noti_Type]     ON dbo.notifications([type]);
END
ELSE
BEGIN
    IF COL_LENGTH('dbo.notifications', 'title') IS NULL
        ALTER TABLE dbo.notifications ADD [title] NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.notifications', 'message') IS NULL
        ALTER TABLE dbo.notifications ADD [message] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.notifications', 'content') IS NULL
        ALTER TABLE dbo.notifications ADD [content] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('dbo.notifications', 'jobId') IS NULL
        ALTER TABLE dbo.notifications ADD [jobId] UNIQUEIDENTIFIER NULL;
    IF COL_LENGTH('dbo.notifications', 'updatedAt') IS NULL
        ALTER TABLE dbo.notifications ADD [updatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET();

    IF NOT EXISTS (
        SELECT 1 FROM sys.foreign_keys 
        WHERE name = 'FK_Noti_Job' 
          AND parent_object_id = OBJECT_ID('dbo.notifications')
    )
        ALTER TABLE dbo.notifications
        ADD CONSTRAINT [FK_Noti_Job] FOREIGN KEY ([jobId]) 
            REFERENCES [dbo].[jobs]([id]) ON DELETE SET NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_UserId' AND object_id = OBJECT_ID('dbo.notifications'))
        CREATE INDEX [IDX_Noti_UserId] ON dbo.notifications([userId]);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_IsRead' AND object_id = OBJECT_ID('dbo.notifications'))
        CREATE INDEX [IDX_Noti_IsRead] ON dbo.notifications([isRead]);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_CreatedAt' AND object_id = OBJECT_ID('dbo.notifications'))
        CREATE INDEX [IDX_Noti_CreatedAt] ON dbo.notifications([createdAt]);
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Noti_Type' AND object_id = OBJECT_ID('dbo.notifications'))
        CREATE INDEX [IDX_Noti_Type] ON dbo.notifications([type]);

    -- v2.3 PATCH: convert createdAt/updatedAt từ DATETIME sang DATETIMEOFFSET nếu DB cũ
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'notifications'
          AND COLUMN_NAME = 'createdAt'
          AND DATA_TYPE = 'datetime'
    )
    BEGIN
        DECLARE @dfNotiCreated NVARCHAR(128), @dfNotiUpdated NVARCHAR(128);

        SELECT @dfNotiCreated = dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID('dbo.notifications') AND c.name = 'createdAt';

        SELECT @dfNotiUpdated = dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID('dbo.notifications') AND c.name = 'updatedAt';

        IF @dfNotiCreated IS NOT NULL EXEC('ALTER TABLE dbo.notifications DROP CONSTRAINT ' + @dfNotiCreated);
        IF @dfNotiUpdated IS NOT NULL EXEC('ALTER TABLE dbo.notifications DROP CONSTRAINT ' + @dfNotiUpdated);

        ALTER TABLE dbo.notifications ALTER COLUMN createdAt DATETIMEOFFSET NOT NULL;
        ALTER TABLE dbo.notifications ALTER COLUMN updatedAt DATETIMEOFFSET NOT NULL;

        ALTER TABLE dbo.notifications
          ADD CONSTRAINT DF_Noti_CreatedAt DEFAULT SYSDATETIMEOFFSET() FOR createdAt;
        ALTER TABLE dbo.notifications
          ADD CONSTRAINT DF_Noti_UpdatedAt DEFAULT SYSDATETIMEOFFSET() FOR updatedAt;
    END
END
GO

IF OBJECT_ID(N'dbo.trg_Notifications_UpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Notifications_UpdatedAt;
GO

CREATE TRIGGER [dbo].[trg_Notifications_UpdatedAt]
ON [dbo].[notifications]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    -- v2.3: dùng SYSDATETIMEOFFSET cho đúng kiểu DATETIMEOFFSET
    UPDATE n SET [updatedAt] = SYSDATETIMEOFFSET()
    FROM [dbo].[notifications] n
    INNER JOIN inserted i ON n.[id] = i.[id];
END
GO

/* =====================================================
   9. BẢNG REVIEWS
   ===================================================== */
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
END
GO

/* =====================================================
   10. BẢNG OAUTH_ACCOUNTS
   ===================================================== */
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
END
GO

/* =====================================================
   11. CONVERSATIONS (CHAT)
   ===================================================== */
IF OBJECT_ID(N'dbo.conversations', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[conversations] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [employerId] UNIQUEIDENTIFIER NOT NULL,
        [candidateId] UNIQUEIDENTIFIER NOT NULL,
        [jobId] UNIQUEIDENTIFIER NULL,
        [lastMessage] NVARCHAR(MAX) NULL,
        [lastSenderId] UNIQUEIDENTIFIER NULL,
        [lastSenderType] NVARCHAR(20) NULL 
            CHECK ([lastSenderType] IN ('employer','candidate','system')),
        [lastMessageAt] DATETIMEOFFSET NULL,
        [unreadForEmployer] INT NOT NULL DEFAULT 0,
        [unreadForCandidate] INT NOT NULL DEFAULT 0,
        [isArchivedByEmployer] BIT NOT NULL DEFAULT 0,
        [isArchivedByCandidate] BIT NOT NULL DEFAULT 0,
        [createdAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        [updatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT [FK_Conv_Employer]  FOREIGN KEY ([employerId])  REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Conv_Candidate] FOREIGN KEY ([candidateId]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Conv_Job]       FOREIGN KEY ([jobId])       REFERENCES [dbo].[jobs]([id])
    );
    CREATE INDEX [IDX_Conv_Employer]  ON [dbo].[conversations]([employerId]);
    CREATE INDEX [IDX_Conv_Candidate] ON [dbo].[conversations]([candidateId]);
    CREATE INDEX [IDX_Conv_Job]       ON [dbo].[conversations]([jobId]);
    CREATE INDEX [IDX_Conv_UpdatedAt] ON [dbo].[conversations]([updatedAt]);
END
GO

IF OBJECT_ID(N'dbo.trg_Conversations_UpdatedAt', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_Conversations_UpdatedAt;
GO

CREATE TRIGGER [dbo].[trg_Conversations_UpdatedAt]
ON [dbo].[conversations]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE c SET [updatedAt] = SYSDATETIMEOFFSET()
    FROM [dbo].[conversations] c
    INNER JOIN inserted i ON c.[id] = i.[id];
END
GO

/* =====================================================
   12. MESSAGES (CHAT)
   ===================================================== */
IF OBJECT_ID(N'dbo.messages', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[messages] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [conversationId] UNIQUEIDENTIFIER NOT NULL,
        [senderId] UNIQUEIDENTIFIER NOT NULL,
        [senderType] NVARCHAR(20) NOT NULL 
            CHECK ([senderType] IN ('employer','candidate','system')),
        [content] NVARCHAR(MAX) NULL,
        [attachments] NVARCHAR(MAX) NULL,
        [isRead] BIT NOT NULL DEFAULT 0,
        [readAt] DATETIMEOFFSET NULL,
        [createdAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT [FK_Msg_Conversation] FOREIGN KEY ([conversationId]) 
            REFERENCES [dbo].[conversations]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Msg_Sender] FOREIGN KEY ([senderId]) 
            REFERENCES [dbo].[users]([id])
    );
    CREATE INDEX [IDX_Msg_Conversation] ON [dbo].[messages]([conversationId]);
    CREATE INDEX [IDX_Msg_CreatedAt]    ON [dbo].[messages]([createdAt]);
END
GO

/* =====================================================
   13. CONSTRAINT: CHỈ 1 ADMIN
   ===================================================== */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Users_SingleAdmin' AND object_id = OBJECT_ID('[dbo].[users]'))
BEGIN
    CREATE UNIQUE INDEX [UQ_Users_SingleAdmin]
    ON [dbo].[users] ([userType])
    WHERE [userType] = 'admin';
END
GO

/* =====================================================
   14. TÀI KHOẢN ADMIN MẶC ĐỊNH
   ===================================================== */
DECLARE @AdminEmail NVARCHAR(255) = N'admin@jobhire.local';
DECLARE @AdminPassword NVARCHAR(255) = N'$2a$12$OVWcXGumoY9TVuff9tp5d.ab3ptNm.KiUrpZ5QfYpZ4bCMz8MnZ/q';

BEGIN TRY
    BEGIN TRAN;
    UPDATE [dbo].[users] 
    SET [userType] = 'candidate' 
    WHERE [userType] = 'admin' AND [email] <> @AdminEmail;

    IF EXISTS (SELECT 1 FROM [dbo].[users] WHERE [email] = @AdminEmail)
    BEGIN
        UPDATE [dbo].[users] 
        SET [userType] = 'admin',
            [isVerified] = 1,
            [isActive] = 1
        WHERE [email] = @AdminEmail;
    END
    ELSE
    BEGIN
        INSERT INTO [dbo].[users] ([name],[email],[password],[userType],[isVerified],[isActive])
        VALUES (N'System Admin', @AdminEmail, @AdminPassword, 'admin', 1, 1);
    END
    COMMIT TRAN;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
END CATCH;
GO

/* =====================================================
   15. TEAM MIGRATION: AUTO FIX APPLICATIONS TABLE
   ===================================================== */
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'applications'
      AND COLUMN_NAME = 'createdAt'
      AND DATA_TYPE = 'datetime'
)
BEGIN
    PRINT '>>> Đang tự động sửa lỗi bảng Applications cho team...';
    
    DECLARE @ConstraintName nvarchar(200);

    -- Xóa Default Constraint createdAt
    SELECT @ConstraintName = Name FROM sys.default_constraints 
    WHERE parent_object_id = OBJECT_ID('applications') 
      AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('applications') AND name = 'createdAt');
    IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE applications DROP CONSTRAINT ' + @ConstraintName);

    -- Xóa Default Constraint updatedAt
    SELECT @ConstraintName = Name FROM sys.default_constraints 
    WHERE parent_object_id = OBJECT_ID('applications') 
      AND parent_column_id = (SELECT column_id FROM sys.columns WHERE object_id = OBJECT_ID('applications') AND name = 'updatedAt');
    IF @ConstraintName IS NOT NULL EXEC('ALTER TABLE applications DROP CONSTRAINT ' + @ConstraintName);

    -- Đổi kiểu dữ liệu sang DATETIMEOFFSET (Fix lỗi 500)
    ALTER TABLE [dbo].[applications] ALTER COLUMN [createdAt] DATETIMEOFFSET NOT NULL;
    ALTER TABLE [dbo].[applications] ALTER COLUMN [updatedAt] DATETIMEOFFSET NOT NULL;

    -- Tạo lại Default Constraint
    ALTER TABLE [dbo].[applications] ADD DEFAULT SYSDATETIMEOFFSET() FOR [createdAt];
    ALTER TABLE [dbo].[applications] ADD DEFAULT SYSDATETIMEOFFSET() FOR [updatedAt];
    
    PRINT '>>> ✅ Đã Fix xong bảng Applications!';
END
ELSE
BEGIN
    PRINT '>>> Bảng Applications đã chuẩn DATETIMEOFFSET. Không cần sửa gì.';
END
GO