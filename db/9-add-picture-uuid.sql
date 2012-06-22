ALTER TABLE picture ADD COLUMN secret CHAR(36) DEFAULT NULL;
-- Update pictures with null secret:
-- select count(id) from picture where secret IS NULL;
-- for (var i=1; i<=38; i++) { console.log("UPDATE picture SET secret='"+uuid.v4()+"' WHERE id="+i+";") }
ALTER TABLE picture MODIFY secret CHAR(36) NOT NULL;
