#!/bin/bash

dirtmp=/srv/http/data/shm

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamNotify() {
	pushstream notify '{"title":"Audio CD", "text":"'"$1"'", "icon":"list-ul", "delay":-1}' # double quote "$1" needed
}
pushstreamPlaylist() {
	pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
	rm -f $dirtmp/flagpladd
}

if [[ $1 == eject ]]; then # remove tracks from playlist
	mpc stop
	mpc del $( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	rm -f $dirtmp/audiocd
	pushstreamPlaylist
	exit
fi

discid=$( cd-discid ) # id tracks leadinframe frame1 frame2 ... totalseconds
discidata=( $discid )
tracksL=${discidata[1]}
id=${discidata[0]}

chmod +r /dev/sr0 # fix permission

if [[ ! -e /srv/http/data/audiocd/$id ]]; then
	pushstreamNotify 'Get data ...'
	server='http://gnudb.gnudb.org/~cddb/cddb.cgi?cmd=cddb'
	options='hello=owner+rAudio+rAudio+1&proto=6'
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
		readarray -t titles <<< $( echo "$data" | tail -n +1 | cut -d= -f2 )
		frames=( ${discidata[@]:2} )
		unset 'frames[-1]'
		frames+=( $(( ${discidata[@]: -1} * 75 )) )
		framesL=${#frames[@]}
		for (( i=1; i < framesL; i++ )); do
			f0=${frames[$(( i - 1 ))]}
			f1=${frames[i]}
			time=$(( ( f1 - f0 ) / 75 ))$'\n'  # 75 frames/sec
			tracks+="$artist_album^${titles[i]}^$time"
		done
		echo "$tracks" > /srv/http/data/audiocd/$id
	fi
fi
# add tracks to playlist
pushstreamNotify 'Add to Playlist ...'
for i in $( seq 1 $tracksL ); do
  mpc add cdda:///$i
done
echo $id > $dirtmp/audiocd
pushstreamPlaylist
