BUILD=dogo-server-`date +%s`
DIR=/tmp/build/$BUILD

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

tar -czvf $DIR.tar.gz $DIR

echo "Built $DIR"