for npm_module in uuid mysql request optimist aws2js express node-color stylus semver bcrypt
do
	echo "check npm install $npm_module"
	# if [ ! -f node_modules/$npm_module/.__npm_installed__ ]
	# then
		cd node_modules/$npm_module && npm install . --production && cd ../../ # touch .__npm_installed__ && cd ../..
	# fi
done
