Setup
#####

	# Brew
	/usr/bin/ruby -e "$(/usr/bin/curl -fsSL https://raw.github.com/mxcl/homebrew/master/Library/Contributions/install_homebrew.rb)"
	# Redis
	brew install redis
	# Mysql
	brew install mysql
	unset TMPDIR
	mysql_install_db --verbose --user=`whoami` --basedir="$(brew --prefix mysql)" --datadir=/usr/local/var/mysql --tmpdir=/tmp
	mysql.server start
	
	make setup-dev

Setup mysql users/schema
########################

	make init-db
	make init-test-db

Run dbs
#######

	make run-redis
	mysqld_safe

Run dev server
##############

	make run
	# go to localhost:9000/app.html

Build ios client
################

	mkdir -p /build/dogo-ios-build
	chmod 777 /build/dogo-ios-build
	make client
	# install client in xcode

Get to Prod
###########

	ssh dogo-web1
	mysql -h dogo-db1.cqka8vcdrksp.us-east-1.rds.amazonaws.com -u dogo_rw -p dogo
	# Fabric
	sudo easy_install fabric
	