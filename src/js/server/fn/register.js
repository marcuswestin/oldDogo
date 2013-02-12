var claimVerifiedAddresses = require('server/fn/claimVerifiedAddresses')
var checkPasswordAgainstHash = require('server/fn/checkPasswordAgainstHash')
var createPasswordHash = require('server/fn/createPasswordHash')
var getPerson = require('server/fn/getPerson')
var getClientConfig = require('server/fn/getClientConfig')
var registration = require('data/registration')
var facebook = require('server/util/facebook')

module.exports = {
	withAddressVerification:withAddressVerification,
	withFacebookSession:withFacebookSession
}

function withAddressVerification(verificationId, verificationToken, password, callback) {
	_getMatchingVerification(function(err, verInfo) {
		if (err) { return callback(err) }
		var addresses = [{ addressId:verInfo.addressId, addressType:verInfo.addressType }]
		var pictureUrl = payloads.underlyingPersonPictureUrl(verInfo.pictureSecret)
		var opts = {}
		_createPersonWithVerifiedAddresses(verInfo.name, verInfo.color, verInfo.passwordHash, pictureUrl, addresses, opts, function(err, person) {
			if (err) { return callback(err) }
			db.lookup().updateOne('UPDATE addressVerification SET usedTime=? WHERE verificationId=?', [db.time(), verInfo.verificationId], function(err) {
				callback(err, { person:person, config:getClientConfig() })
			})
		})
	})
	
	function _getMatchingVerification(callback) {
		lookupService.getAddressVerification(verificationId, verificationToken, function(err, verification) {
			if (err) { return callback(err) }
			checkPasswordAgainstHash(password, verification.passwordHash, function(err) {
				if (err) { return callback(err) }
				callback(null, verification)
			})
		})
	}
}

// When you register with facebook we can skip the email verification step!
function withFacebookSession(name, color, address, password, fbSession, pictureSecret, callback) {
	if (!fbSession) { return callback('Missing facebook session') }
	
	if (!Addresses.isEmail(address)) { return callback('Expected an email address') }
	
	var err = registration.checkAll({ name:name, color:color, address:address, password:password })
	if (err) { return callback(err) }
	
	parallel(_getFacebookData, curry(createPasswordHash, password), function(err, fbAccount, passwordHash) {
		if (err) { return callback(err) }
		if (!fbAccount || !fbAccount.id) { return callback('I could not connect to your Facebook account') }
		if (fbAccount.email != address.addressId) {
			log.alert('Facebook register email mismatch', address, name, fbAccount)
			return callback('Hmm... That email is not right. Are you trying to trick us? Why not join forces instead, ping us at jobs@dogo.co')
		}
		var pictureUrl = pictureSecret ? payloads.underlyingPersonPictureUrl(pictureSecret) : 'http://graph.facebook.com/'+fbAccount.id+'/picture?type=large'
		var addresses = [address, Addresses.facebook(fbAccount.id)]
		var opts = { birthdate:_getFbAccBirthdate(fbAccount.birthday), locale:fbAccount.locale, gender:fbAccount.gender, facebookId:fbAccount.id }
		_createPersonWithVerifiedAddresses(name, color, passwordHash, pictureUrl, addresses, opts, callback)
	})
	
	function _getFacebookData(callback) {
		log.debug('_getFacebookData')
		facebook.get('/me?fields=id,birthday,email', { access_token:fbSession.accessToken }, function(err, res) {
			log.debug('_getFacebookData done')
			callback(err, res)
		})
	}
	
	function _getFbAccBirthdate(birthday) {
		 // "11/23/1985" -> "1985-11-23"
		// "06/17" -> "0000/06/17"
		// "32" -> null
		// "", null, undefined -> null
		if (!birthday) { return null }
		var parts = birthday.split('/')
		if (parts.length == 1) { return null }
		if (parts.length == 2) { parts.push('0000') }
		return parts[2]+'-'+parts[0]+'-'+parts[1]
	}
}

function _createPersonWithVerifiedAddresses(name, color, passwordHash, pictureUrl, addresses, opts, callback) {
	log.debug('create person with verified addresses', name, color, passwordHash, pictureUrl, addresses, opts)
	parallel(_lookupAddresses, _createPerson, function(err, addrInfos, personId) {
		if (err) { return callback(err) }
		parallel(_createPictureRedirect, _claimVerifiedAddresses, _getPerson, function(err, _, _, person) {
			log.debug('done creating person with verified addresses', err, person)
			callback(err, person)
		})
		function _getPerson(callback) {
			getPerson(personId, callback)
		}
		function _createPictureRedirect(callback) {
			payloadService.makeRedirect(payloads.personPicturePath(personId), pictureUrl, callback)
		}
		function _claimVerifiedAddresses(callback) {
			claimVerifiedAddresses(addrInfos, personId, name, callback)
		}
	})
	function _createPerson(callback) {
		var emailAddressesJson = JSON.stringify(filter(addresses, Addresses.isEmail))
		var phoneNumbersJson = JSON.stringify(filter(addresses, Addresses.isPhone))
		db.people.randomShard().insert(
			'INSERT INTO person SET joinedTime=?, name=?, color=?, passwordHash=?, birthdate=?, locale=?, gender=?, facebookId=?, emailAddressesJson=?, phoneNumbersJson=?',
			[db.time(), name, color, passwordHash, opts.birthdate, opts.locale, opts.gender, opts.facebookId, emailAddressesJson, phoneNumbersJson],
			callback
		)
	}
	function _lookupAddresses(callback) {
		asyncMap(addresses, {
			parallel:addresses.length,
			finish:callback,
			iterate:function(address, next) {
				lookupService.lookup(address, function(err, personId, addrInfo) {
					if (err) { return next(err) }
					if (personId) { return next(address.addressId+' is already in use by another person.') }
					if (addrInfo) { return next(null, addrInfo) }
					address.isNewAddress = true
					next(null, address)
				})
			}
		})
	}
}
