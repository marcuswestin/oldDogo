from __future__ import with_statement
from os.path import basename
from fabric.api import local, run, put, env, sudo, cd, lcd
import time

def build_dogo_web(git_hash):
	build_name = "dogo-web-%s-%s" % (int(time.time()), git_hash)
	local("bash scripts/build-dogo-web.sh %s %s" % (build_name, git_hash))

def deploy_dogo_web(tar_file):
	env.use_ssh_config = True
	run('mkdir -p /tmp/build')
	put(tar_file, tar_file)
	run('tar -xzf %s' % tar_file)
	run('sudo killall node')
	run('node')

def deploy_nginx_conf(git_hash):
	def with_updated_build(build_dir):
		env.use_ssh_config = True
		put("%s/src/server/conf/nginx.conf" % build_dir, '/tmp/nginx.conf')
		sudo('cp /tmp/nginx.conf /etc/nginx/nginx.conf')
		sudo('/etc/init.d/nginx reload')
	update_build(git_hash, with_updated_build)

def update_build(git_hash, then):
	build_dir = '/tmp/build/dogo'
	local('if [ ! -d %s ]; then git clone git@github.com:marcuswestin/dogo.git %s; fi' % (build_dir, build_dir))
	with lcd(build_dir):
		local('git pull origin master')
		local('git checkout %s' % git_hash)
		local('git submodule init')
		local('git submodule sync')
		local('git submodule update')
		then(build_dir)
