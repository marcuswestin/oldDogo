module.exports = {
	withAddressToken:withAddressToken,
	withFacebookSession:withFacebookSession
}

function registerWithAddressToken(verificationId, verificationToken, password, callback) {
	parallel(_lookupAddress, _getMatchingVerification, function(err, addrInfo, verInfo) {
		if (err) { return callback(err) }
		var addresses = [{ addressId:verInfo.addressId, addressType:verInfo.addressType }]
		return callback("TODO Create picture URL")
		createPersonWithVerifiedAddresses(verInfo.name, verInfo.color, verInfo.passwordHash, {}, addresses, pictureUrl, function(err, personRes) {
			if (err) { return callback(err) }
			db.lookup().updateOne('UPDATE addressVerification SET usedTime=? WHERE verificationId=?', [db.time(), verInfo.verificationId], function(err) {
				callback(err, personRes)
			})
		})
	})
	
	function _lookupAddress(callback) {
		lookupService.lookupEmail(email, function(err, personId, addrInfo) {
			if (err) { return callback(err) }
			if (personId) { return callback('This address has already been verified') }
			callback(null, addrInfo)
		})
	}
	function _getMatchingVerification(callback) {
		var sql = 'SELECT verificationId, addressId, addressType, passwordHash, color, name, token, createdTime, usedTime FROM addressVerification WHERE id=? AND token=?'
		db.lookup().selectOne(sql, [verificationId, verificationToken], function(err, verification) {
			if (err) { return callback(err) }
			if (verification.usedTime) { return callback('Sorry, this verification link has already been used') }
			password.checkAgainstHash(password, verification.passwordHash, function(err) {
				if (err) { return callback(err) }
				callback(null, verification)
			})
		})
	}
}

// When you register with facebook we can skip the email verification step!
function registerWithFacebook(name, color, email, password, fbSession, callback) {
	if (fbSession) { return callback('Missing facebook session') }
	
	var err = registration.checkAll({ name:name, color:color, email:email, password:password })
	if (err) { return callback(err) }
	
	parallel(_getFacebookData, curry(password.createHash, password), function(err, fbAccount, passwordHash) {
		if (err) { return callback(err) }
		if (!fbAccount || !fbAccount.id) { return callback('I could not connect to your Facebook account') }
		if (!fbAccount.email == email) {
			log.alert('Facebook register email mismatch', email, name, fbAccount)
			return callback('Hmm... That email is not right. Are you trying to trick us? Why not join forces instead, ping us at jobs@dogo.co')
		}
		var pictureUrl = 'http://graph.facebook.com/'+fbAccount.id+'/picture?type=large'
		var addresses = [{ addressType:Addresses.types.email, addressId:email }, { addressType:Addresses.types.facebook, addressId:fbAccount.id }]
		var opts = { birthdate:_getFbAccBirthdate(fbAccount.birthday), locale:fbAccount.locale, gender:fbAccount.gender, facebookId:fbAccount.id }
		createPersonWithVerifiedAddresses(name, color, passwordHash, opts, addresses, pictureUrl, callback)
	})
	
	function _getFacebookData(callback) {
		facebook.get('/me?fields=id,birthday,email', { access_token:fbSession.access_token }, callback)
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

function createPersonWithVerifiedAddresses(name, color, passwordHash, opts, addresses, pictureUrl, callback) {
	parallel(_lookupAddresses, _createPerson, function(err, addrInfos, personId) {
		if (err) { return callack(err) }
		parallel(_createPictureRedirect, _claimVerifiedAddresses, function finish(err, _, _) {
			if (err) { return callback(err) }
			getPerson(personId, callback)
		})
		
		function _createPictureRedirect(callback) {
			payloadService.makeRedirect(payloads.personPicturePath(personId), pictureUrl, callback)
		}
		function _claimVerifiedAddresses(callback) {
			claimVerifiedAddresses(addrInfos, personId, callback)
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
