#!/bin/bash

# spotifyd.conf > this:
#    - spotifyd emits events and data
#    - called on each

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
dirscrobble=$dirsystem/scrobble.conf
dirspotify=$dirshm/spotify
mkdir -p $dirspotify

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
		systemctl try-restart bluezdbus shairport-sync snapclient upmpdcli &> /dev/null
#		elapsed=$( cat $fileelapsed 2> /dev/null || echo 0 )
#		(( $elapsed > 0 )) && echo pause > $filestate
		$dirbash/cmd.sh volume0db
	fi
fi

pushstreamSpotify() {
	curl -s -X POST http://127.0.0.1/pub?id=spotify -d "$1"
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

if [[ $PLAYER_EVENT != stop ]]; then
	state=play
	echo $timestamp > $filestart
	[[ $PLAYER_EVENT == change ]] && echo 0 > $fileelapsed
	echo play > $filestate
else
	elapsed=$( cat $fileelapsed 2> /dev/null || echo 0 )
	[[ $elapsed > 0 ]] && state=pause || state=stop
	echo $state > $filestate
	if [[ -e $filestart ]]; then
		start=$( cat $filestart )
		elapsed+=$(( timestamp - start ))
		pushstreamSpotify '{"state":"pause","elapsed":'$(( ( elapsed + 500 ) / 1000 ))'}'
		echo $elapsed > $fileelapsed
		exit
	else
		echo $timestamp > $filestart
	fi
fi

########
status='
  "player"   : "spotify"
, "state"    : "'$( cat $filestate )'"'

if [[ $( cat $filetrackid 2> /dev/null ) == $TRACK_ID ]]; then
########
	start=$( cat $filestart )
	now=$( date +%s%3N )
	elapsed=$( cat $fileelapsed 2> /dev/null || echo 0 )
	elapsed+=$(( now - start ))
	echo $elapsed > $fileelapsed
########
	status+=$( cat $filestatus )
	status+='
, "elapsed" : '$(( ( elapsed + 500 ) / 1000 ))
else
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
	Time=$(( ( $( jq .duration_ms <<< $data ) + 500 ) / 1000 ))
	Title=$( jq -r .name <<< $data )
	metadata='
  "Album"    : "'$Album'"
, "Artist"   : "'$Artist'"
, "coverart" : "'$coverart'"
, "file"     : ""
, "sampling" : "48 kHz 320 kbit/s &bull; Spotify"
, "Time"     : '$Time'
, "Title"    : "'$Title'"'
	elapsed=$(( ( $(( $( date +%s%3N ) - $timestamp )) + 500 ) / 1000 ))
	(( $elapsed > $Time )) && elapsed=0
########
	status+="
, $metadata"
	status+='
, "elapsed" : '$elapsed
	echo $metadata > $filestatus
fi

pushstreamSpotify "{$status}"

[[ -e $dirsystem/lcdchar ]] && $dirbash/cmd.sh lcdcharrefresh

if [[ -n $data && -e $dirsystem/scrobble && -e $dirscrobble/spotify ]]; then
	[[ -e $dirshm/scrobble ]] && $dirbash/cmd.sh scrobble # file not yet exist on initial play
	cat << EOF > $dirshm/scrobble
Artist="$Artist"
Title="$Title"
Album="$Album"
state=$( cat $filestate )
Time=$Time
start=$( cat $filestart )
EOF
fi
