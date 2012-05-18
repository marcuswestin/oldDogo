test:
	./node_modules/mocha/bin/mocha --bail --reporter list

setup-server: setup
	cd node_modules/uuid && npm install --production .
	cd node_modules/mocha && npm install --production .
	cd node_modules/mysql && npm install --production .
	cd node_modules/request && npm install --production .
	cd node_modules/require && npm install --production .
	cd node_modules/optimist && npm install --production .
	cd node_modules/aws2js && npm install --production .
	cd node_modules/knox && npm install --production .
	cd node_modules/express && npm install --production .

setup-client: setup
	cd dependencies/blowtorch && make setup
	cd dependencies/facebook-ios-sdk && scripts/build_facebook_ios_sdk_static_lib.sh

setup-dev: setup
	cd node_modules/watch && npm install .
	cd node_modules/socket.io && npm install .

setup:
	git submodule init
	git submodule sync
	git submodule update
	mkdir -p node_modules

run:
	node src/server/run.js --config=dev

run-prod:
	node src/server/run.js --config=prod

client:
	node scripts/build-client.js

clean:
	rm -rf build

session:
	node scripts/create-session.js 1

.PHONY: test
