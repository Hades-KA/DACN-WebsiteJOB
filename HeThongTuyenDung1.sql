------------------------------------------------------------
-- BẢNG NGƯỜI DÙNG (USERS)
-- Lưu thông tin tất cả người dùng trong hệ thống:
-- ứng viên (candidate), nhà tuyển dụng (employer), quản trị viên (admin)
------------------------------------------------------------
------------------------------------------------------------
-- BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE [users] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [name] NVARCHAR(100) NOT NULL,
    [email] NVARCHAR(255) NOT NULL UNIQUE,
    [password] NVARCHAR(255) NOT NULL,
    [phone] NVARCHAR(20) NULL,
    [userType] NVARCHAR(20) CHECK ([userType] IN ('candidate', 'employer', 'admin')) NOT NULL DEFAULT 'candidate',
    [company] NVARCHAR(255) NULL,
    [avatar] NVARCHAR(500) NULL,
    [isActive] BIT DEFAULT 1,
    [isVerified] BIT DEFAULT 0,
    [lastLogin] DATETIME NULL,
    [resetPasswordToken] NVARCHAR(255) NULL,
    [resetPasswordExpires] DATETIME NULL,
    [verificationToken] NVARCHAR(255) NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    [updatedAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT CK_UserType CHECK ([userType] IN ('candidate', 'employer', 'admin'))
);

CREATE INDEX IDX_Email ON [users]([email]);
CREATE INDEX IDX_Phone ON [users]([phone]);
CREATE INDEX IDX_UserType ON [users]([userType]);
CREATE INDEX IDX_LastLogin ON [users]([lastLogin]);
GO

-- Trigger tự động cập nhật updatedAt
CREATE TRIGGER trg_UpdateUpdatedAt
ON [users]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [users]
    SET [updatedAt] = GETDATE()
    WHERE [id] IN (SELECT DISTINCT [id] FROM inserted);
END;
GO


------------------------------------------------------------
-- 3️⃣ BẢNG CÔNG VIỆC (JOBS)
------------------------------------------------------------
CREATE TABLE [jobs] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [title] NVARCHAR(255) NOT NULL,
    [company] NVARCHAR(255) NOT NULL,
    [location] NVARCHAR(255) NOT NULL,
    [salary] NVARCHAR(100) NULL,
    [type] NVARCHAR(50) CHECK ([type] IN ('full-time', 'part-time', 'contract', 'intern')) NOT NULL DEFAULT 'full-time',
    [experience] NVARCHAR(50) NULL,
    [description] NVARCHAR(MAX) NOT NULL,
    [requirements] NVARCHAR(MAX) NOT NULL,
    [benefits] NVARCHAR(MAX) NULL,
    [category] NVARCHAR(100) NOT NULL,
    [skills] NVARCHAR(MAX) NULL,
    [deadline] DATETIME NULL,
    [isActive] BIT DEFAULT 1,
    [isFeatured] BIT DEFAULT 0,
    [applicationsCount] INT DEFAULT 0,
    [viewsCount] INT DEFAULT 0,
    [employerId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    [updatedAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Employer FOREIGN KEY ([employerId]) REFERENCES [users]([id]) ON DELETE CASCADE
);

CREATE INDEX IDX_Category ON [jobs]([category]);
CREATE INDEX IDX_Location ON [jobs]([location]);
CREATE INDEX IDX_Type ON [jobs]([type]);
CREATE INDEX IDX_IsActive ON [jobs]([isActive]);
CREATE INDEX IDX_EmployerId ON [jobs]([employerId]);
CREATE UNIQUE INDEX IDX_JobTitleCompany ON [jobs]([title],[company]);
GO


------------------------------------------------------------
-- 4️⃣ BẢNG CVS
------------------------------------------------------------
CREATE TABLE [cvs] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
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
    [isAnalyzed] BIT DEFAULT 0,
    [isActive] BIT DEFAULT 1,
    [candidateId] UNIQUEIDENTIFIER NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    [updatedAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Candidate FOREIGN KEY ([candidateId]) REFERENCES [users]([id]) ON DELETE CASCADE
);
GO


------------------------------------------------------------
-- 5️⃣ BẢNG APPLICATIONS
------------------------------------------------------------
CREATE TABLE [applications] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
    [coverLetter] NVARCHAR(MAX) NULL,
    [expectedSalary] DECIMAL(10,2) NULL,
    [availableFrom] DATETIME NULL,
    [notes] NVARCHAR(MAX) NULL,
    [aiMatchScore] DECIMAL(3,1) NULL CHECK ([aiMatchScore] BETWEEN 0 AND 10),
    [aiAnalysis] NVARCHAR(MAX) NULL DEFAULT '{}',
    [isAnalyzed] BIT DEFAULT 0,
    [jobId] UNIQUEIDENTIFIER NOT NULL,
    [candidateId] UNIQUEIDENTIFIER NOT NULL,
    [cvId] UNIQUEIDENTIFIER NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    [updatedAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Job FOREIGN KEY ([jobId]) REFERENCES [jobs]([id]) ON DELETE NO ACTION,
    CONSTRAINT FK_CandidateApp FOREIGN KEY ([candidateId]) REFERENCES [users]([id]) ON DELETE NO ACTION,
    CONSTRAINT FK_CV FOREIGN KEY ([cvId]) REFERENCES [cvs]([id]) ON DELETE SET NULL
);
GO


------------------------------------------------------------
-- 6️⃣ CÁC BẢNG PHỤ (saved_jobs, invitations, notifications, reviews, oauth_accounts)
------------------------------------------------------------
CREATE TABLE [saved_jobs] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [jobId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_SavedJobs_User FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE,
    CONSTRAINT FK_SavedJobs_Job FOREIGN KEY ([jobId]) REFERENCES [jobs]([id]) ON DELETE CASCADE,
    CONSTRAINT UQ_SavedJobs UNIQUE ([userId],[jobId])
);

CREATE TABLE [invitations] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [employerId] UNIQUEIDENTIFIER NOT NULL,
    [candidateId] UNIQUEIDENTIFIER NOT NULL,
    [jobId] UNIQUEIDENTIFIER NOT NULL,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ([status] IN ('pending','accepted','declined','expired')),
    [message] NVARCHAR(MAX) NULL,
    [scheduleAt] DATETIME NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    [updatedAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Inv_Employer FOREIGN KEY ([employerId]) REFERENCES [users]([id]),
    CONSTRAINT FK_Inv_Candidate FOREIGN KEY ([candidateId]) REFERENCES [users]([id]),
    CONSTRAINT FK_Inv_Job FOREIGN KEY ([jobId]) REFERENCES [jobs]([id])
);

CREATE TABLE [notifications] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [type] NVARCHAR(50) NOT NULL,
    [payload] NVARCHAR(MAX) NULL DEFAULT '{}',
    [isRead] BIT DEFAULT 0,
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Noti_User FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE
);

