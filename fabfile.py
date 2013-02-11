from __future__ import with_statement
from os.path import basename
from fabric.api import local, run, put, env, sudo, cd, lcd, settings
from fabric.contrib.files import append
import time

env.user = 'ubuntu'
env.key_filename = './secrets/prod/aws-private-key-DogoWeb.pem'

src_dir = "~/dogo-src"
deploy_notes = "~/deploys.txt"

isLocal = False

go = lcd if isLocal else cd
do = local if isLocal else run
sudo_do = local if isLocal else sudo

# Commands
##########

def setup_dogo_web(git_hash):
	# Intentionally remote-only
	sudo('DEBIAN_FRONTEND=noninteractive apt-get -y install build-essential make nginx bcrypt redis-server libssl-dev curl git-core libxml2-dev nodejs npm imagemagick') # ? mysql-client-core-5.5
	put('secrets/prod/github-private-key-id_rsa', '~/.ssh/id_rsa')
	run('chmod 600 ~/.ssh/id_rsa')
	_update_src_dir(git_hash)
	_run_nginx()
	_update_website()
	_note_deploy('setup', git_hash)
	_run_dogo_api()

def deploy_dogo_website(git_hash):
	_update_src_dir(git_hash)
	_update_website()
	_note_deploy('dogo-website', git_hash)

def deploy_dogo_api(git_hash):
	_update_src_dir(git_hash)
	# build_info = do("cd %s && git log %s --format=%s | head -n 1" % (src_dir, git_hash, '%h-%ct'))
	with settings(warn_only=True):
		sudo_do('killall -q node')
	_run_dogo_api()
	_note_deploy('dogo-api', git_hash)

def deploy_nginx_conf(git_hash):
	_update_src_dir(git_hash)
	_run_nginx()
	_note_deploy('nginx-conf', git_hash)

# Utils
#######

def _update_src_dir(git_hash):
	do('if [ ! -d %s ]; then git clone git@github.com:marcuswestin/dogo.git %s; fi' % (src_dir, src_dir))
	with go(src_dir):
		do('git pull origin master')
		do('git checkout %s' % git_hash)
		do('make setup-server')

def _note_deploy(component, git_hash):
	build_info = do("cd %s && git log %s --format=%s | head -n 1" % (src_dir, git_hash, '%cD:%h'))
	deploy_note = "%s: %s" % (component, build_info)
	append(deploy_notes, deploy_note)

def _run_dogo_api():
	with go(src_dir):
		do('make secrets/prod')
		do('make secrets/dev')
		sudo_do('nohup make run-prod')

def _run_nginx():
	sudo("cp %s/src/js/server/config/nginx.conf /etc/nginx/nginx.conf" % src_dir)
	sudo('/etc/init.d/nginx reload')

def _update_website():
	with go(src_dir):
		do('make build-website')
