#!/bin/bash

# track end       - status-push.sh
# stop / prevnext - cmd.sh mpcplayback / mpcprevnext
# webradio        - cmd.sh scrobble

. /srv/http/bash/common.sh
if [[ $1 && $1 != status ]]; then # playback - track info - webradio scrobble
	args2var "$1"
	Artist=$ARTIST
	Title=$TITLE
else # cmd.sh mpcprevnext || status-push.sh
	[[ $1 ]] && . $dirshm/status || . $dirshm/statusprev
	[[ $state == stop || $webradio == true || ! $Artist || ! $Title || $Time -lt 30 ]] && exit
	
	[[ $player != mpd ]] && ! grep -q $player=true $dirsystem/scrobble.conf && exit
	
	if [[ $1 ]]; then
		[[ $( mpc status %state% ) == playing ]] && elapsedcheck=1 && elapsed=$( mpcElapsed )
	else
		[[ $state == pause ]] && elapsedcheck=1
	fi
	[[ $elapsedcheck ]] && (( $elapsed < 240 && $elapsed < $(( Time / 2 )) )) && exit
	
fi
touch $dirshm/scrobble
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
rm -f $dirshm/scrobble
