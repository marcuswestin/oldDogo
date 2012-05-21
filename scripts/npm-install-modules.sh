for npm_module in uuid mysql request optimist aws2js knox express color
do
	if [ ! -f node_modules/$npm_module/.__npm_installed__ ]
	then
		echo "check npm install $npm_module"
		cd node_modules/$npm_module && npm install . --production && touch .__npm_installed__ && cd ../..
	fi
done
