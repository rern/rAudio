#!/bin/bash

# track end       - status-push.sh
# stop / prevnext - cmd.sh mpcplayback / mpcprevnext
# webradio        - cmd.sh scrobble

: >/dev/tcp/8.8.8.8/53 || exit # online check

sleep 2 # wait - after track change pushstream

. /srv/http/bash/common.sh
. $dirsystem/scrobblekey

readarray -t args <<< $1
Artist=${args[0]}
Title=${args[1]}
Album=${args[2]}

timestamp=$( date +%s )
if [[ $album ]]; then
	sigalbum="album${Album}"
	dataalbum="album=$Album"
fi
apisig=$( echo -n "${sigalbum}api_key${apikey}artist${Artist}methodtrack.scrobblesk${sk}timestamp${timestamp}track${Title}${sharedsecret}" \
			| md5sum \
			| cut -c1-32 )
reponse=$( curl -sX POST \
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
if [[ $reponse =~ error ]]; then
	msg="Error: $( jq -r .message <<< $response )"
else
	grep -q notify=true $dirsystem/scrobble.conf && msg="${Title//\"/\\\"}"
fi
[[ $msg ]] && notify lastfm Scrobble "$msg"
