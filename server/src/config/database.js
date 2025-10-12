const { Sequelize } = require('sequelize');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'HeThongTuyenDungDB',
  username: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '12345@Aa',
  dialect: process.env.DB_DIALECT || 'mssql',
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    }
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    dialectOptions: config.dialectOptions,
    pool: config.pool,
    logging: config.logging
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối cơ sở dữ liệu thành công.');
  } catch (error) {
    console.error('❌ Không thể kết nối cơ sở dữ liệu:', error.message);
    process.exit(1);
  }
};

const initDatabase = async () => {
  try {
    await testConnection();

    if (process.env.NODE_ENV === 'development') {
      // await sequelize.sync({ alter: true });
      console.log('📊 Cơ sở dữ liệu đã đồng bộ thành công.');
    }
  } catch (error) {
    console.error('❌ Lỗi khi khởi tạo cơ sở dữ liệu:', error.message);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection,
  initDatabase
};
