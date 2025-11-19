// server/src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

/*
ENV:
- DB_HOST (default: localhost)
- DB_PORT (default: 1433)       → dùng khi default instance
- DB_INSTANCE                   → dùng khi named instance (vd: SQLEXPRESS). Khi set cái này thì bỏ DB_PORT
- DB_NAME  (default: HeThongTuyenDungDB)
- DB_USER  (default: sa)
- DB_PASSWORD (default: 12345@Aa)
- DB_DIALECT (default: mssql)
- DB_ENCRYPT (default: false)
- DB_TRUST_CERT (default: true)
- DB_LOGGING (default: false)
*/

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '1433', 10);
const DB_INSTANCE = process.env.DB_INSTANCE || ''; // ví dụ: SQLEXPRESS
const DB_NAME = process.env.DB_NAME || 'HeThongTuyenDungDB';
const DB_USER = process.env.DB_USER || 'sa';
const DB_PASS = process.env.DB_PASSWORD || '12345@Aa';
const DB_DIALECT = process.env.DB_DIALECT || 'mssql';
const DB_ENCRYPT = String(process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true';
const DB_TRUST_CERT = String(process.env.DB_TRUST_CERT || 'true').toLowerCase() === 'true';
const DB_LOGGING = String(process.env.DB_LOGGING || 'false').toLowerCase() === 'true';

const dialectOptions = {
  options: { encrypt: DB_ENCRYPT, trustServerCertificate: DB_TRUST_CERT }
};
if (DB_INSTANCE) {
  dialectOptions.instanceName = DB_INSTANCE;
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: DB_DIALECT,
  logging: DB_LOGGING ? console.log : false,
  port: DB_INSTANCE ? undefined : DB_PORT,
  dialectOptions,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối cơ sở dữ liệu thành công.');
  } catch (error) {
    console.error('❌ Không thể kết nối cơ sở dữ liệu:', error.message);
    process.exit(1);
  }
}

async function printConnectedInfo() {
  try {
    const [meta] = await sequelize.query(`
      SELECT 
        DB_NAME() AS db, 
        @@SERVERNAME AS server, 
        SERVERPROPERTY('InstanceName') AS instance
    `);
    console.log(`🔗 Connected => db: ${meta[0]?.db}, server: ${meta[0]?.server}, instance: ${meta[0]?.instance || '(default)'}`);
  } catch (e) {
    console.log('ℹ️ Cannot fetch connected info:', e?.message);
  }
}

async function initDatabase() {
  await testConnection();
  await printConnectedInfo();
  console.log('📊 Cơ sở dữ liệu đã sẵn sàng.');
}

module.exports = {
  sequelize,
  initDatabase,
  testConnection,
};