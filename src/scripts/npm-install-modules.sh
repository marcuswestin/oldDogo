for npm_module in uuid mysql request optimist aws2js express stylus semver bcrypt
do
	echo "check npm install $npm_module"
	cd node_modules/$npm_module && npm install . --production && cd ../../
done