CREATE TABLE [reviews] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [companyUserId] UNIQUEIDENTIFIER NOT NULL,
    [reviewerId] UNIQUEIDENTIFIER NOT NULL,
    [rating] INT NOT NULL CHECK ([rating] BETWEEN 1 AND 5),
    [title] NVARCHAR(255) NULL,
    [content] NVARCHAR(MAX) NULL,
    [status] NVARCHAR(20) DEFAULT 'pending' CHECK ([status] IN ('pending','approved','rejected')),
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Rev_Company FOREIGN KEY ([companyUserId]) REFERENCES [users]([id]),
    CONSTRAINT FK_Rev_Reviewer FOREIGN KEY ([reviewerId]) REFERENCES [users]([id])
);

CREATE TABLE [oauth_accounts] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [provider] NVARCHAR(50) NOT NULL CHECK ([provider] IN ('google','linkedin')),
    [providerUserId] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255) NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_OAuth_User FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE,
    CONSTRAINT UQ_OAuth UNIQUE ([provider],[providerUserId])
);
GO


------------------------------------------------------------
-- 7️⃣ TẠO UNIQUE INDEX CHO ADMIN (CHỈ CHO PHÉP 1 ADMIN)
------------------------------------------------------------
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes 
  WHERE name = 'UQ_Users_SingleAdmin' AND object_id = OBJECT_ID('[users]')
)
BEGIN
  CREATE UNIQUE INDEX UQ_Users_SingleAdmin ON [users]([userType]) WHERE [userType] = 'admin';
END
GO


------------------------------------------------------------
-- 8️⃣ GÁN ADMIN MẶC ĐỊNH (CHỈ 1 NGƯỜI)
------------------------------------------------------------
DECLARE @NewAdminEmail NVARCHAR(255) = N'admin@jobhire.local'; -- ⚠️ ĐỔI EMAIL NÀY SANG ADMIN THẬT

BEGIN TRY
  BEGIN TRAN;
  UPDATE [users]
  SET [userType] = 'candidate'
  WHERE [userType] = 'admin' AND [email] <> @NewAdminEmail;

  IF EXISTS (SELECT 1 FROM [users] WHERE [email] = @NewAdminEmail)
    UPDATE [users] SET [userType] = 'admin' WHERE [email] = @NewAdminEmail;

  COMMIT TRAN;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH;
GO



-- 9️⃣ KIỂM TRA KẾT QUẢ
------------------------------------------------------------
SELECT [id], [email], [userType]
FROM [users]
WHERE [userType] = 'admin';
GO

-- XÓA TOÀN BỘ BẢNG CŨ (theo thứ tự khóa ngoại)
------------------------------------------------------------
IF OBJECT_ID('[oauth_accounts]', 'U') IS NOT NULL DROP TABLE [oauth_accounts];
IF OBJECT_ID('[reviews]', 'U') IS NOT NULL DROP TABLE [reviews];
IF OBJECT_ID('[notifications]', 'U') IS NOT NULL DROP TABLE [notifications];
IF OBJECT_ID('[invitations]', 'U') IS NOT NULL DROP TABLE [invitations];
IF OBJECT_ID('[saved_jobs]', 'U') IS NOT NULL DROP TABLE [saved_jobs];
IF OBJECT_ID('[applications]', 'U') IS NOT NULL DROP TABLE [applications];
IF OBJECT_ID('[cvs]', 'U') IS NOT NULL DROP TABLE [cvs];
IF OBJECT_ID('[jobs]', 'U') IS NOT NULL DROP TABLE [jobs];
IF OBJECT_ID('[users]', 'U') IS NOT NULL DROP TABLE [users];
GO