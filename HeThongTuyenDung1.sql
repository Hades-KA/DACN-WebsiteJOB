IF OBJECT_ID('[users]', 'U') IS NOT NULL DROP TABLE [users];

CREATE TABLE [users] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,  -- UUID, với giá trị mặc định NEWID() (tương đương UUIDV4 trong Sequelize)
    [name] NVARCHAR(100) NOT NULL,  -- STRING(100), không thể NULL
    [email] NVARCHAR(255) NOT NULL UNIQUE,  -- STRING(255), không thể NULL và duy nhất
    [password] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [phone] NVARCHAR(20) NULL,  -- STRING(20), có thể NULL
    [userType] NVARCHAR(20) CHECK ([userType] IN ('candidate', 'employer', 'admin')) NOT NULL DEFAULT 'candidate',  -- ENUM, mặc định là 'candidate'
    [company] NVARCHAR(255) NULL,  -- STRING(255), có thể NULL
    [avatar] NVARCHAR(500) NULL,  -- STRING(500), có thể NULL
    [isActive] BIT DEFAULT 1,  -- BOOLEAN, mặc định là true (1)
    [isVerified] BIT DEFAULT 0,  -- BOOLEAN, mặc định là false (0)
    [lastLogin] DATETIME NULL,  -- DATE, có thể NULL
    [resetPasswordToken] NVARCHAR(255) NULL,  -- STRING(255), có thể NULL
    [resetPasswordExpires] DATETIME NULL,  -- DATE, có thể NULL
    [verificationToken] NVARCHAR(255) NULL,  -- STRING(255), có thể NULL
    --[createdAt] DATETIME DEFAULT GETDATE(),  -- Timestamps: Ngày tạo mặc định là hiện tại
    --[updatedAt] DATETIME DEFAULT GETDATE(),  -- Timestamps: Ngày cập nhật mặc định là hiện tại
    CONSTRAINT CK_UserType CHECK ([userType] IN ('candidate', 'employer', 'admin'))  -- Kiểm tra giá trị hợp lệ cho userType
);

-- Tạo chỉ mục cho các trường được sử dụng nhiều trong các truy vấn
CREATE INDEX IDX_Email ON [users] ([email]);
CREATE INDEX IDX_Phone ON [users] ([phone]);
CREATE INDEX IDX_UserType ON [users] ([userType]);
CREATE INDEX IDX_LastLogin ON [users] ([lastLogin]);

-- Cập nhật trường `updatedAt` mỗi khi có thay đổi
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


IF OBJECT_ID('[jobs]', 'U') IS NOT NULL DROP TABLE [jobs];

CREATE TABLE [jobs] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,  -- UUID, với giá trị mặc định NEWID() (tương đương UUIDV4 trong Sequelize)
    [title] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [company] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [location] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [salary] NVARCHAR(100) NULL,  -- STRING(100), có thể NULL
    [type] NVARCHAR(50) CHECK ([type] IN ('full-time', 'part-time', 'contract', 'intern')) NOT NULL DEFAULT 'full-time',  -- ENUM, mặc định là 'full-time'
    [experience] NVARCHAR(50) NULL,  -- STRING(50), có thể NULL
    [description] NVARCHAR(MAX) NOT NULL,  -- TEXT, không thể NULL
    [requirements] NVARCHAR(MAX) NOT NULL,  -- TEXT, không thể NULL
    [benefits] NVARCHAR(MAX) NULL,  -- TEXT, có thể NULL
    [category] NVARCHAR(100) NOT NULL,  -- STRING(100), không thể NULL
    [skills] NVARCHAR(MAX) NULL,  -- JSON, có thể NULL (SQL Server lưu JSON dưới dạng NVARCHAR(MAX))
    [deadline] DATETIME NULL,  -- DATE, có thể NULL
    [isActive] BIT DEFAULT 1,  -- BOOLEAN, mặc định là true (1)
    [isFeatured] BIT DEFAULT 0,  -- BOOLEAN, mặc định là false (0)
    [applicationsCount] INT DEFAULT 0,  -- INTEGER, mặc định là 0
    [viewsCount] INT DEFAULT 0,  -- INTEGER, mặc định là 0
    [employerId] UNIQUEIDENTIFIER NOT NULL,  -- UUID, khóa ngoại tới bảng [users]
    [createdAt] DATETIME DEFAULT GETDATE(),  -- Timestamps: Ngày tạo mặc định là hiện tại
    [updatedAt] DATETIME DEFAULT GETDATE(),  -- Timestamps: Ngày cập nhật mặc định là hiện tại
    CONSTRAINT FK_Employer FOREIGN KEY ([employerId]) REFERENCES [users]([id]) ON DELETE CASCADE  -- Khóa ngoại tới bảng [users]
);

-- Tạo các chỉ mục cho các trường được sử dụng nhiều trong các truy vấn
CREATE INDEX IDX_Category ON [jobs] ([category]);
CREATE INDEX IDX_Location ON [jobs] ([location]);
CREATE INDEX IDX_Type ON [jobs] ([type]);
CREATE INDEX IDX_IsActive ON [jobs] ([isActive]);
CREATE INDEX IDX_EmployerId ON [jobs] ([employerId]);

