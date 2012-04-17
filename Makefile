.PHONY: setup
setup:
	git submodule init
	git submodule sync
	git submodule update
	cd node_modules/fun && make setup