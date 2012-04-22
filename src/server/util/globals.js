proto = require('fun/node_modules/std/proto')
create = require('fun/node_modules/std/create')
each = require('fun/node_modules/std/each')
map = require('fun/node_modules/std/map')
bind = require('fun/node_modules/std/bind')
slice = require('fun/node_modules/std/slice')

ListPromise = require('fun/node_modules/std/ListPromise')
txCallback = require('./txCallback')

getId = function(model) {
	return typeof model == 'number' ? model : model.id
}
