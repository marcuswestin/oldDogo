DIR=/tmp/build/dogo-ios-build
APP_FILE="$DIR/app.html"

rm -rf $DIR
mkdir -p $DIR

./node_modules/fun/bin/fun compile ./src/client/dogo.fun > $APP_FILE
