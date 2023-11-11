#!/bin/bash

# track end       - status-push.sh
# stop / prevnext - cmd.sh mpcplayback / mpcprevnext
# webradio        - cmd.sh scrobble

. /srv/http/bash/common.sh

args2var "$1"

. $dirsystem/scrobblekey # sharedsecret
timestamp=$( date +%s )
apisig=$( echo -n "api_key${apikey}artist${ARTIST}methodtrack.scrobblesk${sk}timestamp${timestamp}track${TITLE}${sharedsecret}" \
			| md5sum \
			| cut -c1-32 )
response=$( curl -sfX POST \
	--data "api_key=$apikey" \
	--data-urlencode "artist=$ARTIST" \
	--data "method=track.scrobble" \
	--data "sk=$sk" \
	--data "timestamp=$timestamp" \
	--data-urlencode "track=$TITLE" \
	--data "api_sig=$apisig" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
if [[ $? == 0 ]]; then
	[[ $response =~ error ]] && msg="Error: $( jq -r .message <<< $response )" || msg=$( stringEscape $TITLE )
else
	msg='Server not reachable.'
fi
[[ $msg ]] && notify lastfm Scrobble "$msg"
rm -f $dirshm/scrobble
