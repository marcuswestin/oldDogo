test:
	./node_modules/mocha/bin/mocha --bail --reporter list

setup-server: setup
	cd node_modules/uuid && npm install .
	cd node_modules/mocha && npm install .
	cd node_modules/mysql && npm install .
	cd node_modules/imap && npm install .
	cd node_modules/validator && npm install .
	cd node_modules/request && npm install .
	npm install express@2.5.8

setup-client: setup
	cd node_modules/fun && make setup
	cd dependencies/blowtorch && make setup
	cd dependencies/facebook-ios-sdk && scripts/build_facebook_ios_sdk_static_lib.sh

setup:
	git submodule init
	git submodule sync
	git submodule update
	cd node_modules && ln -snf fun/node_modules/std std
	cd node_modules && ln -snf fun/node_modules/optimist optimist

run-dev:
	node src/server/run.js --dev --log=true --port=9090 --dbPassword=dogo

run-instapop:
	node_modules/fun/bin/fun instapop/instapop.fun

client:
	bash scripts/build-client.sh

clean:
	rm -rf build

session:
	node scripts/create-session.js 1

.PHONY: test .setup run-dev build-client build-server run-instapop clean session
