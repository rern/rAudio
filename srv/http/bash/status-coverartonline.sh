#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

name=$( tr -d ' "`?/#&'"'" <<< $ARTIST$ALBUM )
name=${name,,}

### 1 - lastfm ##################################################
if [[ $TYPE != webradio || -e $dirshm/radio ]]; then # not webradio || radioparadise / radiofrance
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
		[[ $? != 0 ]] && notify coverart 'Online Cover Art' 'Server not reachable.' && exit
		
		url=$( jq -r '.images[0].image // empty' <<< $imgdata )
	fi
fi
if [[ $DEBUG ]]; then
	[[ ! $url ]] && url="(Not found: $ARTIST - $ALBUM)"
	echo coverart: $url
	exit
fi

if [[ ! $url ]]; then
	. $dirshm/radio
	pushData coverart '{ "url": "" }'
	exit
fi

ext=${url/*.}
if [[ $DISCID ]]; then
	coverfile=$diraudiocd/$DISCID.$ext
else
	[[ $TYPE ]] && prefix=$TYPE || prefix=online
	coverfile=$dirshm/$prefix/$name.$ext
	$dirbash/cmd.sh coverfileslimit
fi
curl -sfL $url -o $coverfile
[[ $? != 0 ]] && exit

coverurl=${coverfile:9}
data='"url": "'$coverurl'"'
if [[ $TYPE == webradio ]]; then
	if [[ -e $dirshm/radio ]]; then # radioparadise / radiofrance - already got album name
		sed -i -e '/^coverart=/ d' -e "$ a\coverart=$coverurl" $dirshm/status
	else
		radioalbum=$( jq -r '.title // empty' <<< $album )
		if [[ $radioalbum ]]; then
			echo $radioalbum > $dirshm/webradio/$name
			data+=', "radioalbum" : "'$radioalbum'"'
		fi
	fi
fi
pushData coverart "{ $data }"
