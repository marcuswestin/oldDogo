module.exports = function() {
	return {
		payloads: { bucket:gConfig.aws.s3.bucket, region:gConfig.aws.s3.region }
	}
}