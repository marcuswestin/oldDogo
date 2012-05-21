for npm_module in ./node_modules/*
do
	if [ ! -f $npm_module/.__npm_installed__ ]
	then
		echo "check npm install $npm_module"
		cd $npm_module && npm install . --production && touch .__npm_installed__ && cd ../..
	fi
done
