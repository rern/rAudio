#!/bin/bash

# spotifyd.conf > this:
#    - spotifyd 'onevent' hook
# $PLAYER_EVENT: play, pause, stop, change, start, preload, preloading, endoftrack, volumeset
# $TRACK_ID
# $PLAY_REQUEST_ID
# $POSITION_MS
# $DURATION_MS
# $VOLUME

##### start
file_player=/srv/http/data/shm/player
if [[ $( < $file_player ) != spotify ]]; then
	echo spotify > $file_player
	/srv/http/bash/cmd.sh playerstart
	start=1
# ------------------------------------------------------------------------------
fi
[[ $PLAYER_EVENT == volumeset ]] && volumeGet push && exit
# ------------------------------------------------------------------------------

. /srv/http/bash/common.sh

dirspotify=$dirshm/spotify
file_expire=$dirspotify/expire
file_token=$dirspotify/token
mkdirRW $dirspotify

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
# data
metaData() {
	curl -s -H "Authorization: Bearer $token" https://api.spotify.com/v1/me/player/currently-playing
}

JSON=$( metaData )
! jq -e 'type == "object" and .error == null' <<< $JSON &>/dev/null && exit
# ------------------------------------------------------------------------------
if [[ $start && $( jq .is_playing <<< $JSON ) == false ]]; then
	sleep 0.5
	JSON=$( metaData )
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
				timestamp : ((now * 1000) | round)               ,
				Title     : (.item.name?                // "")
			}' <<< $JSON )
$dirbash/status-push.sh "$STATUS"
