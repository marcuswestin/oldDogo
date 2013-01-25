module.exports = {
	render:render,
	update:update
}

var mdot = { __tagHTML:'&middot;' }

function render() {
	var top = 10
	return div('appBackground', style({ marginTop:top, height:viewport.height()-top }),
		div('card',
			div('person',
				face.mine({ size:75 })
			),
			div('summary',
				div('name', function() {
					var names = gState.me().name.split(' ')
					return [div('first', names.shift()), div('rest', names.pop())]
				}),
				div('clear')
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
			'I will think of something to put here'
		),
		gIsDev && renderDevTools(),
		div(
			style({ width:'100%', position:'absolute', bottom:10, left:0, textAlign:'center', fontSize:12, color:'#ddd' }),
			a('link', { href:'/terms', target:'_blank' }, 'Terms of Service'),
			span('mdot', mdot, style({ fontSize:18, position:'relative', top:3, padding:'0 3px' })),
			a('link', { href:'/privacy', target:'_blank' }, 'Privacy Policy'),
			br(), span(style({ textShadow:'0 1px 0 rgba(255, 255, 255, .3)' }), 'Made with love by Marcus Westin')
		)
	)
}

function renderDevTools() {
	var styles = style({ margin:2, padding:px(6,8), fontSize:16 })
	return div('devTools', style({ textAlign:'center', margin:px(10,0,0,0) }),
		div('button', 'Reset', styles, button(function() {
			bridge.command('state.clear', function() {
				bridge.command('app.restart')
			})
		})),
		div('button', 'Reload', styles, button(function() {
			bridge.command('app.restart')
		})),
		div('button', 'Upgrade App', styles, button(function() {
			gState.checkNewVersion()
		}))
	)
}