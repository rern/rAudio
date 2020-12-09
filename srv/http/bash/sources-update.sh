#!/bin/bash

# for startup.sh, source.sh and /etc/conf.d/devmon (devmon@http.service)

path=${1:9}
if (( $( mpc stats | awk '/Songs/ {print $NF}' ) == 0 )); then
	/srv/http/bash/cmd.sh mpcupdate$'\n'true$'\n'rescan
else
	/srv/http/bash/cmd.sh mpcupdate$'\n'false$'\n'"$path"
fi
