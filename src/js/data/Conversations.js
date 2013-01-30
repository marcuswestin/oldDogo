var makeEncoder = require('data/makeEncoder')

var summaryEncoder = makeEncoder({
	'people':['p', {
		'name':'n',
		'personId':'d',
		'facebookId':'f'
	}],
	'recent':['m', {
		'fromPersonId':'i',
		'sentTime':'s',
		'type':'t',
		'payload':'p'
	}],
	'pictures':['P', {
		'fromPersonId':'i',
		'sentTime':'s',
		'type':'t',
		'payload':'p'
	}]
})

module.exports = {
	summary: summaryEncoder
}
