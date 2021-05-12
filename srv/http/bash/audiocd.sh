#!/bin/bash

dirtmp=/srv/http/data/shm

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamNotify() {
	pushstream notify '{"title":"Audio CD", "text":"'"$1"'", "icon":"audiocd"}' # double quote "$1" needed
}
pushstreamPlaylist() {
	pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
	rm -f $dirtmp/flagpladd
}

[[ -n $1 ]] && pushstreamNotify "USB CD $1"

if [[ $1 == on ]]; then
	sed -i '/plugin.*"curl"/ {n;a\
input {\
	plugin         "cdio_paranoia"\
}
}' /etc/mpd.conf
	systemctl restart mpd
	pushstream refresh '{ "page": "player" }'
elif [[ $1 == eject || $1 == off ]]; then # eject/off : remove tracks from playlist
	rm -f $dirtmp/audiocd
	tracks=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	if [[ -n $tracks ]]; then
		pushstreamNotify 'Removed from Playlist.'
		[[ $( mpc | head -1 | cut -d: -f1 ) == cdda ]] && mpc stop
		tracktop=$( echo "$tracks" | head -1 )
		mpc del $tracks
		mpc play $(( tracktop - 1 ))
		mpc stop
		pushstreamPlaylist
	fi
	if [[ $1 == off ]]; then
		line=$( grep -n cdio_paranoia /etc/mpd.conf | cut -d: -f1 )
		from=$(( line - 1 ))
		to=$(( line + 1 ))
		sed -i "$from,$to d" /etc/mpd.conf
		systemctl restart mpd
		pushstream refresh '{ "page": "player" }'
	fi
fi

[[ -n $1 || ! -e /dev/sr0 ]] && exit

eject -x 0 /dev/sr0 # set max speed if supported by device
discid=$( cd-discid 2> /dev/null ) # id tracks leadinframe frame1 frame2 ... totalseconds
[[ -z $discid ]] && exit

discidata=( $discid )
tracksL=${discidata[1]}
id=${discidata[0]}

if [[ ! -e /srv/http/data/audiocd/$id ]]; then
	pushstreamNotify 'Search CD data ...'
	server='http://gnudb.gnudb.org/~cddb/cddb.cgi?cmd=cddb'
	options='hello=owner+rAudio+rAudio+1&proto=6'
	query=$( curl -sL "$server+query+${discid// /+}&$options" | head -2 | tr -d '\r' )
	code=$( echo "$query" | head -c 3 )
	if (( $code == 210 )); then  # exact match
	  genre_id=$( echo "$query" | sed -n 2p | cut -d' ' -f1,2 | tr ' ' + )
	elif (( $code == 200 )); then
	  genre_id=$( echo "$query" | cut -d' ' -f2,3 | tr ' ' + )
	fi
	if [[ -z $genre_id ]]; then
		pushstreamNotify 'CD data not found.'
	else
		pushstreamNotify 'Fetch CD data ...'
		data=$( curl -sL "$server+read+$genre_id&$options" | grep '^.TITLE' | tr -d '\r' ) # contains \r
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
pushstreamNotify 'Add tracks to Playlist ...'
for i in $( seq 1 $tracksL ); do
  mpc add cdda:///$i
done
echo $id > $dirtmp/audiocd
pushstreamPlaylist
eject -x 12 /dev/sr0 # set 12x speed if supported by device
