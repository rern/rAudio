#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

name=$( tr -dc '[:alnum:]' <<< $ARTIST$ALBUM )
name=${name,,}

### 1 - lastfm ##################################################
if [[ $MODE != webradio || -e $dirshm/radio ]]; then # not webradio || radioparadise / radiofrance
	param="album=${ALBUM//&/ and }"
	method='method=album.getInfo'
else
	artist_title=1
	param="track=${ALBUM//&/ and }" # $ALBUM = track
	method='method=track.getInfo'
fi
apikey=$( grep -m1 apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2 )
data=$( curl -sfG -m 5 \
	--data-urlencode "artist=$ARTIST" \
	--data-urlencode "$param" \
	--data "$method" \
	--data "api_key=$apikey" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
if [[ $? == 0 && $data ]]; then
	[[ $artist_title ]] && album=$( jq -r '.track.album // empty' <<< $data ) || album=$( jq -r '.album // empty' <<< $data )
	[[ $album ]] && image=$( jq -r '.image // empty' <<< $album )
	if [[ $image ]]; then
		extralarge=$( jq -r '.[3]."#text" // empty' <<< $image )
		[[ $extralarge ]] && url=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	fi
fi
### 2 - coverartarchive.org #####################################
if [[ ! $url ]]; then
	mbid=$( jq -r '.mbid // empty' <<< $album )
	if [[ $mbid ]]; then
		imgdata=$( curl -sfL -m 10 https://coverartarchive.org/release/$mbid )
		[[ $? != 0 ]] && pushDataCoverart && exit
# --------------------------------------------------------------------
		url=$( jq -r '.images[0].image // empty' <<< $imgdata )
	fi
fi
if [[ $DEBUG ]]; then
	[[ ! $url ]] && url="(Not found: $ARTIST - $ALBUM)"
	echo coverart: $url
	exit
# --------------------------------------------------------------------
fi
[[ ! $url ]] && pushDataCoverart && exit
# --------------------------------------------------------------------
ext=${url/*.}
if [[ $DISCID ]]; then
	coverfile=$diraudiocd/$DISCID.$ext
else
	[[ $MODE ]] && prefix=$MODE || prefix=online
	coverfile=$dirshm/$prefix/$name.$ext
fi
curl -sfL $url -o $coverfile
if [[ $? == 0 ]]; then
	[[ $MODE == webradio && ! -e $dirshm/radio ]] && radioalbum=$( jq -r '.title // empty' <<< $album ) # radioparadise / radiofrance - already got album name
	pushDataCoverart "${coverfile:9}" "$radioalbum"
fi
