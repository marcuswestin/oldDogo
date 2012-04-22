proto = require('std/proto')
create = require('std/create')
each = require('std/each')
map = require('std/map')
bind = require('std/bind')
slice = require('std/slice')

ListPromise = require('std/ListPromise')
txCallback = require('./txCallback')

getId = function(model) {
	return typeof model == 'number' ? model : model.id
}
