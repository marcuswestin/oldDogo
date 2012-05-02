ALTER TABLE account ADD push_token VARCHAR(255) DEFAULT NULL AFTER gender;
ALTER TABLE account ADD push_system ENUM('ios','android') DEFAULT NULL AFTER push_token;
