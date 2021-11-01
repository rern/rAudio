#!/bin/bash

# spotifyd.conf > this:
#    - spotifyd emits events and data
#    - called on each

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
dirspotify=$dirshm/spotify

# var fileKEY=$dirspotify/KEY
for key in elapsed expire start state status token trackid; do
	printf -v file$key '%s' $dirspotify/$key
done
##### start
if [[ ! -e $filestart ]]; then
	if [[ ! -e $dirshm/player-spotify ]] ;then
		mpc stop
		rm -f $dirshm/{player-*,scrobble} $dirspotify/start
		touch $dirshm/player-spotify
		systemctl stop snapclient
		systemctl try-restart bluezdbus mpd shairport-sync upmpdcli &> /dev/null
#		elapsed=$( cat $fileelapsed 2> /dev/null || echo 0 )
#		(( $elapsed > 0 )) && echo pause > $filestate
		$dirbash/cmd.sh volume0db
	fi
fi

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

if [[ $PLAYER_EVENT != stop ]]; then # play
	state=play
	echo $timestamp > $filestart
	[[ $PLAYER_EVENT == change ]] && echo 0 > $fileelapsed
	echo play > $filestate
else # pause / stop
	elapsed=$( cat $fileelapsed 2> /dev/null || echo 0 )
	[[ $elapsed > 0 ]] && state=pause || state=stop
	echo $state > $filestate
	if [[ -e $filestart ]]; then
		start=$( cat $filestart )
		elapsed=$(( elapsed + timestamp - start ))
		$dirbash/cmd-pushstatus.sh
		echo $elapsed > $fileelapsed
		exit
	else
		echo $timestamp > $filestart # ms
	fi
fi

if [[ $( cat $filetrackid 2> /dev/null ) == $TRACK_ID ]]; then
	start=$( cat $filestart )
	now=$( date +%s%3N )
	elapsed=$( cat $fileelapsed 2> /dev/null || echo 0 )
	elapsed=$(( elapsed + now - start ))
	echo $elapsed > $fileelapsed # ms
else # track changed
	echo $TRACK_ID > $filetrackid
	if [[ -e $fileexpire && $( cat $fileexpire ) -gt $timestamp ]]; then
		token=$( cat $filetoken )
	else
		token=$( curl -s -X POST -u $client_id:$client_secret -d grant_type=client_credentials https://accounts.spotify.com/api/token \
			| sed 's/.*access_token":"\(.*\)","token_type.*/\1/' )
		[[ -z $token ]] && exit
		expire=$(( $( date +%s%3N ) + 3590000 ))
		echo $token > $filetoken
		echo $expire > $fileexpire
	fi
	
	data=$( curl -s -X GET "https://api.spotify.com/v1/tracks/$TRACK_ID" -H "Authorization: Bearer $token" )
	Album=$( jq -r .album.name <<< $data )
	Artist=$( jq -r .album.artists[0].name <<< $data )
	coverart=$( jq -r .album.images[0].url <<< $data )
	Time=$(( ( $( jq .duration_ms <<< $data ) + 500 ) / 1000 )) # second
	Title=$( jq -r .name <<< $data )
	cat << EOF > $filestatus
, "Album"    : "$Album"
, "Artist"   : "$Artist"
, "coverart" : "$coverart"
, "file"     : ""
, "sampling" : "48 kHz 320 kbit/s &bull; Spotify"
, "Time"     : $Time
, "Title"    : "$Title"
EOF
fi

$dirbash/cmd-pushstatus.sh
