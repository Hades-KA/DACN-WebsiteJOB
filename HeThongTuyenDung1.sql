------------------------------------------------------------
-- BẢNG NGƯỜI DÙNG (USERS)
-- Lưu thông tin tất cả người dùng trong hệ thống:
-- ứng viên (candidate), nhà tuyển dụng (employer), quản trị viên (admin)
------------------------------------------------------------
IF OBJECT_ID('[users]', 'U') IS NOT NULL DROP TABLE [users];

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

-- Các chỉ mục giúp tăng tốc truy vấn người dùng
CREATE INDEX IDX_Email ON [users] ([email]);
CREATE INDEX IDX_Phone ON [users] ([phone]);
CREATE INDEX IDX_UserType ON [users] ([userType]);
CREATE INDEX IDX_LastLogin ON [users] ([lastLogin]);

-- Trigger: tự động cập nhật trường updatedAt khi có thay đổi
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


------------------------------------------------------------
-- BẢNG CÔNG VIỆC (JOBS)
-- Lưu thông tin công việc do nhà tuyển dụng đăng
------------------------------------------------------------
IF OBJECT_ID('[jobs]', 'U') IS NOT NULL DROP TABLE [jobs];

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

-- Chỉ mục hỗ trợ lọc nhanh theo danh mục, vị trí, loại việc làm
CREATE INDEX IDX_Category ON [jobs] ([category]);
CREATE INDEX IDX_Location ON [jobs] ([location]);
CREATE INDEX IDX_Type ON [jobs] ([type]);
CREATE INDEX IDX_IsActive ON [jobs] ([isActive]);
CREATE INDEX IDX_EmployerId ON [jobs] ([employerId]);

-- Tránh trùng lặp công việc cùng tiêu đề và công ty
CREATE UNIQUE INDEX IDX_JobTitleCompany ON [jobs] ([title], [company]);


------------------------------------------------------------
-- BẢNG HỒ SƠ ỨNG VIÊN (CVS)
-- Lưu các file CV và thông tin phân tích AI của từng ứng viên
------------------------------------------------------------
IF OBJECT_ID('[cvs]', 'U') IS NOT NULL DROP TABLE [cvs];

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

CREATE INDEX IDX_CandidateName ON [cvs] ([candidateName]);
CREATE INDEX IDX_Position ON [cvs] ([position]);
CREATE INDEX IDX_Experience ON [cvs] ([experience]);
CREATE INDEX IDX_Location ON [cvs] ([location]);
CREATE INDEX IDX_AIScore ON [cvs] ([aiScore]);
CREATE INDEX IDX_IsAnalyzed ON [cvs] ([isAnalyzed]);
CREATE INDEX IDX_CandidateId ON [cvs] ([candidateId]);
CREATE UNIQUE INDEX IDX_CandidateFile ON [cvs] ([candidateId], [fileName]);


------------------------------------------------------------
-- BẢNG ĐƠN ỨNG TUYỂN (APPLICATIONS)
-- Ghi lại ứng viên nào đã nộp CV cho công việc nào
------------------------------------------------------------
IF OBJECT_ID('[applications]', 'U') IS NOT NULL DROP TABLE [applications];

CREATE TABLE [applications] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,  
    [status] NVARCHAR(50) NOT NULL DEFAULT 'pending',  
    [coverLetter] NVARCHAR(MAX) NULL,  
    [expectedSalary] DECIMAL(10, 2) NULL,  
    [availableFrom] DATETIME NULL,  
    [notes] NVARCHAR(MAX) NULL,  
    [aiMatchScore] DECIMAL(3, 1) NULL CHECK ([aiMatchScore] BETWEEN 0 AND 10),  
    [aiAnalysis] NVARCHAR(MAX) NULL DEFAULT '{}',  
    [isAnalyzed] BIT DEFAULT 0,  
    [jobId] UNIQUEIDENTIFIER NOT NULL,  
    [candidateId] UNIQUEIDENTIFIER NOT NULL,  
    [cvId] UNIQUEIDENTIFIER NULL,  
    [createdAt] DATETIME DEFAULT GETDATE(),  
    [updatedAt] DATETIME DEFAULT GETDATE(),  
    CONSTRAINT FK_Job FOREIGN KEY ([jobId]) REFERENCES [jobs]([id]) ON DELETE NO ACTION,  
    CONSTRAINT FK_Candidate_Applications FOREIGN KEY ([candidateId]) REFERENCES [users]([id]) ON DELETE NO ACTION,  
    CONSTRAINT FK_CV FOREIGN KEY ([cvId]) REFERENCES [cvs]([id]) ON DELETE SET NULL
);

CREATE INDEX IDX_Status ON [applications] ([status]);
CREATE INDEX IDX_JobId ON [applications] ([jobId]);
CREATE INDEX IDX_CandidateId ON [applications] ([candidateId]);
CREATE INDEX IDX_AIMatchScore ON [applications] ([aiMatchScore]);
CREATE UNIQUE INDEX IDX_JobCandidate ON [applications] ([jobId], [candidateId]);


