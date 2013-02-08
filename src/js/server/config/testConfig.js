var conf = require('./devConfig')

conf.push.disable = true
conf.twilio.disable = true
conf.aws.s3.disable = true
conf.aws.ses.disable = true
conf.test = { timeout: 250 }
conf.facebook = {
	appId: '219049001532833',
	appSecret: '8916710dbc540f3d439f4f6a67a3b5e7',
	appAccessToken: '219049001532833|OyfUJ1FBjvZ3lVNjOMM3SFqm6CE'
}

module.exports = conf
