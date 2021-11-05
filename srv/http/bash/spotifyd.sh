#!/bin/bash

# spotifyd.conf > this:
#    - spotifyd emits events on play/pause/track changed
# env var:
# $PLAYER_EVENT: start/stop/load/play/pause/preload/endoftrack/volumeset
# $TRACK_ID
# $PLAY_REQUEST_ID
# $POSITION_MS
# $DURATION_MS
# $VOLUME

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system
dirspotify=$dirshm/spotify
# var fileKEY=$dirspotify/KEY
for key in elapsed expire start state status token; do
	printf -v file$key '%s' $dirspotify/$key
done

##### start
if [[ ! -e $dirshm/player-spotify ]] ;then
	start=1
	mpc -q stop
	rm -f $dirshm/{player-*,scrobble}
	touch $dirshm/player-spotify
	systemctl stop snapclient
	systemctl try-restart bluezdbus mpd shairport-sync upmpdcli &> /dev/null
fi
if [[ -e $fileexpire && $( cat $fileexpire ) -gt $( date +%s ) ]]; then
	token=$( cat $filetoken )
else
	. $dirsystem/spotify # base64client, refreshtoken
	token=$( curl -X POST https://accounts.spotify.com/api/token \
				-H "Authorization: Basic $base64client" \
				-d grant_type=refresh_token \
				-d refresh_token=$refreshtoken \
				| grep access_token \
				| cut -d'"' -f4 )
	[[ -z $token ]] && exit
	
	echo $(( $( date +%s ) + 3550 )) > $fileexpire # 10s before 3600s
	echo $token > $filetoken
fi
readarray -t status <<< $( curl -X GET https://api.spotify.com/v1/me/player/currently-playing \
							-H "Authorization: Bearer $token" \
							| jq '.item.album.name,
								.item.album.artists[0].name,
								.item.album.images[0].url,
								.is_playing,
								.item.duration_ms,
								.item.name,
								.progress_ms,
								.timestamp' ) # not -r to keep escaped characters
[[ ${status[3]} == true || -n $start ]] && state=play || state=pause
cat << EOF > $filestatus
, "Album"    : ${status[0]}
, "Artist"   : ${status[1]}
, "coverart" : ${status[2]}
, "file"     : ""
, "sampling" : "48 kHz 320 kbit/s &bull; Spotify"
, "state"    : "$state"
, "Time"     : $(( ( ${status[4]} + 500 ) / 1000 ))
, "Title"    : ${status[5]}
EOF
progress=${status[6]}
timestamp=${status[7]}
diff=$(( $( date +%s%3N ) - timestamp ))
cat << EOF > $filestate
elapsed=$(( ( progress + 500 ) / 1000 ))
start=$(( ( timestamp + diff - progress + 500 ) / 1000 ))
state=$state
EOF

$dirbash/cmd-pushstatus.sh
