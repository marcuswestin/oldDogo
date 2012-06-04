test:
	./node_modules/mocha/bin/mocha --bail --reporter list

setup-server: setup
	bash scripts/npm-install-modules.sh

setup-dev: setup
	cd node_modules/require && npm install --production .
	cd dependencies/blowtorch && make setup
	cd dependencies/facebook-ios-sdk && scripts/build_facebook_ios_sdk_static_lib.sh
	cd node_modules/watch && npm install .
	cd node_modules/socket.io && npm install .

setup:
	echo "node_modules" > ~/.__npm_installed__gitignore
	echo ".__npm_installed__" >> ~/.__npm_installed__gitignore
	git config --global core.excludesfile ~/.__npm_installed__gitignore
	git submodule init
	git submodule sync
	git submodule update
	mkdir -p node_modules

run:
	node src/server/run.js --config=dev

run-prod:
	node src/server/run.js --config=prod

client:
	mkdir -p ~/dogo-builds
	node scripts/build-client.js

fly-build: client
	xcodebuild -project src/client/ios/dogo.xcodeproj -sdk iphoneos GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	# xcodebuild -project src/client/ios/dogo.xcodeproj -sdk iphonesimulator5.1 GCC_PREPROCESSOR_DEFINITIONS="TESTFLIGHT" -configuration Release
	/usr/bin/xcrun -sdk iphoneos PackageApplication src/client/ios/build/Release-iphoneos/dogo.app -o ~/Desktop/dogo.ipa

fly-dev: fly-build
	curl http://testflightapp.com/api/builds.json \
	-F file=@/Users/marcus/Desktop/dogo.ipa \
	-F api_token='fa8a4a8d04599e74e456e4968117ad25_NDE5NDk0MjAxMi0wNC0yOSAyMzoxNTo0MC4zMzk0Njk' \
	-F team_token='ac1087f484666207583bb7c62daf1fa2_ODU2NTUyMDEyLTA0LTI5IDIzOjQ1OjIwLjQ2Nzg2Ng' \
	-F notes='This build was uploaded via the upload API' \
	-F notify=True \
	-F distribution_lists='dev'

clean:
	rm -rf build

GIT_REV=`git rev-parse --verify HEAD`
deploy-latest-dogo-web:
	# echo "BUILDING AND DEPLOYING ${GIT_REV}"
	fab deploy_dogo_web:${GIT_REV} -H dogo-web1

.PHONY: test
