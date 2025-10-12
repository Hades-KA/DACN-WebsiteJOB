-- Tạo database cho hệ thống tuyển dụng
CREATE DATABASE HeThongTuyenDungDB;
GO

-- Sử dụng database
USE HeThongTuyenDungDB;
GO

-- Tạo bảng Người dùng
CREATE TABLE nguoi_dung (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ho_ten NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    mat_khau NVARCHAR(255) NOT NULL,
    so_dien_thoai NVARCHAR(20),
    loai_nguoi_dung NVARCHAR(20) NOT NULL DEFAULT 'ung_vien' CHECK (loai_nguoi_dung IN ('ung_vien', 'nha_tuyen_dung', 'admin')),
    ten_cong_ty NVARCHAR(255),
    avatar NVARCHAR(500),
    trang_thai BIT NOT NULL DEFAULT 1,
    da_xac_thuc BIT NOT NULL DEFAULT 0,
    lan_dang_nhap_cuoi DATETIME,
    token_reset_mat_khau NVARCHAR(255),
    token_reset_het_han DATETIME,
    token_xac_thuc NVARCHAR(255),
    ngay_tao DATETIME NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CHK_Email CHECK (email LIKE '%@%.%' AND email NOT LIKE '% %')
);
GO

-- Tạo bảng Việc làm
CREATE TABLE viec_lam (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tieu_de NVARCHAR(255) NOT NULL,
    cong_ty NVARCHAR(255) NOT NULL,
    dia_diem NVARCHAR(255) NOT NULL,
    muc_luong DECIMAL(10,2),
    loai_hinh NVARCHAR(20) NOT NULL DEFAULT 'toan_thoi_gian' CHECK (loai_hinh IN ('toan_thoi_gian', 'ban_thoi_gian', 'hop_dong', 'thuc_tap')),
    kinh_nghiem NVARCHAR(50),
    mo_ta NVARCHAR(MAX) NOT NULL,
    yeu_cau NVARCHAR(MAX) NOT NULL,
    quyen_loi NVARCHAR(MAX),
    linh_vuc NVARCHAR(100) NOT NULL,
    ky_nang NVARCHAR(MAX) CHECK (ISJSON(ky_nang) = 1),
    han_nop DATETIME CHECK (han_nop > GETDATE()),
    trang_thai BIT NOT NULL DEFAULT 1,
    noi_bat BIT NOT NULL DEFAULT 0,
    so_luong_ung_tuyen INT NOT NULL DEFAULT 0,
    so_luong_xem INT NOT NULL DEFAULT 0,
    id_nha_tuyen_dung UNIQUEIDENTIFIER NOT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (id_nha_tuyen_dung) REFERENCES nguoi_dung(id)
);
GO

-- Tạo bảng CV
CREATE TABLE cv (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_ung_vien NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    so_dien_thoai NVARCHAR(20),
    vi_tri NVARCHAR(255) NOT NULL,
    kinh_nghiem INT NOT NULL DEFAULT 0,
    dia_diem NVARCHAR(255),
    ky_nang NVARCHAR(MAX) CHECK (ISJSON(ky_nang) = 1),
    hoc_van NVARCHAR(MAX) CHECK (ISJSON(hoc_van) = 1),
    kinh_nghiem_lam_viec NVARCHAR(MAX) CHECK (ISJSON(kinh_nghiem_lam_viec) = 1),
    du_an NVARCHAR(MAX) CHECK (ISJSON(du_an) = 1),
    ngoai_ngu NVARCHAR(MAX) CHECK (ISJSON(ngoai_ngu) = 1),
    chung_chi NVARCHAR(MAX) CHECK (ISJSON(chung_chi) = 1),
    ten_file NVARCHAR(255) NOT NULL,
    duong_dan_file NVARCHAR(500) NOT NULL,
    kich_thuoc_file INT NOT NULL,
    loai_file NVARCHAR(50) NOT NULL,
    diem_ai DECIMAL(3,1),
    phan_tich_ai NVARCHAR(MAX) CHECK (ISJSON(phan_tich_ai) = 1),
    da_phan_tich BIT NOT NULL DEFAULT 0,
    trang_thai BIT NOT NULL DEFAULT 1,
    id_ung_vien UNIQUEIDENTIFIER NOT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (id_ung_vien) REFERENCES nguoi_dung(id)
);
GO

