var fs = require('fs')

module.exports = {
	log:true,
	dev:false,
	port:9000,
	dbHost:"dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com",
	dbPassword:"dogopass9",
	push: {
		certData:fs.readFileSync(__dirname + '/prod/cert.pem'),
		keyData:fs.readFileSync(__dirname + '/prod/key.pem'),
		passphrase:'dogopass9'
	}
}

// RDS
// 	id dogo-db1
// 	usr dogo_rw
// 	pw dogopass9
// 	host dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com
// 	
// 	mysql -h dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com -u dogo_rw -p
