NODE = /usr/local/bin/node

test: test-setup test-usage

test-setup:
	make reset-test-db;
	./node_modules/mocha/bin/mocha --reporter list --bail test/1_test-utils.js test/2_account-setup/test-api.js

test-usage: /usr/local/bin/phantomjs
	./node_modules/mocha/bin/mocha --reporter list --bail test/3_device-usage/test-api.js
	/usr/local/bin/phantomjs test/3_device-usage/test-phantom-client.js

/usr/local/bin/phantomjs:
	echo "\n\n*** Installing phantomjs to /usr/local/bin/phantomjs\n****************************************************\n\n"
	rm -rf /tmp/phantomjs-1.6.1-macosx-static*
	curl http://phantomjs.googlecode.com/files/phantomjs-1.6.1-macosx-static.zip > /tmp/phantomjs-1.6.1-macosx-static.zip
	cd /tmp && unzip /tmp/phantomjs-1.6.1-macosx-static.zip
	cp /tmp/phantomjs-1.6.1-macosx-static/bin/phantomjs /usr/local/bin/

reset-db:
	mysql -u dogo_rw --password=dogo -e 'DROP DATABASE IF EXISTS dogo; CREATE DATABASE dogo;'
	cat db/schema.sql | mysql -u dogo_rw --password=dogo dogo

reset-test-db:
	mysql -u dogo_tester --password=test -e 'DROP DATABASE IF EXISTS dogo_test; CREATE DATABASE dogo_test;'
	cat db/schema.sql | mysql -u dogo_tester --password=test dogo_test
	if [ -f test/.fbTestDataCache.json ]; then mv test/.fbTestDataCache.json test/.fbTestDataCache.json.bak; fi

setup-dev: setup-server
	cd node_modules/require && npm install --production .
	cd dependencies/blowtorch && make setup
	cd dependencies/facebook-ios-sdk && scripts/build_facebook_ios_sdk_static_lib.sh
	cd node_modules/socket.io && npm install . --production
	cd node_modules/stylus && npm install . --production
	cd node_modules/mocha && npm install --production .

setup-server: setup
	bash src/scripts/npm-install-modules.sh

setup:
	echo "node_modules" > ~/.__npm_installed__gitignore
	echo ".__npm_installed__" >> ~/.__npm_installed__gitignore
	git config --global core.excludesfile ~/.__npm_installed__gitignore
	git submodule init
	git submodule sync
	git submodule update
	mkdir -p node_modules

run:
	${NODE} src/server/run.js --config=dev

run-all:
	make run-redis &
	make run-mysql-dev &

run-prod:
	${NODE} src/server/run.js --config=prod

run-redis:
	redis-server ./src/server/config/redis.conf

run-mysql-dev:
	mysqld_safe

client:
	${NODE} src/scripts/build-client.js

fly-build: client
	rm -rf src/client/ios/build
	xcodebuild -project src/client/ios/dogo.xcodeproj -sdk iphoneos GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	# xcodebuild -project src/client/ios/dogo.xcodeproj -sdk iphonesimulator5.1 GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	/usr/bin/xcrun -sdk iphoneos PackageApplication src/client/ios/build/Release-iphoneos/dogo.app -o ~/Desktop/dogo.ipa
	${NODE} src/scripts/save-ipa.js

check-git-dirty:
	if ! git diff-index --quiet HEAD --; then echo "DIRTY GIT REPO TREE"; exit -1; fi

fly-dev: fly-build
	curl http://testflightapp.com/api/builds.json \
	-F file=@/Users/marcus/Desktop/dogo.ipa \
	-F api_token='fa8a4a8d04599e74e456e4968117ad25_NDE5NDk0MjAxMi0wNC0yOSAyMzoxNTo0MC4zMzk0Njk' \
	-F team_token='ac1087f484666207583bb7c62daf1fa2_ODU2NTUyMDEyLTA0LTI5IDIzOjQ1OjIwLjQ2Nzg2Ng' \
	-F notes='fly-dev build' \
	-F notify=True \
	-F distribution_lists='dev'

fly-alpha: fly-build bump-ios-patch
	echo "Enter alpha release notes:\n"; read commitMessage; echo "\nOK! Uploading..."; curl http://testflightapp.com/api/builds.json \
	-F file=@/Users/marcus/Desktop/dogo.ipa \
	-F api_token='fa8a4a8d04599e74e456e4968117ad25_NDE5NDk0MjAxMi0wNC0yOSAyMzoxNTo0MC4zMzk0Njk' \
	-F team_token='ac1087f484666207583bb7c62daf1fa2_ODU2NTUyMDEyLTA0LTI5IDIzOjQ1OjIwLjQ2Nzg2Ng' \
	-F notes="$$commitMessage" \
	-F notify=True \
	-F distribution_lists='alpha'

fly-all: fly-build bump-ios-minor
	echo "Enter release notes:\n"; read commitMessage; echo "\nOK! Uploading..."; curl http://testflightapp.com/api/builds.json \
	-F file=@/Users/marcus/Desktop/dogo.ipa \
	-F api_token='fa8a4a8d04599e74e456e4968117ad25_NDE5NDk0MjAxMi0wNC0yOSAyMzoxNTo0MC4zMzk0Njk' \
	-F team_token='ac1087f484666207583bb7c62daf1fa2_ODU2NTUyMDEyLTA0LTI5IDIzOjQ1OjIwLjQ2Nzg2Ng' \
	-F notes="$$commitMessage" \
	-F notify=True \
	-F distribution_lists='dogo'

bump-ios-patch: check-git-dirty
	bash src/scripts/bump-ios-version.sh patch

bump-ios-minor: check-git-dirty
	bash src/scripts/bump-ios-version.sh minor

clean:
	rm -rf build

build-website:
	${NODE} src/scripts/build-website.js

GIT_REV=`git rev-parse --verify HEAD`
deploy-dogo-api:
	echo "BUILDING AND DEPLOYING ${GIT_REV}"
	fab deploy_dogo_api:${GIT_REV} -H dogo-web1

deploy-nginx-conf:
	fab deploy_nginx_conf:${GIT_REV} -H dogo-web1

deploy-dogo-website:
	fab deploy_dogo_website:${GIT_REV} -H dogo-web1

.PHONY: test
