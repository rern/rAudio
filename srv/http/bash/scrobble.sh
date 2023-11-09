#!/bin/bash

# track end       - status-push.sh
# stop / prevnext - cmd.sh mpcplayback / mpcprevnext
# webradio        - cmd.sh scrobble

. /srv/http/bash/common.sh

! urlReachable ws.audioscrobbler.com scrobble 'Scrobble Server' && rm -f $dirshm/scrobble && exit

args2var "$1"

. $dirsystem/scrobblekey # sharedsecret
timestamp=$( date +%s )
apisig=$( echo -n "api_key${apikey}artist${ARTIST}methodtrack.scrobblesk${sk}timestamp${timestamp}track${TITLE}${sharedsecret}" \
			| md5sum \
			| cut -c1-32 )
response=$( curl -sX POST \
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
rm -f $dirshm/scrobble
