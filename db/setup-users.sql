CREATE USER dogo_tester@localhost IDENTIFIED BY 'test';
GRANT ALL ON dogo_test.* TO dogo_tester@localhost;

CREATE USER dogo_rw@localhost IDENTIFIED BY 'dogo';
GRANT ALL ON dogo.* TO 'dogo_rw'@'localhost';
