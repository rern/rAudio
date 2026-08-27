#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

getCoverart() {
	local album data extralarge image mbid method param
	[[ $ALBUM ]] && param="album=$ALBUM" || param="track=$TITLE"
	param=${param//&/ and }
	method=${param/=*}.getInfo
	data=$( curl -sfG -m 5 \
			--data-urlencode "artist=$ARTIST" \
			--data-urlencode "$param" \
			--data "method=$method" \
			--data "api_key=$apikey" \
			--data "format=json" \
			http://ws.audioscrobbler.com/2.0 )
	[[ $? != 0 || ! $data ]] && return

	[[ $TITLE ]] && album=$( jq -r '.track.album // empty' <<< $data ) || album=$( jq -r '.album // empty' <<< $data )
	[[ $album ]] && image=$( jq -r '.image // empty' <<< $album )
	[[ $image ]] && extralarge=$( jq -r '.[3]."#text" // empty' <<< $image )
	if [[ $extralarge ]]; then
		URL=$( sed 's|/300x300/|/_/|' <<< $extralarge ) # get larger size than 300x300
	else
		mbid=$( jq -r '.mbid // empty' <<< $album )
		[[ ! $MBID ]] && MBID=$mbid || MBID1=$mbid
	fi
}
pushCoverart() {
	if [[ $TYPE ]]; then
		pushData coverart '{ "type": "library" }'
	else
		pushData coverart '{ "cover": "'$1'" }'
	fi
}

if [[ $ALBUM ]]; then
	name="$ARTIST$ALBUM"
else
	TITLE=${TITLE/ \[*} # remove bracket - Title [...]
	name="$ARTIST$TITLE"
fi
name=$( alphaNumeric $name )
cover=$( compgen -G $dirshm/online/$name.* )
[[ -e $cover ]] && pushCoverart "${cover:9}" && exit
# --------------------------------------------------------------------
### 1 - ws.audioscrobbler.com #####################################
apikey=$( grep -m1 apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2 )
getCoverart
if [[ ! $URL && ! $ALBUM && $TITLE == *')' ]]; then # try no last parenthesis - Title (...)
	TITLE=$( sed 's/ ([^)]*)$//' <<< $TITLE )
	getCoverart
fi
### 2 - coverartarchive.org #####################################
if [[ ! $URL && $MBID ]]; then
	data=$( curl -sfL -m 10 https://coverartarchive.org/release/$MBID )
	[[ $? != 0 ]] && exit
# --------------------------------------------------------------------
	[[ ! $data && $MBID1 ]] && data=$( curl -sfL -m 10 https://coverartarchive.org/release/$MBID1 )
	[[ ! $data ]] && exit
# --------------------------------------------------------------------
	URL=$( jq -r '.images[0].thumbnails.["500"] // empty' <<< $data )
fi
[[ ! $URL ]] && exit
# --------------------------------------------------------------------
ext=${URL/*.}
[[ $DISCID ]] && cover=$diraudiocd/$DISCID/cover.$ext || cover=$dirshm/online/$name.$ext
curl -sfL $URL -o $cover
[[ ${cover:0:4} == /srv ]] && cover=${cover:9}
pushCoverart "$cover"
compgen -G $dirshm/online/* && ls -t $dirshm/online/* \
	| tail -n +10 \
	| xargs rm -f --
