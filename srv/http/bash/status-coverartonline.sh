#!/bin/bash

. /srv/http/bash/common.sh

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
data=$( curl -sfG -m 5 \
	--data-urlencode "artist=$artist" \
	--data-urlencode "$param" \
	--data "$method" \
	--data "api_key=$apikey" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
[[ $? != 0 || $data =~ error ]] && exit

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
		if [[ $mbid && $mbid != null ]]; then
			imgdata=$( curl -sfL -m 10 https://coverartarchive.org/release/$mbid )
			[[ $? == 0 ]] && url=$( echo "$imgdata" | jq -r .images[0].image )
		fi
	fi
fi
[[ ! $url || $url == null ]] && exit

ext=${url/*.}
if [[ $type == audiocd ]]; then
	coverfile=$diraudiocd/$discid.$ext
else
	[[ $type ]] && prefix=$type || prefix=online
	coverfile=$dirshm/$prefix/$name.$ext
fi
curl -sfL $url -o $coverfile || exit

data='
  "url"   : "'${coverfile:9}'"
, "type"  : "coverart"'
if [[ $type == webradio ]]; then
	Album=$( jq -r .title <<< "$album" )
	echo $Album > $dirshm/webradio/$name
	data+='
, "Album" : "'$Album'"'
fi
pushstream coverart "{$data}"
/srv/http/bash/cmd.sh coverfileslimit
