var conf = require('./devConfig')

conf.push.disable = true
conf.twilio.disable = true
conf.aws.s3.disable = true
conf.aws.ses.disable = true
conf.test = { timeout: 250 }

module.exports = conf
