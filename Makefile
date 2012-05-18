test:
	./node_modules/mocha/bin/mocha --bail --reporter list

setup-server: setup
	cd node_modules/uuid && npm install --production .
	cd node_modules/mocha && npm install --production .
	cd node_modules/mysql && npm install --production .
	cd node_modules/request && npm install --production .
	cd node_modules/optimist && npm install --production .
	cd node_modules/aws2js && npm install --production .
	cd node_modules/knox && npm install --production .
	cd node_modules/express && npm install --production .

setup-dev: setup
	cd node_modules/require && npm install --production .
	cd dependencies/blowtorch && make setup
	cd dependencies/facebook-ios-sdk && scripts/build_facebook_ios_sdk_static_lib.sh
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

deploy-latest-dogo-web:
	git push origin master
	GIT_REV=`git rev-parse --verify HEAD`
	fab deploy_dogo_web:${GIT_REV} -H dogo-web1

.PHONY: test
