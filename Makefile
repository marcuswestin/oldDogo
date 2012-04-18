setup:
	git submodule init
	git submodule sync
	git submodule update
	cd node_modules/fun && make setup
	cd dependencies/blowtorch && make setup
	cd node_modules/uuid && npm install .
	cd node_modules/mocha && npm install .
	cd node_modules/mysql && npm install .
	cd node_modules/imap && npm install .
	cd node_modules/validator && npm install .
	cd node_modules/request && npm install .
	npm install express@2.5.8
