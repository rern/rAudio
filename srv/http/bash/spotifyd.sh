#!/bin/bash

# spotifyd.conf - onevent > this:
# $PLAYER_EVENT:
#	play   : start + volumeset
#	pause  : pause
#	seek   : seeked
#	volume : volumeset (auto set whith source device by spotifyd)
[[ $PLAYER_EVENT == volumeset ]] && volumeGet push && exit

. /srv/http/bash/common.sh

dirspotify=$dirshm/spotify
file_expire=$dirspotify/expire
file_token=$dirspotify/token
mkdirRW $dirspotify

##### start
! playerActive spotify && playerStart spotify

# token
if [[ -e $file_expire && $( < $file_expire ) > $( date +%s ) ]]; then
	token=$( < $file_token )
else
	. $dirsystem/spotifykey # base64client, refreshtoken
	token=$( curl -s -X POST https://accounts.spotify.com/api/token \
				-H "Authorization: Basic $base64client" \
				-d grant_type=refresh_token \
				-d refresh_token=$refreshtoken \
				| grep access_token \
				| cut -d'"' -f4 )
	if [[ ! $token ]]; then
		notify spotify Spotify 'Access token renewal failed.'
		exit
# ------------------------------------------------------------------------------
	fi
	echo $token > $file_token
	echo $(( $( date +%s ) + 3550 )) > $file_expire # 10s before 3600s
fi

sleep 0.5

JSON=$( curl -s -H "Authorization: Bearer $token" https://api.spotify.com/v1/me/player/currently-playing )
if ! jq -e 'type == "object" and .error == null' <<< $JSON &>/dev/null; then
	notify spotify Metadata 'Not available'
	exit
# ------------------------------------------------------------------------------
fi
STATUS=$( jq '
			{
				Album     : (.item.album.name?          // ""),
				Artist    : (.item.artists[0].name?     // ""),
				coverart  : (.item.album.images[0].url? // ""),
				elapsed   : ((.progress_ms / 1000) | floor),
				play      : .is_playing,
				state     : (if .is_playing then "play" else "pause" end),
				Time      : ((.item.duration_ms?        // 0) / 1000 | round),
				timestamp : ((now * 1000) | round),
				Title     : (.item.name?                // "")
			}' <<< $JSON )
$dirbash/status-push.sh "$STATUS"
