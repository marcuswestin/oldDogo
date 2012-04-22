BUILD=dogo-server-`date +%s`
DIR=/tmp/build/$BUILD
FILE=$DIR.tar.gz

mkdir -p $DIR

cp -r src/server $DIR

mkdir -p $DIR/node_modules
cp -r node_modules/express $DIR/node_modules
cp -r node_modules/mysql $DIR/node_modules
cp -r node_modules/redis $DIR/node_modules
cp -r node_modules/request $DIR/node_modules
cp -r node_modules/uuid $DIR/node_modules
cp -r node_modules/fun/node_modules/std $DIR/node_modules
cp -r node_modules/fun/node_modules/optimist $DIR/node_modules

cd $DIR && cd .. && tar -czvf $FILE $BUILD

echo "Built $FILE"