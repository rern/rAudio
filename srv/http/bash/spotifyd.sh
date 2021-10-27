#!/bin/bash

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm

if [[ $1 == stop ]]; then
	systemctl restart spotifyd
	rm -f $dirshm/spotify-start
	mv $dirshm/player-{*,mpd}
	$dirbash/cmd.sh volumereset
	$dirbash/cmd-pushstatus.sh
	exit
fi

pushstreamSpotify() {
	curl -s -X POST http://127.0.0.1/pub?id=airplay -d "$1"
}

# get from: https://developer.spotify.com/dashboard/applications
client_id=2df4633bcacf4474aa031203d423f2d8
client_secret=6b7f533b66cb4a338716344de966dde1

# env var:
# $PLAYER_EVENT: start/stop/load/play/pause/preload/endoftrack/volumeset
# $TRACK_ID
# $PLAY_REQUEST_ID
# $POSITION_MS
# $DURATION_MS
# $VOLUME

timestamp=$(( $( date +%s%3N ) - 1000 ))
file=$dirshm/spotify
if [[ ! -e $file-start ]]; then
	mpc stop
	mv $dirshm/player-{*,spotify}
	systemctl try-restart shairport-sync snapclient upmpdcli &> /dev/null
	elapsed=$( cat $file-elapsed 2> /dev/null || echo 0 )
	(( $elapsed > 0 )) && echo pause > $file-state
	$dirbash/cmd.sh volume0db$'\n'spotifyd
fi

if [[ $PLAYER_EVENT != stop ]]; then
	state=play
	echo $timestamp > $file-start
	[[ $PLAYER_EVENT == change ]] && echo 0 > $file-elapsed
	echo play > $file-state
else
	elapsed=$( cat $file-elapsed 2> /dev/null || echo 0 )
	[[ $elapsed > 0 ]] && state=pause || state=stop
	echo $state > $file-state
	if [[ -e $file-start ]]; then
		start=$( cat $file-start )
		elapsed=$(( elapsed + timestamp - start ))
		pushstreamSpotify '{"pause":'$(( ( elapsed + 500 ) / 1000 ))'}'
		echo $elapsed > $file-elapsed
		exit
	else
		echo $timestamp > $file-start
	fi
fi

########
status='
  "player"   : "spotify"
, "state"    : "'$( cat $file-state )'"'

trackidfile=$file-trackid
if [[ $( cat $trackidfile 2> /dev/null ) == $TRACK_ID ]]; then
########
	start=$( cat $file-start )
	now=$( date +%s%3N )
	elapsedprev=$( cat $file-elapsed 2> /dev/null || echo 0 )
	elapsed=$(( now - start + elapsedprev ))
	echo $elapsed > $file-elapsed
########
	status+=$( cat $file )
	status+='
, "elapsed" : '$(( ( elapsed + 500 ) / 1000 ))
else
	echo $TRACK_ID > $trackidfile
	
	tokenfile=$file-token
	expirefile=$file-expire
	
	if [[ -e $expirefile && $( cat $expirefile ) -gt $timestamp ]]; then
		token=$( cat $tokenfile )
	else
		token=$( curl -s -X POST -u $client_id:$client_secret -d grant_type=client_credentials https://accounts.spotify.com/api/token \
			| sed 's/.*access_token":"\(.*\)","token_type.*/\1/' )
		[[ -z $token ]] && exit
		expire=$(( $( date +%s%3N ) + 3590000 ))
		echo $token > $tokenfile
		echo $expire > $expirefile
	fi
	
	data=$( curl -s -X GET "https://api.spotify.com/v1/tracks/$TRACK_ID" -H "Authorization: Bearer $token" )
	metadata='
, "Album"    : '$( jq .album.name <<< $data )'
, "Artist"   : '$( jq .album.artists[0].name <<< $data )'
, "coverart" : '$( jq .album.images[0].url <<< $data )'
, "file"     : ""
, "sampling" : "48 kHz 320 kbit/s &bull; Spotify"
, "Time"     : '$(( ( $( jq .duration_ms <<< $data ) + 500 ) / 1000 ))'
, "Title"    : '$( jq .name <<< $data )
	echo $metadata > $file
########
	status+=$metadata
	status+='
, "elapsed" : '$(( ( $(( $( date +%s%3N ) - $timestamp )) + 500 ) / 1000 ))
fi

pushstreamSpotify "{$status}"

[[ -e /srv/http/data/system/lcdchar ]] && $dirbash/cmd.sh lcdcharrefresh
