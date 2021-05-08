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
discid=$( cd-discid | tr ' ' + )
query=$( curl -s "$server+query+$discid&$options" | head -2 )
code=$( echo "$query" | head -1 | cut -d' ' -f1 )
if (( $code == 210 )); then  # exact match
  genre_id=$( echo "$query" | tail -1 | cut -d' ' -f1,2 | tr ' ' + )
elif (( $code == 200 )); then
  genre_id=$( echo "$query" | tail -1 | cut -d' ' -f2,3 | tr ' ' + )
fi
if [[ -n $genre_id ]]; then
	data=$( curl -s "$server+read+$genre_id&$options" | sed 's/\r//' ) # contains \r
	artist_album=$( echo "$data" | grep '^DTITLE' | sed 's/^DTITLE=//; s| / |^|' )
	echo ${artist_album/^*} > $dirtmp/audiocd-artist
	echo ${artist_album/*^} > $dirtmp/audiocd-album
	echo "$data" | grep '^TTITLE' | cut -d= -f2- > $dirtmp/audiocd-title
	readarray -t frames <<< $( echo"$data" | awk '/^#\s+[0-9]+/ {print $NF}' )
	framesL=${#frames[@]}
	for (( i=1; i < framesL; i++ )); do
		f0=${frames[$(( i - 1 ))]}
		f1=${frames[i]}
		time+=$(( ( f1 - f0 ) / 75 ))$'\n'  # 75 frames/sec
	done
	echo "$time" > $dirtmp/audiocd-time
fi
# add tracks to playlist
tracks=$( cdparanoia -sQ |& grep -P '^\s+\d+\.' | wc -l )
for i in $( seq 1 $tracks ); do
  mpc add cdda:///$i
done

# remove tracks - audiocd.sh stop
