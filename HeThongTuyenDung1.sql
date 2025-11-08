/* ===============================
   HeThongTuyenDung – FULL DDL + SAFE PATCH
   =============================== */

---------------------------------
-- 1) Tạo DB nếu chưa có
---------------------------------
IF DB_ID(N'HeThongTuyenDung') IS NULL
BEGIN
    CREATE DATABASE [HeThongTuyenDung];
END
GO

USE [HeThongTuyenDung];
GO

---------------------------------
-- 2) USERS (có hồ sơ ứng viên + hồ sơ công ty)
---------------------------------
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

        -- Hồ sơ công ty (employer)
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
    -- SAFE PATCH: thêm các cột hồ sơ công ty nếu thiếu
    IF COL_LENGTH('dbo.users','companyWebsite')   IS NULL ALTER TABLE dbo.users ADD companyWebsite   NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.users','companySize')      IS NULL ALTER TABLE dbo.users ADD companySize      NVARCHAR(50)  NULL;
    IF COL_LENGTH('dbo.users','industry')         IS NULL ALTER TABLE dbo.users ADD industry         NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.users','taxCode')          IS NULL ALTER TABLE dbo.users ADD taxCode          NVARCHAR(50)  NULL;
    IF COL_LENGTH('dbo.users','businessLicense')  IS NULL ALTER TABLE dbo.users ADD businessLicense  NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.users','companyCity')      IS NULL ALTER TABLE dbo.users ADD companyCity      NVARCHAR(100) NULL;
    IF COL_LENGTH('dbo.users','companyAddress')   IS NULL ALTER TABLE dbo.users ADD companyAddress   NVARCHAR(255) NULL;
    IF COL_LENGTH('dbo.users','logoUrl')          IS NULL ALTER TABLE dbo.users ADD logoUrl          NVARCHAR(500) NULL;
    IF COL_LENGTH('dbo.users','companyAbout')     IS NULL ALTER TABLE dbo.users ADD companyAbout     NVARCHAR(MAX) NULL;
END
GO

-- Index cho USERS (tạo nếu chưa có)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Phone' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_Phone] ON [dbo].[users] ([phone]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_UserType' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_UserType] ON [dbo].[users] ([userType]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_LastLogin' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX [IDX_LastLogin] ON [dbo].[users] ([lastLogin]);

-- Index hỗ trợ search employer theo tên công ty
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Users_Company_Employer' AND object_id = OBJECT_ID('dbo.users'))
BEGIN
    CREATE INDEX [IDX_Users_Company_Employer]
    ON [dbo].[users] ([company])
    WHERE [userType] = 'employer';
END

-- Trigger cập nhật updatedAt
IF OBJECT_ID(N'dbo.trg_UpdateUpdatedAt', N'TR') IS NULL
    EXEC('
    CREATE TRIGGER [dbo].[trg_UpdateUpdatedAt]
    ON [dbo].[users]
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE u
        SET [updatedAt] = GETDATE()
        FROM [dbo].[users] u
        INNER JOIN inserted i ON u.[id] = i.[id];
    END
');

GO

---------------------------------
-- 3) JOBS
---------------------------------
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

-- Index cho JOBS
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
-- Optional (nên cân nhắc dữ liệu hiện tại trước khi bật vì UNIQUE):
-- IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_JobTitle_PerEmployer' AND object_id = OBJECT_ID('dbo.jobs'))
--     CREATE UNIQUE INDEX [UQ_JobTitle_PerEmployer] ON [dbo].[jobs] ([employerId],[title]);
GO

---------------------------------
-- 4) CVS
---------------------------------
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

---------------------------------
-- 5) APPLICATIONS
---------------------------------
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
        CONSTRAINT [FK_Apps_Job] FOREIGN KEY ([jobId]) REFERENCES [dbo].[jobs]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Apps_Candidate] FOREIGN KEY ([candidateId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Apps_CV] FOREIGN KEY ([cvId]) REFERENCES [dbo].[cvs]([id]) ON DELETE SET NULL
    );
    -- Chống nộp đơn trùng (1 ứng viên / 1 job)
    CREATE UNIQUE INDEX [UQ_Application_Job_Candidate] ON [dbo].[applications]([jobId],[candidateId]);
END
GO

---------------------------------
-- 6) saved_jobs
---------------------------------
IF OBJECT_ID(N'dbo.saved_jobs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[saved_jobs] (
        [id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [userId] UNIQUEIDENTIFIER NOT NULL,
        [jobId] UNIQUEIDENTIFIER NOT NULL,
        [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [FK_SavedJobs_User] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SavedJobs_Job] FOREIGN KEY ([jobId]) REFERENCES [dbo].[jobs]([id]) ON DELETE CASCADE,
        CONSTRAINT [UQ_SavedJobs] UNIQUE ([userId],[jobId])
    );
END
GO

---------------------------------
-- 7) invitations
---------------------------------
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
        CONSTRAINT [FK_Inv_Job] FOREIGN KEY ([jobId]) REFERENCES [dbo].[jobs]([id])
    );
END
GO

---------------------------------
-- 8) notifications
---------------------------------
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

---------------------------------
-- 9) reviews
---------------------------------
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
        CONSTRAINT [FK_Rev_Company] FOREIGN KEY ([companyUserId]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_Rev_Reviewer] FOREIGN KEY ([reviewerId]) REFERENCES [dbo].[users]([id])
    );
END
GO

---------------------------------
-- 10) oauth_accounts
---------------------------------
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

---------------------------------
-- 11) Unique filtered index: chỉ 1 admin
---------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'UQ_Users_SingleAdmin' AND object_id = OBJECT_ID('[dbo].[users]')
)
BEGIN
    -- Chỉ cho phép tối đa 1 dòng có userType='admin'
    CREATE UNIQUE INDEX [UQ_Users_SingleAdmin]
    ON [dbo].[users] ([userType])
    WHERE [userType] = 'admin';
END
GO

---------------------------------
-- 12) Gán ADMIN mặc định
---------------------------------
DECLARE @NewAdminEmail NVARCHAR(255) = N'admin@jobhire.local';
BEGIN TRY
    BEGIN TRAN;

    -- Chuyển mọi admin khác (nếu có) về candidate (để thỏa unique 1 admin)
    UPDATE [dbo].[users]
    SET [userType] = 'candidate'
    WHERE [userType] = 'admin' AND [email] <> @NewAdminEmail;

    -- Đảm bảo có đúng 1 admin
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

---------------------------------
-- 13) Kiểm tra nhanh
---------------------------------
SELECT [id],[email],[userType] FROM [dbo].[users] WHERE [userType] = 'admin';
GO

-- Verify cột hồ sơ công ty đã có
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'users'
  AND COLUMN_NAME IN (
    'companyWebsite','companySize','industry','taxCode','businessLicense',
    'companyCity','companyAddress','logoUrl','companyAbout'
  )
ORDER BY COLUMN_NAME;
GO