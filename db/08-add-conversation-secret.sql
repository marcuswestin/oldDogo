ALTER TABLE conversation ADD COLUMN secret CHAR(36) DEFAULT NULL;
-- Update conversations with null secret:
-- select count(id) from conversation where secret IS NULL;
-- for (var i=1; i<=38; i++) { console.log("UPDATE conversation SET secret='"+uuid.v4()+"' WHERE id="+i+";") }
ALTER TABLE conversation MODIFY secret CHAR(36) NOT NULL;