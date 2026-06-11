#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

### 0 - itunes ##################################################
# term="$ARTIST+$ALBUM"
# data=$( curl -sfG -m 5 \
#			--data-urlencode "term=$term" \
#			--data-urlencode "entity=album" \
#			https://itunes.apple.com/search \
#		| jq ".results[] | select(.artistName==\"$ARTIST\") | select(.collectionName==\"$ALBUM\") | .artworkUrl100" )
# [[ $? == 0 && $data ]] && url=$( sed 's/100x100/600x600/' <<< $data ) # any from 100x100 - 3000x3000
	
if [[ $ALBUM ]]; then # artist_album
	param="album=${ALBUM//&/ and }"
	method='method=album.getInfo'
else
	param="track=${TITLE//&/ and }"
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
	[[ $TITLE ]] && album=$( jq -r '.track.album // empty' <<< $data ) || album=$( jq -r '.album // empty' <<< $data )
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
		[[ $? != 0 ]] && exit
# --------------------------------------------------------------------
		url=$( jq -r '.images[0].image // empty' <<< $imgdata )
	fi
fi
[[ $ALBUM ]] && album_title=$ALBUM || album_title=$TITLE
if [[ $DEBUG ]]; then
	[[ ! $url ]] && url="(Not found: $ARTIST - $album_title)"
	echo coverart: $url
	exit
# --------------------------------------------------------------------
fi
[[ ! $url ]] && exit
# --------------------------------------------------------------------
name=$( alphaNumeric $ARTIST$album_title )
ext=${url/*.}
cover=$dirshm/online/$name.$ext
curl -sfL $url -o $cover
[[ ${cover:0:4} == /srv ]] && cover=${cover:9}
pushData cover '{ "cover": "'$cover'" }'
[[ $MODE == webradio ]] && $dirbash/cmd.sh coverfileslimit
