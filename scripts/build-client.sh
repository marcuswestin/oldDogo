BUILD_NAME=$1
DIR=build/client/$BUILD_NAME
APP_FILE="$DIR/app.html"

mkdir -p $DIR

node_modules/fun/bin/fun --compile src/client/dogo.fun > $APP_FILE

cd $DIR && cd .. && rm -f dogo-client && ln -snf $BUILD_NAME dogo-client
