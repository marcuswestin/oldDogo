from __future__ import with_statement
from os.path import basename
from fabric.api import local, run, put, env, sudo, cd, lcd, settings
from fabric.contrib.files import append
import time

env.use_ssh_config = True

src_dir = "~/dogo-src"
deploy_notes = "~/deploys.txt"

isLocal = False

go = lcd if isLocal else cd
do = local if isLocal else run
sudo_do = local if isLocal else sudo

def setup_dogo_web():
	# Intentionally remote-only
	sudo('apt-get install build-essential make nginx redis-server libssl-dev curl git-core libxml2-dev nodejs npm imagemagick') # ? mysql-client-core-5.5
	put('~/flutterby-keys/dogo/secure/aws_dogo_github_id_rsa', '~/.ssh/id_rsa')
	run('chmod 600 ~/.ssh/id_rsa')

def deploy_dogo_website(git_hash):
	update_src_dir(git_hash)
	with go(src_dir):
		do('make build-website')
	note_deploy('dogo-website', git_hash)

def deploy_dogo_api(git_hash):
	update_src_dir(git_hash)
	# build_info = do("cd %s && git log %s --format=%s | head -n 1" % (src_dir, git_hash, '%h-%ct'))
	with settings(warn_only=True):
		sudo_do('killall -q node')
	sudo_do('nohup node %s/src/node_modules/server/run.js --config=prod' % (src_dir))
	note_deploy('dogo-api', git_hash)

def deploy_nginx_conf(git_hash):
	update_src_dir(git_hash)
	sudo("cp %s/src/server/config/nginx.conf /etc/nginx/nginx.conf" % src_dir)
	sudo('/etc/init.d/nginx reload')
	note_deploy('nginx-conf', git_hash)

def update_src_dir(git_hash):
	do('if [ ! -d %s ]; then git clone git@github.com:marcuswestin/dogo.git %s; fi' % (src_dir, src_dir))
	with go(src_dir):
		do('git pull origin master')
		do('git checkout %s' % git_hash)
		do('make setup-server')

def note_deploy(component, git_hash):
	build_info = do("cd %s && git log %s --format=%s | head -n 1" % (src_dir, git_hash, '%cD:%h'))
	deploy_note = "%s: %s" % (component, build_info)
	append(deploy_notes, deploy_note)

