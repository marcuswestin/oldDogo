var questions = require('../src/client/ui/questions')
var assert = require('assert')

describe('yes/no questions', function() {
	
	function test(text, shouldMatch) {
		it('should ' + (shouldMatch ? '' : 'not ') + 'match "'+text+'"', function(done) {
			assert.equal(shouldMatch, questions.hasYesNoQuestion(text))
			done()
		})
	}
	
	test('hi', false)
	test('how are you?', false)
	test('when will you come over?', false)
	test('how r u', false)
	test('can you try this?', true)
	test('r u', true)
	test('can you', true)
	test('do you like him?', true)
	test('Do yoU lIke hiM', true)
})