var facebook = require('server/util/facebook')

facebook.get = facebook.post = function intercept(path, params, callback) {
	if (path == '/oauth/access_token') {
		var data = { 'access_token':'OFFLINE_ACCESS_TOKEN_FROM_TEST_UTILS.js' }
	} else if (path.match(/\/\d+\/accounts\/test-users/)) {
		var data = {"data":[{"id":"100003761823774","access_token":"AAADHOVHsvaEBAFafnqUrpXveg4gdWvmVY275yXqzfONDypWlFb1a3VxopJUlVxaJcJZBOooLYy2xsOyBh3Nmu5mZBjkjSj2xgYsZADfg0xzE2YFq4oF","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003761823774&n=NSAKf4ANvQpKU2W"},{"id":"100003776193741","access_token":"AAADHOVHsvaEBADStQGOBgs2QuAG07dWZBRFRL7ZAIZC4UHaZAf4MuPCMOKIDbZBlmWiEJDMYqOHNka1TGhilLVlGZCvsLS0hm9ye0ok5vCCYe0XSfXN03u","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003776193741&n=tEVxpNEOHPBzImV"},{"id":"100003790593619","access_token":"AAADHOVHsvaEBAPg70YSz79m6Du50CK7YzTuSRnRTDTigsO8sObieUB2PmdlwO6l8ZC7h4jyqZAPuZCZBvkrGWoYRebDKxgC8LsO5YuZC4bq9LZChc6v7JY","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003790593619&n=4bNeewlHqppzRqP"},{"id":"100003791163745","access_token":"AAADHOVHsvaEBAEDy2A3U6bohX2iXZBmkZChOXsJhMHt279r8vFYBEzcPKZAkyGxBwicGhDBTjFIA4pMc5a7QoC13HB0LN6fald9SZCeUTtmFaV1QQAVP","login_url":"https:\/\/www.facebook.com\/platform\/test_account_login.php?user_id=100003791163745&n=cip0Z83OUHlW4T3"}]}
	} else if (path == '/me?fields=id,birthday,email') {
		var data = {"id":"100003761823774","email":"test2@dogo.co","birthday":"11/11/1985","name":"Tom Bull","first_name":"Tom","last_name":"Bull","link":"http:\/\/www.facebook.com\/profile.php?id=100003761823774","gender":"female","timezone":0,"locale":"en_US","updated_time":"2012-04-18T05:41:31+0000"}
	} else if (path == '/me/friends?fields=id,name,birthday') {
		var data = {"data":[{"name":"John Cowp","id":"100003776193741","birthday":"11/11/1985"},{"name":"Ash Bake","id":"100003790593619","birthday":"2/2/1985"}],"paging":{"next":"https:\/\/graph.facebook.com\/100003761823774\/friends?access_token=AAADHOVHsvaEBAFafnqUrpXveg4gdWvmVY275yXqzfONDypWlFb1a3VxopJUlVxaJcJZBOooLYy2xsOyBh3Nmu5mZBjkjSj2xgYsZADfg0xzE2YFq4oF&limit=5000&offset=5000&__after_id=100003790593619"}}
	} else {
		throw new Error("Unknown facebook request path for offline test mode: "+path)
	}
	callback(null, data)
}
