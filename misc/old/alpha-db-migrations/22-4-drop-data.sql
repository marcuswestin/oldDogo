ALTER TABLE account DROP FOREIGN KEY account_ibfk_1;
ALTER TABLE account DROP KEY image_picture_id;
ALTER TABLE account DROP COLUMN image_picture_id;
ALTER TABLE message DROP COLUMN picture_id;
ALTER TABLE message DROP COLUMN body;
DROP TABLE picture;

