var fs = require('fs')

module.exports = {
	log:true,
	dev:false,
	port:9000,
	db: {
		host:"dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com",
		password:"dogopass9",
		database:"dogo",
		user:"dogo_rw"
	},
	s3: {
		bucket:'dogo-prod-conv',
		accessKeyId:'AKIAJDUJ4DPW4DE7552Q',
		secretAccessKey:'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'
	},
	push: {
		certData:fs.readFileSync(__dirname + '/prod/cert.pem'),
		keyData:fs.readFileSync(__dirname + '/prod/key.pem'),
		passphrase:'dogopass9'
	},
	twilio: {
		disabled: false,
		accountSid: 'AC4132bb5759ca40cfaca106e6f2052a1c',
		authToken: '52d8aefbd1cac7f644f49f0789586a3b',
		from: '+14155992671'
	}
}

// RDS
// 	id dogo-db1
// 	usr dogo_rw
// 	pw dogopass9
// 	host dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com
// 	
// 	mysql -h dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com -u dogo_rw -p
