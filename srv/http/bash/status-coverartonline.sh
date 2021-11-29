#!/bin/bash

: >/dev/tcp/8.8.8.8/53 || exit # online check

readarray -t args <<< "$1"

artist=${args[0]}
arg1=${args[1]}
type=${args[2]}
discid=${args[3]}

name=$( echo $artist$arg1 | tr -d ' "`?/#&'"'" )

### 1 - lastfm ##################################################
if [[ $type == webradio ]]; then
	param="track=$arg1"
	method='method=track.getInfo'
else
	param="album=$arg1"
	method='method=album.getInfo'
fi
apikey=$( grep apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2 )
data=$( curl -sGk -m 5 \
	--data-urlencode "artist=$artist" \
	--data-urlencode "$param" \
	--data "$method" \
	--data "api_key=$apikey" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
[[ $data =~ error ]] && exit

if [[ $type == webradio ]]; then
	album=$( jq -r .track.album <<< "$data" )
else
	album=$( jq -r .album <<< "$data" )
fi
[[ $album == null ]] && exit

image=$( jq -r .image <<< "$album" )
if [[ $image && $image != null ]]; then
	extralarge=$( jq -r '.[3]."#text"' <<<  $image )
	if [[ $extralarge ]]; then
		url=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	else
### 2 - coverartarchive.org #####################################
		mbid=$( jq -r .mbid <<< "$album" )
		[[ $mbid && $mbid != null ]] && url=$( curl -skL -m 10 https://coverartarchive.org/release/$mbid | jq -r .images[0].image )
	fi
fi
[[ -z $url || $url == null ]] && exit

ext=${url/*.}
if [[ $type == audiocd ]]; then
	coverfile=/srv/http/data/audiocd/$discid.$ext
else
	[[ $type ]] && prefix=$type || prefix=online
	coverfile=/srv/http/data/shm/$prefix/$name.$ext
fi
curl -sL $url -o $coverfile
[[ ! -e $coverfile ]] && exit

data='
  "url"   : "'${coverfile:9}'"
, "type"  : "coverart"'
if [[ $type == webradio ]]; then
	Album=$( jq -r .title <<< "$album" )
	echo $Album > /srv/http/data/shm/webradio/$name
	data+='
, "Album" : "'$Album'"'
fi
curl -s -X POST http://127.0.0.1/pub?id=coverart -d "{$data}"
/srv/http/bash/cmd.sh coverfileslimit
