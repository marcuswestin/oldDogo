.PHONY: tests
tests:
	# Running tests
	rm -f test/._*
	./node_modules/mocha/bin/mocha --bail --reporter list

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
	cd dependencies/facebook-ios-sdk && scripts/build_facebook_ios_sdk_static_lib.sh

run-dev:
	node scripts/run-server --dev --log=false --port=9090 --dbPassword=dogo
	# node_modules/fun/bin/fun src/client/dogo.fun --port=9090

run-instapop:
	node_modules/fun/bin/fun instapop/instapop.fun
