#!/bin/bash

if [[ $1 == eject ]]; then # remove tracks from playlist
	tracks=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	for i in $tracks; do
	  mpc del $i
	done
	rm -f /srv/http/data/shm/audiocd
	exit
fi

server='http://gnudb.gnudb.org/~cddb/cddb.cgi?cmd=cddb'
options='hello=owner+rAudio+rAudio+1&proto=6'
discid=$( cd-discid )
discidata=( $discid )
tracksL=${discidata[1]}
query=$( curl -s "$server+query+${discid// /+}&$options" | head -2 )
code=$( echo "$query" | head -1 | cut -d' ' -f1 )
if (( $code == 210 )); then  # exact match
  genre_id=$( echo "$query" | tail -1 | cut -d' ' -f1,2 | tr ' ' + )
elif (( $code == 200 )); then
  genre_id=$( echo "$query" | cut -d' ' -f2,3 | tr ' ' + )
fi
if [[ -n $genre_id ]]; then
	data=$( curl -s "$server+read+$genre_id&$options" | grep '^.TITLE' | tr -d '\r' ) # contains \r
	artist_album=$( echo "$data" | grep '^DTITLE' | sed 's/^DTITLE=//; s| / |^|' )
	readarray -t titles <<< $( echo "$data" | tail -n +2 | cut -d= -f2 )
	frames=( ${discidata[@]:2:$tracksL} )  # id 
	for (( i=1; i < tracksL; i++ )); do
		f0=${frames[$(( i - 1 ))]}
		f1=${frames[i]}
		time=$(( ( f1 - f0 ) / 75 ))$'\n'  # 75 frames/sec
		tracks+="$artist_album^${titles[i]}^$time"
	done
	echo "$tracks" > /srv/http/data/shm/audiocd
fi
# add tracks to playlist
for i in $( seq 1 $tracksL ); do
  mpc add cdda:///$i
done