------------------------------------------------------------
-- BẢNG CÔNG VIỆC ĐÃ LƯU (SAVED JOBS)
-- Ứng viên có thể lưu các công việc họ quan tâm
------------------------------------------------------------
IF OBJECT_ID('[saved_jobs]', 'U') IS NOT NULL DROP TABLE [saved_jobs];

CREATE TABLE [saved_jobs] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [jobId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_SavedJobs_User FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE,
    CONSTRAINT FK_SavedJobs_Job FOREIGN KEY ([jobId]) REFERENCES [jobs]([id]) ON DELETE CASCADE,
    CONSTRAINT UQ_SavedJobs_User_Job UNIQUE ([userId], [jobId])
);

CREATE INDEX IDX_SavedJobs_User ON [saved_jobs]([userId]);
CREATE INDEX IDX_SavedJobs_Job ON [saved_jobs]([jobId]);


------------------------------------------------------------
-- BẢNG LỜI MỜI PHỎNG VẤN (INVITATIONS)
-- Nhà tuyển dụng gửi lời mời phỏng vấn cho ứng viên
------------------------------------------------------------
IF OBJECT_ID('[invitations]', 'U') IS NOT NULL DROP TABLE [invitations];

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

CREATE INDEX IDX_Inv_Employer ON [invitations]([employerId]);
CREATE INDEX IDX_Inv_Candidate ON [invitations]([candidateId]);
CREATE INDEX IDX_Inv_Job ON [invitations]([jobId]);
CREATE INDEX IDX_Inv_Status ON [invitations]([status]);


------------------------------------------------------------
-- BẢNG THÔNG BÁO (NOTIFICATIONS)
-- Lưu thông báo cho từng người dùng (ví dụ: được mời phỏng vấn, CV được duyệt, v.v.)
------------------------------------------------------------
IF OBJECT_ID('[notifications]', 'U') IS NOT NULL DROP TABLE [notifications];

CREATE TABLE [notifications] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [type] NVARCHAR(50) NOT NULL,
    [payload] NVARCHAR(MAX) NULL DEFAULT '{}',
    [isRead] BIT NOT NULL DEFAULT 0,
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Noti_User FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE
);

CREATE INDEX IDX_Noti_User ON [notifications]([userId]);
CREATE INDEX IDX_Noti_IsRead ON [notifications]([isRead]);
CREATE INDEX IDX_Noti_Type ON [notifications]([type]);


------------------------------------------------------------
-- BẢNG ĐÁNH GIÁ CÔNG TY (REVIEWS)
-- Ứng viên đánh giá công ty sau khi làm việc hoặc phỏng vấn
------------------------------------------------------------
IF OBJECT_ID('[reviews]', 'U') IS NOT NULL DROP TABLE [reviews];

CREATE TABLE [reviews] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [companyUserId] UNIQUEIDENTIFIER NOT NULL,
    [reviewerId] UNIQUEIDENTIFIER NOT NULL,
    [rating] INT NOT NULL CHECK ([rating] BETWEEN 1 AND 5),
    [title] NVARCHAR(255) NULL,
    [content] NVARCHAR(MAX) NULL,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'pending' CHECK ([status] IN ('pending','approved','rejected')),
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Rev_CompanyUser FOREIGN KEY ([companyUserId]) REFERENCES [users]([id]),
    CONSTRAINT FK_Rev_Reviewer FOREIGN KEY ([reviewerId]) REFERENCES [users]([id])
);

CREATE INDEX IDX_Rev_Company ON [reviews]([companyUserId]);
CREATE INDEX IDX_Rev_Reviewer ON [reviews]([reviewerId]);
CREATE INDEX IDX_Rev_Status ON [reviews]([status]);
CREATE INDEX IDX_Rev_Rating ON [reviews]([rating]);


------------------------------------------------------------
-- BẢNG TÀI KHOẢN ĐĂNG NHẬP XÃ HỘI (OAUTH ACCOUNTS)
-- Dành cho người dùng đăng nhập qua Google hoặc LinkedIn
------------------------------------------------------------
IF OBJECT_ID('[oauth_accounts]', 'U') IS NOT NULL DROP TABLE [oauth_accounts];

CREATE TABLE [oauth_accounts] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    [userId] UNIQUEIDENTIFIER NOT NULL,
    [provider] NVARCHAR(50) NOT NULL CHECK ([provider] IN ('google','linkedin')),
    [providerUserId] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255) NULL,
    [createdAt] DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_OAuth_User FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE,
    CONSTRAINT UQ_OAuth_Provider_UserId UNIQUE ([provider],[providerUserId])
);

CREATE INDEX IDX_OAuth_User ON [oauth_accounts]([userId]);
CREATE INDEX IDX_OAuth_Provider ON [oauth_accounts]([provider]);
