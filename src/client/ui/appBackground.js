module.exports = {
	render:render,
	update:update
}

var mdot = function() { return $('<span> &middot; </span>') }

function render() {
	var top = 10
	return div('appBackground', style({ marginTop:top, height:viewport.height()-top }),
		div('card',
			div('face', style(face.backgroundStyle(gState.myAccount().facebookId, 75))),
			div('summary',
				div('name', gState.myAccount().name),
				div('lastMessage', div(style({ fontStyle:'italic' }), 'This is you'))
			)
		),
		div('backgroundContent')
	)
}

function update(width) {
	$('.appBackground').css({ width:width })
	$('.appBackground .backgroundContent').empty().append(
		div(
			style({ textAlign:'center', fontStyle:'italic', color:'#ccc', textShadow:'0 1px 0 #666', marginTop:140 }),
			'Your Memories will show up here'
		),
		gAppInfo.config.mode == 'dev' && renderDevTools(),
		div(
			style({ width:'100%', position:'absolute', bottom:10, left:0, textAlign:'center', fontSize:12, color:'#ddd' }),
			a('link', { href:'/terms', target:'_blank' }, 'Terms of Service'),
			mdot().css({ fontSize:18, position:'relative', top:3 }),
			a('link', { href:'/privacy', target:'_blank' }, 'Privacy Policy'),
			br(), span(style({ textShadow:'0 1px 0 rgba(255, 255, 255, .3)' }), 'Made with love by Marcus Westin')
		)
	)
}

function renderDevTools() {
	var margined = style({ margin:2 })
	return div('devTools', style({ textAlign:'center', margin:px(10,0,0,0) }),
		div('button', 'Reset', margined, button(function() {
			gState.clear()
			bridge.command('app.restart')
		})),
		div('button', 'Reload', margined, button(function() {
			bridge.command('app.restart')
		})),
		div('button', 'Upgrade App', margined, button(function() {
			gState.checkNewVersion()
		}))
	)
}