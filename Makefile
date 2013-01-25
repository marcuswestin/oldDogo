# Common commands 
#################
# Setup all dependencies
setup: setup-server setup-client reset-db	

# Run local server
run: run-databases
	# Run server with src/js in the node search path
	${NODE} src/js/server/run.js --config=dev

# Run all tests
online = true
verbose = true
time = true
test: reset-test-db test-server
t:
	make test online=false verbose=true time=false

icons:
	# app meta resources
	cp src/graphics/pixelmator/App-Icon.png src/ios/logo@2x.png && convert src/ios/logo@2x.png -resize 57x57 src/ios/logo.png
	# /mobileApp
	convert src/graphics/pixelmator/logoIcon-blank.png -resize 64x64 src/graphics/mobileApp/logoIcon-blank-32x32@2x.png
	convert src/graphics/pixelmator/logoIcon-blank.png -resize 192x192 src/graphics/mobileApp/logoIcon-blank-96x96@2x.png
	convert src/graphics/pixelmator/logoIcon-blank.png -resize 256x256 src/graphics/mobileApp/logoIcon-blank-128x128@2x.png
	convert src/graphics/pixelmator/logoName.png -resize 332x144 src/graphics/mobileApp/logoName-166x72@2x.png
	convert src/graphics/pixelmator/logoName.png -resize 112x48 src/graphics/mobileApp/logoName-56x24@2x.png
	cp src/graphics/pixelmator/logoName-header-70x30@2x.png src/graphics/mobileApp/
	cp src/graphics/pixelmator/icon-*.png src/graphics/mobileApp/
	# /identity
	convert src/graphics/pixelmator/logoIcon-blank.png -resize 128x128 src/graphics/identity/logoIcon-blank-128x128.png
	convert src/graphics/pixelmator/logoIcon-blank.png -resize 256x256 src/graphics/identity/logoIcon-blank-256x256.png
	cp src/graphics/pixelmator/logoIcon-letter.png src/graphics/identity/logoIcon-letter-512x512.png
	convert src/graphics/pixelmator/logoName.png -resize 332x144 src/graphics/identity/logoName-332x144.png
	convert src/graphics/pixelmator/logoName.png -resize 166x72 src/graphics/identity/logoName-166x72.png
	# website
	convert src/graphics/pixelmator/logoIcon-letter.png -resize 192x192 src/graphics/website/logoIcon-letter-96x96@2x.png
	convert src/graphics/pixelmator/logoIcon-blank.png -resize 192x192 src/graphics/website/logoIcon-blank-96x96@2x.png
	convert src/graphics/pixelmator/logoName.png -resize 332x144 src/graphics/website/logoName-166x72@2x.png
	cp src/graphics/pixelmator/logoSlogan-300x62@2x.png src/graphics/website/

# Create a new iOS build and deliver it to all developers via testflight
fly-dev: fly-build
	bash src/scripts/testFly.sh "fly-dev build" "dev"

# Less common commands
######################
# Run prod server
run-prod:
	${NODE} src/js/server/run.js --config=prod

# Deploy dogo api server to prod
push-api:
	gitpush
	make deploy-dogo-api
deploy-dogo-api: ${FAB}
	echo "BUILDING AND DEPLOYING ${GIT_REV}"
	fab deploy_dogo_api:${GIT_REV} -H dogo-web1

# Deploy dogo website to prod
push-web:
	gitpush
	make deploy-dogo-website
deploy-dogo-website: ${FAB}
	fab deploy_dogo_website:${GIT_REV} -H dogo-web1

# Deploy nginx conf to prod, and reload nginx
push-nginx:
	gitpush
	make deploy-nginx-conf
deploy-nginx-conf: ${FAB}
	fab deploy_nginx_conf:${GIT_REV} -H dogo-web1

# Testing
#########
test-server: ${PHANTOMJS}
	./node_modules/mocha/bin/mocha --reporter list --bail \
		test/1_test-utils.js test/2_account-setup/test-api.js test/3_device-usage/test-api.js test/test-questions.js\
		--dogo-test-online=${online} --dogo-test-verbose=${verbose} --dogo-test-time=${time}
	# ${PHANTOMJS} test/3_device-usage/test-phantom-client.js

# Setup
#######
# Reset local development database
reset-db: run-databases
	node src/scripts/resetDb.js

reset-test-db: run-databases
	mysql -u dogo_tester --password=test -e 'DROP DATABASE IF EXISTS dogo_test; CREATE DATABASE dogo_test;'
	cat src/db/schema.sql | mysql -u dogo_tester --password=test dogo_test
	if [ -f test/.fbTestDataCache.json ]; then mv test/.fbTestDataCache.json test/.fbTestDataCache.json.bak; fi

setup-client: setup-source setup-emojis
	cd node_modules/require && npm install --production .
	cd dependencies/blowtorch && make setup
	cd dependencies/facebook-ios-sdk && scripts/build_framework.sh
	cd node_modules/socket.io && npm install . --production
	cd node_modules/stylus && npm install . --production
	cd node_modules/mocha && npm install --production .

setup-emojis:
	cd dependencies/emoji-extractor && ruby emoji_extractor.rb
	mkdir -p src/graphics/mobileApp/emoji
	cp -r dependencies/emoji-extractor/images/40x40 src/graphics/mobileApp/emoji/
	cp -r dependencies/emoji-extractor/images/68x68 src/graphics/mobileApp/emoji/

setup-server: setup-source
	bash src/scripts/npm-install-modules.sh
	cd node_modules/mocha && npm install --production .

setup-source:
	echo "node_modules" > ~/.__npm_installed__gitignore
	echo ".__npm_installed__" >> ~/.__npm_installed__gitignore
	git config --global core.excludesfile ~/.__npm_installed__gitignore
	git submodule init; git submodule sync; git submodule update
	mkdir -p node_modules

# Testflight
############
ios-client:
	# Blagh! It would be better to use ${NODE} src/scripts/build-client.js, but xcode doesn't take it :/
	export NODE_PATH=`pwd`/src/js && /usr/local/bin/node src/scripts/build-client.js
	hostname > build/dogo-ios-build/dev-hostname.txt

fly-build: ios-client
	rm -rf src/ios/build
	xcodebuild -project src/ios/dogo.xcodeproj -sdk iphoneos GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	# xcodebuild -project src/ios/dogo.xcodeproj -sdk iphonesimulator5.1 GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	/usr/bin/xcrun -sdk iphoneos PackageApplication src/ios/build/Release-iphoneos/dogo.app -o ~/Desktop/dogo.ipa
	${NODE} src/scripts/save-ipa.js

fly-nightly: bump-ios-patch fly-build
	bash src/scripts/testFly.sh "Nightly build" "nightly"

fly-alpha: bump-ios-patch fly-build
	echo "Enter alpha release notes:\n"; read commitMessage; echo "\nOK! Uploading..."; curl http://testflightapp.com/api/builds.json \
	bash src/scripts/testFly.sh "$$commitMessage" "alpha"

fly-all: bump-ios-minor fly-build
	echo "Enter release notes:\n"; read commitMessage; echo "\nOK! Uploading..."; curl http://testflightapp.com/api/builds.json \
	bash src/scripts/testFly.sh "$$commitMessage" "dogo"

# Misc
######
GIT_REV=`git rev-parse --verify HEAD`
.PHONY: test

run-databases: ${REDIS} ${MYSQL}
	if [ `ps ax | grep redis-server | grep -v grep | wc -l` -eq 0 ]; then ${REDIS} ./src/js/server/config/redis.conf & > /dev/null; fi
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
NODE = ./node
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
