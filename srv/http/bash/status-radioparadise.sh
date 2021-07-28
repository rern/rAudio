#!/bin/bash

# Radio Paradise metadata
dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm
readarray -t stationdata < $dirtmp/radioparadise
file=${stationdata[0]}
station=${stationdata[1]}
id=${stationdata[2]}
case $id in
	flac )   id=0;;
	mellow ) id=1;;
	rock )   id=2;;
	world )  id=3;;
esac

metadataGet() {
	readarray -t metadata <<< $( curl -s -m 5 -G \
		--data-urlencode "chan=$id" \
		https://api.radioparadise.com/api/now_playing \
		| jq -r .artist,.title,.album,.cover,.time \
		| sed 's/^null$//' )
	. /srv/http/bash/status-radio.sh
}

metadataGet
