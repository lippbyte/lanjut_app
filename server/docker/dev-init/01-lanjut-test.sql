-- Dijalankan sekali oleh image MySQL saat volume docker-compose.dev.yml masih kosong (LANJUT_022).
-- lanjut_dev dibuat lewat MYSQL_DATABASE. Di sini: basis data tes, dan hak untuk basis data tes
-- sementara yang dibuat tes migrasi (nama diawali lanjut_test).
CREATE DATABASE IF NOT EXISTS lanjut_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `lanjut\_test%`.* TO 'lanjut'@'%';
FLUSH PRIVILEGES;
