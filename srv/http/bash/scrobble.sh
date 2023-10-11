#!/bin/bash

# track end       - status-push.sh
# stop / prevnext - cmd.sh mpcplayback / mpcprevnext
# webradio        - cmd.sh scrobble

. /srv/http/bash/common.sh

! internetConnected && exit

sleep 2 # wait - after track change pushData

. $dirsystem/scrobblekey # sharedsecret

if [[ $1 ]]; then # from function.js - infoTitle() for webradio
	args2var "$1"
	sigalbum="album$ALBUM"
	dataalbum="album=$ALBUM"
	Artist=$ARTIST
	Title=$TITLE
else
	. $dirshm/statusprev
fi
timestamp=$( date +%s )
apisig=$( echo -n "${sigalbum}api_key${apikey}artist${Artist}methodtrack.scrobblesk${sk}timestamp${timestamp}track${Title}${sharedsecret}" \
			| md5sum \
			| cut -c1-32 )
response=$( curl -sX POST \
	--data-urlencode "$dataalbum" \
	--data "api_key=$apikey" \
	--data-urlencode "artist=$Artist" \
	--data "method=track.scrobble" \
	--data "sk=$sk" \
	--data "timestamp=$timestamp" \
	--data-urlencode "track=$Title" \
	--data "api_sig=$apisig" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
if [[ $response =~ error ]]; then
	msg="Error: $( jq -r .message <<< $response )"
else
	grep -q notify=true $dirsystem/scrobble.conf && msg=$( stringEscape $Title )
fi
[[ $msg ]] && notify lastfm Scrobble "$msg"
