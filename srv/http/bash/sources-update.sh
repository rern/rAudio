#!/bin/bash

# for startup.sh, source.sh and /etc/conf.d/devmon (devmon@http.service)

mountpoint=$1
if [[ ${mountpoint:0:4} != /mnt ]]; then # fix: devmon - no hfsplus label
	dev=${mountpoint:8}
	[[ -z $dev ]] && exit
	
	mountpoint=/mnt/MPD/USB/$( mount -l | grep ^$dev | awk '{print $NF}' | tr -d '[]' )
fi

path=${mountpoint:9} # /mnt/MPD/USB/... > USB/...
if (( $( mpc stats | awk '/Songs/ {print $NF}' ) == 0 )); then
	/srv/http/bash/cmd.sh mpcupdate$'\n'true$'\n'rescan
else
	/srv/http/bash/cmd.sh mpcupdate$'\n'false$'\n'"$path"
fi

curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "sources" }'
