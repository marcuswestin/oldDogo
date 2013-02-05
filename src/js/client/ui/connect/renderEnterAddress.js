var trim = require('std/trim')
var overlay = require('tags/overlay')

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
	
	setTimeout(function() { $('#addressInput').val(view.addressType == 'email' ? 'narcvs@gmail.com' : '4156015654') }, 50)
	
	return [
		div(
			button({ start:function() { $('#addressInput').focus() } }),
			label('label', "What's your ", info.label, '?'),
			div(input({ name:'addressInput', id:'addressInput', type:info.inputType })),
			div('error', { id:'addressError' }, style({ display:'none' }))
		),
		
		div('button', 'Go', button(function() {
			var address = trim($('#addressInput').val())
			if (!address) {
				return $('#addressError').text('Enter your '+info.label).show()
			}
			
			if (!Addresses.verifyFormat(view.addressType, address)) {
				return $('#addressError').text('Please check your input').show()
			}
			
			$('#addressError').hide()
			$('#addressInput').blur()
			
			var padding = 5
			var height = viewport.height() - padding*2 - 20
			var duration = 300
			overlay({
				element:$('#viewport'),
				dismissable:false,
				width:viewport.width() - padding*2,
				height:height,
				translate:[0, 10],
				duration:duration,
				content:function() {
					api.post('api/address', { addressType:view.addressType, address:address }, function(err, res) {
						overlay.hide({
							duration:duration,
							finish:function() {
								if (err) { return error(err) }
								gScroller.push({
									step:'enterPersonInfo',
									addressType:view.addressType,
									address:address,
									lookupInfo:res.lookupInfo
								})
							}
						})
					})
					return div(
						style({ background:'rgba(50,50,50,.5)', height:'100%', borderRadius:5, color:'#fff' }),
						div(style(translate.y(height / 2 - 40), { textAlign:'center', padding:10 }),
							'Loading...'
						)
					)
				}
			})
		}))
	]
}
