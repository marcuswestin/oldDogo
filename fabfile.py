from fabric.api import local, run, put, env
import time

def build_dogo_web(git_hash):
	build_name = "dogo-web-%s-%s" % (int(time.time()), git_hash)
	local("bash scripts/build-dogo-web.sh %s %s" % (build_name, git_hash))

def deploy(tar_file):
	env.use_ssh_config = True
	run('mkdir -p /tmp/build')
	put(tar_file, tar_file)
	run('tar -xzf %s' % tar_file)
