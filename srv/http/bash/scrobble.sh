#!/bin/bash

# track end       - status-push.sh
# stop / prevnext - cmd.sh mpcplayback / mpcprevnext
# webradio        - cmd.sh scrobble

! internetConnected && exit

sleep 2 # wait - after track change pushstream

. /srv/http/bash/common.sh
. $dirsystem/scrobblekey

args2var "$1"

timestamp=$( date +%s )
if [[ $ALBUM ]]; then
	sigalbum="album${ALBUM}"
	dataalbum="album=$ALBUM"
fi
apisig=$( echo -n "${sigalbum}api_key${apikey}artist${ARTIST}methodtrack.scrobblesk${sk}timestamp${timestamp}track${TITLE}${sharedsecret}" \
			| md5sum \
			| cut -c1-32 )
response=$( curl -sX POST \
	--data-urlencode "$dataalbum" \
	--data "api_key=$apikey" \
	--data-urlencode "artist=$ARTIST" \
	--data "method=track.scrobble" \
	--data "sk=$sk" \
	--data "timestamp=$timestamp" \
	--data-urlencode "track=$TITLE" \
	--data "api_sig=$apisig" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
if [[ $response =~ error ]]; then
	msg="Error: $( jq -r .message <<< $response )"
else
	grep -q notify=true $dirsystem/scrobble.conf && msg=$( stringEscape $TITLE )
fi
[[ $msg ]] && notify lastfm Scrobble "$msg"
