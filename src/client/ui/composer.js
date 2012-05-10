var trim = require('std/trim')
var placeholder = 'Say something :)'

module.exports = {
	render: function($viewUi, convo, contact, renderMessage) {
		var $ui = {}
		return function($tag) {
			$tag.append(
				div('composer',
					$ui.surface = $(div('surface')),
					div('tools',
						div('button tool write', 'Write', button(selectText)),
						div('button tool draw', 'Draw', button(selectDraw)),
						div('button tool send', 'Send', button(send))
					)
				)
			)
		}
		
		function selectText() {
			$ui.surface.empty().append(
				$ui.textInput = $(textarea({ placeholder:placeholder }, button(function() {
					$ui.textInput.focus()
				})))
			)
			
			$ui.textInput
				.on('focus', function() {
					$viewUi.conversation
						.css({ marginTop:215 })
						.scrollTop(1)
						.on('scroll', function() {
							if ($viewUi.conversation.scrollTop() == 0) {
								$viewUi.conversation.scrollTop(1)
							}
						})
				})
				.on('blur', function() {
					$viewUi.conversation
						.css({ marginTop:0 })
						.off('scroll')
				})
				
			$ui.textInput.focus()
		}
		
		function selectDraw() {
			alert('draw')
		}
		
		function send() {
			var body = trim($ui.textInput.val())
			$ui.textInput.val('')
			if (!body) { return }
			
			var message = {
				toAccountId:convo.withAccountId,
				toFacebookId:contact.facebookId,
				senderAccountId:myAccount.accountId,
				body:body
			}
			
			api.post('messages', message, function(err, res) {
				if (err) { return error(err) }
			})

			loadAccount(convo.withAccountId, function(withAccount) {
				$viewUi.messageList.prepend(renderMessage(withAccount, message))
			})
		}
	}
}
