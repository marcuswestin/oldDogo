ALTER TABLE account ADD COLUMN first_name VARCHAR(127) DEFAULT NULL;
ALTER TABLE account ADD COLUMN last_name VARCHAR(127) DEFAULT NULL;
# Update everyone's first_name/last_name from full_name
ALTER TABLE account MODIFY first_name VARCHAR(127) NOT NULL;
ALTER TABLE account MODIFY last_name VARCHAR(127) NOT NULL;
