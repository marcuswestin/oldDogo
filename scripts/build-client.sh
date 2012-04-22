BUILD=dogo-client-`date +%s`
DIR=build/client/$BUILD
APP_FILE="$DIR/app.html"

mkdir -p $DIR

node_modules/fun/bin/fun --compile src/client/dogo.fun > $APP_FILE

cd $DIR && cd .. && rm -f dogo-client && ln -snf $BUILD dogo-client