-- Tạo chỉ mục duy nhất cho các cặp [title, company] để tránh trùng lặp
CREATE UNIQUE INDEX IDX_JobTitleCompany ON [jobs] ([title], [company]);



IF OBJECT_ID('[cvs]', 'U') IS NOT NULL DROP TABLE [cvs];

CREATE TABLE [cvs] (
    [id] UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,  -- UUID, với giá trị mặc định NEWID() (tương đương UUIDV4 trong Sequelize)
    [candidateName] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [email] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [phone] NVARCHAR(20) NULL,  -- STRING(20), có thể NULL
    [position] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [experience] INT NOT NULL DEFAULT 0,  -- INTEGER, mặc định là 0
    [location] NVARCHAR(255) NULL,  -- STRING(255), có thể NULL
    [skills] NVARCHAR(MAX) NULL DEFAULT '[]',  -- JSON, lưu dưới dạng NVARCHAR(MAX) (mặc định là mảng rỗng)
    [education] NVARCHAR(MAX) NULL DEFAULT '[]',  -- JSON, lưu dưới dạng NVARCHAR(MAX) (mặc định là mảng rỗng)
    [workExperience] NVARCHAR(MAX) NULL DEFAULT '[]',  -- JSON, lưu dưới dạng NVARCHAR(MAX) (mặc định là mảng rỗng)
    [projects] NVARCHAR(MAX) NULL DEFAULT '[]',  -- JSON, lưu dưới dạng NVARCHAR(MAX) (mặc định là mảng rỗng)
    [languages] NVARCHAR(MAX) NULL DEFAULT '[]',  -- JSON, lưu dưới dạng NVARCHAR(MAX) (mặc định là mảng rỗng)
    [certifications] NVARCHAR(MAX) NULL DEFAULT '[]',  -- JSON, lưu dưới dạng NVARCHAR(MAX) (mặc định là mảng rỗng)
    [fileName] NVARCHAR(255) NOT NULL,  -- STRING(255), không thể NULL
    [filePath] NVARCHAR(500) NOT NULL,  -- STRING(500), không thể NULL
    [fileSize] INT NOT NULL,  -- INTEGER, không thể NULL
    [fileType] NVARCHAR(50) NOT NULL,  -- STRING(50), không thể NULL
    [aiScore] DECIMAL(3,1) NULL CHECK ([aiScore] BETWEEN 0 AND 10),  -- DECIMAL(3,1), có thể NULL, giới hạn trong khoảng 0 đến 10
    [aiAnalysis] NVARCHAR(MAX) NULL DEFAULT '{}',  -- JSON, lưu dưới dạng NVARCHAR(MAX) (mặc định là đối tượng rỗng)
    [isAnalyzed] BIT DEFAULT 0,  -- BOOLEAN, mặc định là false (0)
    [isActive] BIT DEFAULT 1,  -- BOOLEAN, mặc định là true (1)
    [candidateId] UNIQUEIDENTIFIER NULL,  -- UUID, có thể NULL, khóa ngoại tới bảng [users]
    [createdAt] DATETIME DEFAULT GETDATE(),  -- Timestamps: Ngày tạo mặc định là hiện tại
    [updatedAt] DATETIME DEFAULT GETDATE(),  -- Timestamps: Ngày cập nhật mặc định là hiện tại
    CONSTRAINT FK_Candidate FOREIGN KEY ([candidateId]) REFERENCES [users]([id]) ON DELETE CASCADE  -- Khóa ngoại tới bảng [users]
);

-- Tạo các chỉ mục cho các trường được sử dụng nhiều trong các truy vấn
CREATE INDEX IDX_CandidateName ON [cvs] ([candidateName]);
CREATE INDEX IDX_Position ON [cvs] ([position]);
CREATE INDEX IDX_Experience ON [cvs] ([experience]);
CREATE INDEX IDX_Location ON [cvs] ([location]);
CREATE INDEX IDX_AIScore ON [cvs] ([aiScore]);
CREATE INDEX IDX_IsAnalyzed ON [cvs] ([isAnalyzed]);
CREATE INDEX IDX_CandidateId ON [cvs] ([candidateId]);

-- Tạo chỉ mục duy nhất cho các cặp [candidateId, fileName] để tránh trùng lặp
CREATE UNIQUE INDEX IDX_CandidateFile ON [cvs] ([candidateId], [fileName]);

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

-- Tạo các chỉ mục cho các trường được sử dụng nhiều trong các truy vấn
CREATE INDEX IDX_Status ON [applications] ([status]);
CREATE INDEX IDX_JobId ON [applications] ([jobId]);
CREATE INDEX IDX_CandidateId ON [applications] ([candidateId]);
CREATE INDEX IDX_AIMatchScore ON [applications] ([aiMatchScore]);

-- Tạo chỉ mục duy nhất cho các cặp [jobId, candidateId] để tránh trùng lặp ứng viên cho mỗi công việc
CREATE UNIQUE INDEX IDX_JobCandidate ON [applications] ([jobId], [candidateId]);
