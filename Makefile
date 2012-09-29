# Common commands 
#################
# Setup all dependencies
setup: setup-all-dependencies reset-db	

# Run local server
run: run-databases
	${NODE} src/server/run.js --config=dev

# Run all tests
offline = no
verbose = yes
test: reset-test-db test-server
t:
	make test offline=yes verbose=no

# Create a new iOS build and deliver it to all developers via testflight
fly-dev: fly-build
	curl http://testflightapp.com/api/builds.json \
	-F file=@/Users/marcus/Desktop/dogo.ipa \
	-F api_token='fa8a4a8d04599e74e456e4968117ad25_NDE5NDk0MjAxMi0wNC0yOSAyMzoxNTo0MC4zMzk0Njk' \
	-F team_token='ac1087f484666207583bb7c62daf1fa2_ODU2NTUyMDEyLTA0LTI5IDIzOjQ1OjIwLjQ2Nzg2Ng' \
	-F notes='fly-dev build' \
	-F notify=True \
	-F distribution_lists='dev'

# Less common commands
######################
# Run prod server
run-prod:
	${NODE} src/server/run.js --config=prod

# Deploy dogo api server to prod
deploy-dogo-api: ${FAB}
	echo "BUILDING AND DEPLOYING ${GIT_REV}"
	fab deploy_dogo_api:${GIT_REV} -H dogo-web1

# Deploy dogo website to prod
deploy-dogo-website: ${FAB}
	fab deploy_dogo_website:${GIT_REV} -H dogo-web1

# Deploy nginx conf to prod, and reload nginx
deploy-nginx-conf: ${FAB}
	fab deploy_nginx_conf:${GIT_REV} -H dogo-web1

# Testing
#########
test-server: ${PHANTOMJS}
	./node_modules/mocha/bin/mocha --reporter list --bail test/1_test-utils.js test/2_account-setup/test-api.js test/3_device-usage/test-api.js test/test-questions.js --dogo-test-offline=${offline} --dogo-test-verbose=${verbose}
	# ${PHANTOMJS} test/3_device-usage/test-phantom-client.js

# Setup
#######
# Reset local development database
reset-db: run-databases
	mysql -u dogo_rw --password=dogo -e 'DROP DATABASE IF EXISTS dogo; CREATE DATABASE dogo;'
	cat db/schema.sql | mysql -u dogo_rw --password=dogo dogo

reset-test-db: run-databases
	mysql -u dogo_tester --password=test -e 'DROP DATABASE IF EXISTS dogo_test; CREATE DATABASE dogo_test;'
	cat db/schema.sql | mysql -u dogo_tester --password=test dogo_test
	if [ -f test/.fbTestDataCache.json ]; then mv test/.fbTestDataCache.json test/.fbTestDataCache.json.bak; fi

setup-all-dependencies: setup-source setup-server
	cd node_modules/require && npm install --production .
	cd dependencies/blowtorch && make setup
	cd dependencies/facebook-ios-sdk && scripts/build_facebook_ios_sdk_static_lib.sh
	cd node_modules/socket.io && npm install . --production
	cd node_modules/stylus && npm install . --production
	cd node_modules/mocha && npm install --production .

setup-server: setup-source
	bash src/scripts/npm-install-modules.sh

setup-source:
	echo "node_modules" > ~/.__npm_installed__gitignore
	echo ".__npm_installed__" >> ~/.__npm_installed__gitignore
	git config --global core.excludesfile ~/.__npm_installed__gitignore
	git submodule init; git submodule sync; git submodule update
	mkdir -p node_modules

# Testflight
############
ios-client:
	# Bah: xcode doesn't like the `which node` incantaion... # ${NODE} src/scripts/build-client.js
	/usr/local/bin/node src/scripts/build-client.js
	hostname > build/dogo-ios-build/dev-hostname.txt

fly-build: ios-client
	rm -rf src/client/ios/build
	xcodebuild -project src/client/ios/dogo.xcodeproj -sdk iphoneos GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	# xcodebuild -project src/client/ios/dogo.xcodeproj -sdk iphonesimulator5.1 GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	/usr/bin/xcrun -sdk iphoneos PackageApplication src/client/ios/build/Release-iphoneos/dogo.app -o ~/Desktop/dogo.ipa
	${NODE} src/scripts/save-ipa.js

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

# Misc
######
GIT_REV=`git rev-parse --verify HEAD`
.PHONY: test

run-databases: ${REDIS} ${MYSQL}
	if [ `ps ax | grep redis-server | grep -v grep | wc -l` -eq 0 ]; then ${REDIS} ./src/server/config/redis.conf & > /dev/null; fi
	if [ `ps ax | grep mysql | grep -v grep | wc -l` -eq 0 ]; then ${MYSQL} start; fi

check-git-dirty:
	if ! git diff-index --quiet HEAD --; then echo "DIRTY GIT REPO TREE"; exit -1; fi

bump-ios-patch: check-git-dirty
	bash src/scripts/bump-ios-version.sh patch

bump-ios-minor: check-git-dirty
	bash src/scripts/bump-ios-version.sh minor

build-website:
	${NODE} src/scripts/build-website.js

# Dependencies
##############
NODE = `which node`
REDIS = /usr/local/bin/redis-server
MYSQL = /usr/local/bin/mysql.server
BREW = /usr/local/bin/brew
PHANTOMJS = /usr/local/bin/phantomjs
FAV = /usr/local/bin/fab

${REDIS}: ${BREW}
	${BREW} install redis

${MYSQL}: ${BREW}
	if [ ! -f ${BREW} ]; then ${BREW} install mysql && mysql_install_db --verbose --user=`whoami` --basedir="$$(${BREW} --prefix mysql)" --datadir=/usr/local/var/mysql --tmpdir=/tmp; fi;

${BREW}:
	ruby <(curl -fsSkL raw.github.com/mxcl/homebrew/go)

${FAB}:
	sudo easy_install fabric

${PHANTOMJS}:
	echo "\n\n*** Installing phantomjs to ${PHANTOMJS}\n****************************************************\n\n"
	rm -rf /tmp/phantomjs-1.6.1-macosx-static*
	curl http://phantomjs.googlecode.com/files/phantomjs-1.6.1-macosx-static.zip > /tmp/phantomjs-1.6.1-macosx-static.zip
	cd /tmp && unzip /tmp/phantomjs-1.6.1-macosx-static.zip
	cp /tmp/phantomjs-1.6.1-macosx-static/bin/phantomjs ${PHANTOMJS}
