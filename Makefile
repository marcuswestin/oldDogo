test:
	./node_modules/mocha/bin/mocha --bail --reporter list

setup:
	bash scripts/setup.sh

run-dev:
	node src/server/run.js --dev --log=true --port=9090 --dbPassword=dogo

client:
	bash scripts/build-client.sh

server:
	bash scripts/build-server.sh

run-instapop:
	node_modules/fun/bin/fun instapop/instapop.fun

clean:
	rm -rf build

session:
	node scripts/create-session.js 1

.PHONY: test .setup run-dev build-client build-server run-instapop clean session
