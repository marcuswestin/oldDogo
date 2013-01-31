var addressInfos = {
	'email': {
		inputType:'email',
		label:'Email Address'
	},
	'phone': {
		inputType:'tel',
		label:'Phone Number'
	}
}

module.exports = function renderEnterAddress(view) {
	var info = addressInfos[view.addressType]
	return [
		
		div(
			button({ start:function() { $('#addressInput').focus() } }),
			label('label', "What's your ", info.label, '?'),
			div(input({ name:'addressInput', id:'addressInput', type:info.inputType }))
		),
		
		div('button', 'Go', button({
			start: function($e) {
				var address = $('#addressInput').val()
				if (!address) { return $e.preventDefault() }
			},
			tap:function() {
				alert('here')
			}
		}))
	]
}
