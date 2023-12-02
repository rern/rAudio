#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

name=$( tr -d ' "`?/#&'"'" <<< $ARTIST$ALBUM )
name=${name,,}

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
if [[ $? == 0 && $data ]]; then
	[[ $TYPE == webradio ]] && album=$( jq -r .track.album <<< $data ) || album=$( jq -r .album <<< $data )
	[[ $album && $album != null ]] && image=$( jq -r .image <<< $album )
	if [[ $image && $image != null ]]; then
		extralarge=$( jq -r '.[3]."#text"' <<< $image )
		[[ $extralarge && $extralarge != null ]] && url=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	fi
fi
### 2 - coverartarchive.org #####################################
if [[ ! $url ]]; then
	mbid=$( jq -r .mbid <<< $album )
	if [[ $mbid && $mbid != null ]]; then
		imgdata=$( curl -sfL -m 10 https://coverartarchive.org/release/$mbid )
		[[ $? != 0 ]] && notify coverart 'Online Cover Art' 'Server not reachable.' && exit
		
		url=$( jq -r .images[0].image <<< $imgdata )
	fi
fi
if [[ $DEBUG ]]; then
	[[ ! $url ]] && url="(Not found: $ARTIST - $ALBUM)"
	echo coverart: $url
	exit
fi

[[ ! $url || $url == null ]] && exit

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
data='
  "url"   : "'$coverurl'"
, "type"  : "coverart"'
if [[ $TYPE == webradio ]]; then
	if [[ -e $dirshm/radio ]]; then
		sed -i -e '/^coverart=/ d' -e "1 a\coverart=$coverurl" $dirshm/status
	else
		Album=$( jq -r .title <<< $album )
		echo $ALBUM > $dirshm/webradio/$name
		data+='
, "Album" : "'$ALBUM'"'
	fi
fi
pushData coverart "{ $data }"
