#!/bin/bash

. /srv/http/bash/common.sh

! internetConnected && exit

args2var "$1"

name=$( tr -d ' "`?/#&'"'" <<< $ARTIST$ALBUM )
name=${name,,}

# suppress multiple calls
[[ -e $dirshm/$name ]] && exit

trap "rm -f $dirshm/$name" EXIT

touch $dirshm/$name

### 1 - lastfm ##################################################
if [[ $TYPE == webradio ]]; then
	param="track=${ALBUM//&/ and }" # $ALBUM = track
	method='method=track.getInfo'
else
	param="album=${ALBUM//&/ and }"
	method='method=album.getInfo'
fi
apikey=$( grep -m1 apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2 )
data=$( curl -sfG -m 5 \
	--data-urlencode "artist=$ARTIST" \
	--data-urlencode "$param" \
	--data "$method" \
	--data "api_key=$apikey" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
[[ $TYPE == webradio ]] && album=$( jq -r .track.album <<< $data ) || album=$( jq -r .album <<< $data )
[[ $album == null ]] && exit

image=$( jq -r .image <<< $album )
if [[ $image && $image != null ]]; then
	extralarge=$( jq -r '.[3]."#text"' <<<  $image )
	if [[ $extralarge ]]; then
		url=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	else
### 2 - coverartarchive.org #####################################
		mbid=$( jq -r .mbid <<< $album )
		if [[ $mbid && $mbid != null ]]; then
			imgdata=$( curl -sfL -m 10 https://coverartarchive.org/release/$mbid )
			[[ $? == 0 ]] && url=$( jq -r .images[0].image <<< $imgdata )
		fi
	fi
fi
[[ ! $url || $url == null ]] && exit

ext=${url/*.}
if [[ $TYPE == audiocd ]]; then
	coverfile=$diraudiocd/$discid.$ext
else
	[[ $TYPE ]] && prefix=$TYPE || prefix=online
	coverfile=$dirshm/$prefix/$name.$ext
fi
curl -sfL $url -o $coverfile || exit

data='
  "url"   : "'${coverfile:9}'"
, "type"  : "coverart"'
if [[ $TYPE == webradio ]]; then
	Album=$( jq -r .title <<< $album )
	echo $ALBUM > $dirshm/webradio/$name
	data+='
, "Album" : "'$ALBUM'"'
fi
pushData coverart "{ $data }"
$dirbash/cmd.sh coverfileslimit