-- Tạo bảng Đơn ứng tuyển
CREATE TABLE don_ung_tuyen (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    trang_thai NVARCHAR(20) NOT NULL DEFAULT 'cho_duyet' CHECK (trang_thai IN ('cho_duyet', 'dang_xem', 'duoc_chon', 'da_phong_van', 'duoc_nhan', 'bi_tu_choi')),
    thu_xin_viec NVARCHAR(MAX),
    muc_luong_mong_muon DECIMAL(10,2),
    co_the_bat_dau DATETIME,
    ghi_chu NVARCHAR(MAX),
    diem_phu_hop_ai DECIMAL(3,1),
    phan_tich_ai NVARCHAR(MAX) CHECK (ISJSON(phan_tich_ai) = 1),
    da_phan_tich BIT NOT NULL DEFAULT 0,
    id_viec_lam UNIQUEIDENTIFIER NOT NULL,
    id_ung_vien UNIQUEIDENTIFIER NOT NULL,
    id_cv UNIQUEIDENTIFIER,
    ngay_tao DATETIME NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (id_viec_lam) REFERENCES viec_lam(id),
    FOREIGN KEY (id_ung_vien) REFERENCES nguoi_dung(id),
    FOREIGN KEY (id_cv) REFERENCES cv(id),
    CONSTRAINT UC_DonUngTuyen UNIQUE (id_viec_lam, id_ung_vien)
);
GO

-- Tạo bảng Thông báo
CREATE TABLE thong_bao (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tieu_de NVARCHAR(255) NOT NULL,
    noi_dung NVARCHAR(MAX) NOT NULL,
    loai NVARCHAR(50) NOT NULL CHECK (loai IN ('ung_tuyen', 'tuyen_dung', 'he_thong')),
    trang_thai NVARCHAR(20) NOT NULL DEFAULT 'chua_doc' CHECK (trang_thai IN ('chua_doc', 'da_doc')),
    id_nguoi_dung UNIQUEIDENTIFIER NOT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (id_nguoi_dung) REFERENCES nguoi_dung(id)
);
GO

-- Tạo bảng Công ty
CREATE TABLE cong_ty (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ten_cong_ty NVARCHAR(255) NOT NULL,
    mo_ta NVARCHAR(MAX),
    dia_chi NVARCHAR(500),
    website NVARCHAR(255),
    so_dien_thoai NVARCHAR(20),
    email NVARCHAR(255),
    logo NVARCHAR(500),
    quy_mo NVARCHAR(50) CHECK (quy_mo IN ('1-10', '11-50', '51-200', '201-500', '500+')),
    linh_vuc NVARCHAR(100),
    trang_thai BIT NOT NULL DEFAULT 1,
    id_nguoi_dung UNIQUEIDENTIFIER NOT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT GETDATE(),
    ngay_cap_nhat DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (id_nguoi_dung) REFERENCES nguoi_dung(id)
);
GO

-- Tạo indexes để tối ưu hiệu suất
CREATE INDEX idx_nguoi_dung_email ON nguoi_dung(email);
CREATE INDEX idx_nguoi_dung_loai ON nguoi_dung(loai_nguoi_dung);
CREATE INDEX idx_viec_lam_trang_thai ON viec_lam(trang_thai);
CREATE INDEX idx_viec_lam_linh_vuc ON viec_lam(linh_vuc);
CREATE INDEX idx_viec_lam_dia_diem ON viec_lam(dia_diem);
CREATE INDEX idx_cv_diem_ai ON cv(diem_ai);
CREATE INDEX idx_don_ung_tuyen_trang_thai ON don_ung_tuyen(trang_thai);
CREATE INDEX idx_thong_bao_nguoi_dung ON thong_bao(id_nguoi_dung);

-- Thêm dữ liệu mẫu
INSERT INTO nguoi_dung (ho_ten, email, mat_khau, loai_nguoi_dung, trang_thai, da_xac_thuc) 
VALUES 
('Admin Hệ thống', 'admin@jobhire.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', 'admin', 1, 1),
('Nguyễn Văn A', 'nguyenvana@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', 'ung_vien', 1, 1),
('Công ty ABC', 'hr@abc.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', 'nha_tuyen_dung', 1, 1);
