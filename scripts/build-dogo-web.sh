set -e # Die on error

BUILD_NAME=$1
BUILD_GIT_HASH=$2
DIR=/tmp/build/$BUILD_NAME
FILE=$DIR.tar.gz

BUILD_DIR=/tmp/build/dogo-web
if [ ! -d $BUILD_DIR ]; then
	git clone git@github.com:marcuswestin/dogo.git $BUILD_DIR
fi

cd $BUILD_DIR
git pull origin master
git checkout $BUILD_GIT_HASH
make setup-server
make test

mkdir -p $DIR
cp -r src/server $DIR
mkdir -p $DIR/node_modules
cp -r node_modules/express $DIR/node_modules
cp -r node_modules/mysql $DIR/node_modules
cp -r node_modules/fun/node_modules/optimist $DIR/node_modules
cp -r node_modules/redis $DIR/node_modules
cp -r node_modules/request $DIR/node_modules
cp -r node_modules/uuid $DIR/node_modules
cp -r node_modules/fun/node_modules/std $DIR/node_modules

cd $DIR && cd .. && tar -czf $FILE $BUILD_NAME

echo $FILE | pbcopy
echo "Built and copied \"$FILE\" to your clipboard."
