from __future__ import with_statement
from os.path import basename
from fabric.api import local, run, put, env, sudo, cd, lcd, settings
import time

def build_dogo_web(git_hash):
	def with_updated_build(src_dir):
		build_name = "dogo-web-%s-%s" % (int(time.time()), git_hash)
		build_dir = "/tmp/build/%s" % build_name
		tar_file = "%s.tar.gz" % build_dir
		# local('cd %s && make setup-server && make test' % src_dir)
		local('cd %s && make setup-server' % src_dir)
		local('mkdir -p %s' % build_dir)
		local('cp -r %s/src/server %s/server' % (src_dir, build_dir))
		local('mkdir -p %s/node_modules' % build_dir)
		#local('cp -r %s/node_modules/express %s/node_modules/express' % (src_dir, build_dir))
		# HACK!	
		local('cp -r /Users/marcus/code/dogo/node_modules/express %s/node_modules/express' % (src_dir, build_dir))
		local('cp -r %s/node_modules/mysql %s/node_modules' % (src_dir, build_dir))
		local('cp -r %s/node_modules/optimist %s/node_modules' % (src_dir, build_dir))
		local('cp -r %s/node_modules/redis %s/node_modules' % (src_dir, build_dir))
		local('cp -r %s/node_modules/request %s/node_modules' % (src_dir, build_dir))
		local('cp -r %s/node_modules/uuid %s/node_modules' % (src_dir, build_dir))
		local('cp -r %s/node_modules/apn %s/node_modules' % (src_dir, build_dir))
		local('cp -r %s/node_modules/std %s/node_modules' % (src_dir, build_dir))
		local('cd %s && cd .. && tar -czf %s %s' % (build_dir, tar_file, build_name))
		local('echo "%s,%s" | pbcopy' % (tar_file, build_name))
		local('echo Built and copied deploy args to your clipboard.')
	update_build(git_hash, with_updated_build)

def deploy_dogo_web(tar_file, build_name):
	env.use_ssh_config = True
	put(tar_file, tar_file)
	run('tar -xzf %s' % tar_file)
	with settings(warn_only=True):
	    sudo('killall -q node')
	sudo('nohup node %s/server/run.js --config=prod' % build_name)

def deploy_nginx_conf(git_hash):
	def with_updated_build(src_dir):
		put("%s/src/server/config/nginx.conf" % src_dir, '/tmp/nginx.conf')
		sudo('cp /tmp/nginx.conf /etc/nginx/nginx.conf')
		sudo('/etc/init.d/nginx reload')
	env.use_ssh_config = True
	update_build(git_hash, with_updated_build)

def update_build(git_hash, then):
	src_dir = '/tmp/build/dogo'
	local('if [ ! -d %s ]; then git clone git@github.com:marcuswestin/dogo.git %s; fi' % (src_dir, src_dir))
	with lcd(src_dir):
		local('git pull origin master')
		local('git checkout %s' % git_hash)
		local('git submodule init')
		local('git submodule sync')
		local('git submodule update')
		then(src_dir)
