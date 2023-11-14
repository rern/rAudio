#!/bin/bash

# track end       - status-push.sh
# stop / prevnext - cmd.sh mpcplayback / mpcprevnext
# webradio        - cmd.sh scrobble

. /srv/http/bash/common.sh
if [[ $1 ]]; then # playback - track info - webradio scrobble
	args2var "$1"
	Artist=$ARTIST
	Title=$TITLE
else # cmd.sh mpcprevnext || status-push.sh
	. $dirshm/statusprev
	[[ $state == stop || $webradio == true || ! $Artist || ! $Title || $Time -lt 30 ]] && exit
	
	[[ $player != mpd ]] && ! grep -q $player=true $dirsystem/scrobble.conf && exit
	
	[[ $state == pause ]] && (( $elapsed < 240 && $elapsed < $(( Time / 2 )) )) && exit
	
fi
. $dirsystem/scrobblekey # sharedsecret
timestamp=$( date +%s )
apisig=$( echo -n "api_key${apikey}artist${Artist}methodtrack.scrobblesk${sk}timestamp${timestamp}track${Title}${sharedsecret}" \
			| md5sum \
			| cut -c1-32 )
response=$( curl -sfX POST \
	--data "api_key=$apikey" \
	--data-urlencode "artist=$Artist" \
	--data "method=track.scrobble" \
	--data "sk=$sk" \
	--data "timestamp=$timestamp" \
	--data-urlencode "track=$Title" \
	--data "api_sig=$apisig" \
	--data "format=json" \
	http://ws.audioscrobbler.com/2.0 )
if [[ $? == 0 ]]; then
	[[ $response =~ error ]] && msg="Error: $( jq -r .message <<< $response )" || msg=$( stringEscape $Title )
else
	msg='Server not reachable.'
fi
[[ $msg ]] && notify lastfm Scrobble "$msg"
