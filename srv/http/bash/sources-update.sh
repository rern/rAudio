#!/bin/bash

# for /etc/conf.d/devmon - devmon@http.service

mountpoint=$1
if [[ ${mountpoint:0:4} != /mnt ]]; then # fix: devmon - no hfsplus label
	dev=${mountpoint:8}
	[[ -z $dev ]] && exit
	
	mountpoint=/mnt/MPD/USB/$( mount -l | grep ^$dev | awk '{print $NF}' | tr -d '[]' )
fi

path=${mountpoint:9} # /mnt/MPD/USB/... > USB/...
echo $path > $dirsystem/updating
mpc update "$path"

sleep 1
curl -s -X POST http://127.0.0.1/pub?id=mpdupdate -d 1
curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "sources" }'
