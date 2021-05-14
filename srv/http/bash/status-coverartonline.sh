#!/bin/bash

[[ $( cat /sys/class/net/eth0/carrier 2> /dev/null ) == 1 ]] && online=1
[[ $( cat /sys/class/net/wlan0/carrier 2> /dev/null ) == 1 ]] && online=1
[[ -z $online ]] && exit

readarray -t args <<< "$1"

artist=${args[0]}
arg1=${args[1]}
type=${args[2]}
discid=${args[3]}

dirtmp=/srv/http/data/shm
name=$( echo $artist$arg1 | tr -d ' "`?/#&'"'" )
date=$( date +%s )

### 1 - lastfm ##################################################
if [[ $type != title ]]; then
	param="album=$arg1"
	method='method=album.getInfo'
else
	param="track=$arg1"
	method='method=track.getInfo'
fi
apikey=$( grep apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2 )
data=$( curl -s -m 5 -G \
	--data-urlencode "artist=$artist" \
	--data-urlencode "$param" \
	--data-urlencode "$method" \
	--data-urlencode "api_key=$apikey" \
	--data-urlencode "autocorrect=1" \
	--data-urlencode "format=json" \
	http://ws.audioscrobbler.com/2.0/ )
error=$( jq -r .error <<< "$data" )
[[ $error != null ]] && exit

if [[ $type == 'title' ]]; then
	album=$( jq -r .track.album <<< "$data" )
else
	album=$( jq -r .album <<< "$data" )
fi
[[ $album == null ]] && exit

image=$( jq -r .image <<< "$album" )
if [[ -n $image || $image != null ]]; then
	extralarge=$( jq -r '.[3]."#text"' <<<  $image )
	if [[ -n $extralarge ]]; then
		url=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	else
### 2 - coverartarchive.org #####################################
		mbid=$( jq -r .mbid <<< "$album" )
		[[ -n $mbid || $mbid != null ]] && url=$( curl -s -m 10 -L https://coverartarchive.org/release/$mbid | jq -r .images[0].image )
	fi
fi
[[ -z $url || $url == null ]] && exit

ext=${url/*.}
if [[ $type == 'audiocd' ]]; then
	urlname=/data/audiocd/$discid
else
	if [[ $type == 'licover' ]]; then
		prefix=licover
	else
		prefix=online
	fi
	files=$( ls -lt $dirtmp/$prefix-* | awk '{print $NF}' )
	(( $( echo "$files" | wc -l ) > 10 )) && rm $( echo $files | tail -1 )
	urlname=/data/shm/$prefix-$name
fi
coverfile=/srv/http$urlname.$ext
curl -s $url -o $coverfile
[[ -e $coverfile ]] && curl -s -X POST http://127.0.0.1/pub?id=coverart -d '{ "url": "'$urlname.$date.$ext'", "type": "coverart" }'
