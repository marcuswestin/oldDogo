ALTER TABLE conversation ADD COLUMN bucket_created_time INT UNSIGNED DEFAULT NULL;
ALTER TABLE picture ADD COLUMN uploaded_time INT UNSIGNED;
