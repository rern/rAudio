#!/bin/bash

# spotifyd.conf > this:
#    - spotifyd 'onevent' hook
# env var: ($PLAYER_EVENT still not consistent - used for detect emitted events only)
# $PLAYER_EVENT: load/preload/change/start/play/pause/volumeset
# $TRACK_ID
# $PLAY_REQUEST_ID
# $POSITION_MS
# $DURATION_MS
# $VOLUME

. /srv/http/bash/common.sh

##### start
if ! playerActive spotify; then
	echo spotify > $dirshm/player
	$dirbash/cmd.sh playerstart
	exit
# --------------------------------------------------------------------
fi
[[ $PLAYER_EVENT == volumeset ]] && volumeGet push

dirspotify=$dirshm/spotify
for key in elapsed expire start state status token; do # var fileKEY=$dirspotify/KEY
	printf -v file$key '%s' $dirspotify/$key
done
# token
if [[ -e $fileexpire && $( < $fileexpire ) > $( date +%s ) ]]; then
	token=$( < $filetoken )
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
# --------------------------------------------------------------------
	fi
	echo $token > $filetoken
	echo $(( $( date +%s ) + 3550 )) > $fileexpire # 10s before 3600s
fi
# data
readarray -t status <<< $( curl -s -X GET https://api.spotify.com/v1/me/player/currently-playing \
							-H "Authorization: Bearer $token" \
							| jq '.item.album.name,
								.item.artists[0].name,
								.item.album.images[0].url,
								.is_playing,
								.item.duration_ms,
								.item.name,
								.progress_ms,
								.timestamp' ) # not -r: 1-to keep escaped characters 2-already quoted
[[ ${status[3]} == true ]] && state=play || state=pause
Time=$(( ( ${status[4]} + 500 ) / 1000 ))
cat << EOF > $filestatus
, "Album"    : ${status[0]}
, "Artist"   : ${status[1]}
, "coverart" : ${status[2]}
, "sampling" : "48 kHz 320 kbit/s • Spotify"
, "state"    : "$state"
, "Time"     : $Time
, "Title"    : ${status[5]}
EOF
progress=${status[6]}
timestamp=${status[7]}
diff=$(( $( date +%s%3N ) - timestamp ))
elapsed=$(( ( progress + 500 ) / 1000 ))
start=$(( ( timestamp + diff - progress + 500 ) / 1000 ))
cat << EOF > $filestate
elapsed=$elapsed
start=$start
state=$state
Time=$Time
EOF

$dirbash/status-push.sh
