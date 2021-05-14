#!/bin/bash

dirtmp=/srv/http/data/shm
diraudiocd=/srv/http/data/audiocd

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamAudiocd() {
	pushstream audiocd '{"text":"'"$1"'","delay":'$2'}' # double quote "$1" needed
}
pushstreamPlaylist() {
	pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
	rm -f $dirtmp/flagpladd
}

if [[ $1 == data ]]; then
	artistalbum=$3
	discid=$2
	sed -i "s/\^/$artistalbum/" $diraudiocd/$discid
	pushstreamPlaylist
	exit
fi

[[ -n $1 ]] && pushstreamAudiocd "USB CD $1" 3000

if [[ $1 == on ]]; then
	sed -i '/plugin.*"curl"/ {n;a\
input {\
	plugin         "cdio_paranoia"\
}
}' /etc/mpd.conf
	systemctl restart mpd
	pushstream refresh '{ "page": "player" }'
	exit
elif [[ $1 == eject || $1 == off ]]; then # eject/off : remove tracks from playlist
	rm -f $dirtmp/audiocd
	tracks=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	if [[ -n $tracks ]]; then
		pushstreamAudiocd 'Removed from Playlist.' -1
		[[ $( mpc | head -c 4 ) == cdda ]] && mpc stop
		tracktop=$( echo "$tracks" | head -1 )
		mpc del $tracks
		if (( $tracktop > 1 )); then
			mpc play $(( tracktop - 1 ))
			mpc stop
		fi
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
	exit
fi

[[ -n $( mpc -f %file% playlist | grep ^cdda: ) ]] && exit

eject -x 0 /dev/sr0 # set max speed if supported by device
cddiscid=( $( cd-discid 2> /dev/null ) ) # ( id tracks leadinframe frame1 frame2 ... totalseconds )
[[ -z $cddiscid ]] && exit

discid=${cddiscid[0]}

if [[ ! -e $diraudiocd/$discid ]]; then
	pushstreamAudiocd 'Search CD data ...' -1
	server='http://gnudb.gnudb.org/~cddb/cddb.cgi?cmd=cddb'
	discdata=$( echo ${cddiscid[@]} | tr ' ' + )
	options='hello=owner+rAudio+rAudio+1&proto=6'
	query=$( curl -sL "$server+query+$discdata&$options" | head -2 | tr -d '\r' )
	code=$( echo "$query" | head -c 3 )
	if (( $code == 210 )); then  # exact match
	  genre_id=$( echo "$query" | sed -n 2p | cut -d' ' -f1,2 | tr ' ' + )
	elif (( $code == 200 )); then
	  genre_id=$( echo "$query" | cut -d' ' -f2,3 | tr ' ' + )
	fi
	if [[ -n $genre_id ]]; then
		pushstreamAudiocd 'Fetch CD data ...' -1
		data=$( curl -sL "$server+read+$genre_id&$options" | grep '^.TITLE' | tr -d '\r' ) # contains \r
		readarray -t artist_album <<< $( echo "$data" | grep '^DTITLE' | sed 's/^DTITLE=//; s| / |\n|' )
		artist=${artist_album[0]}
		album=${artist_album[1]}
		readarray -t titles <<< $( echo "$data" | tail -n +1 | cut -d= -f2 )
	fi
	frames=( ${cddiscid[@]:2} )
	unset 'frames[-1]'
	frames+=( $(( ${cddiscid[@]: -1} * 75 )) )
	framesL=${#frames[@]}
	for (( i=1; i < framesL; i++ )); do
		f0=${frames[$(( i - 1 ))]}
		f1=${frames[i]}
		time=$(( ( f1 - f0 ) / 75 ))$'\n'  # 75 frames/sec
		tracks+="$artist^$album^${titles[i]}^$time"
	done
	echo "$tracks" > $diraudiocd/$discid
fi
# add tracks to playlist
if [[ -e /srv/http/data/system/autoplaycd ]]; then
	autoplaycd=1
	pushstream audiocd '{"autoplaycd":1}'
fi
pushstreamAudiocd 'Add tracks to Playlist ...' 3000
trackL=${cddiscid[1]}
for i in $( seq 1 $trackL ); do
  mpc add cdda:///$i
done
echo $discid > $dirtmp/audiocd
pushstreamPlaylist
eject -x 12 /dev/sr0 # set 12x speed if supported by device

if [[ -n $autoplaycd ]]; then
	cdtrack1=$(( $( mpc playlist | wc -l ) - $trackL + 1 ))
	/srv/http/bash/cmd.sh "mpcplayback
play
$cdtrack1"
fi

if [[ -z $( head -1 $diraudiocd/$discid | cut -d^ -f1 ) ]]; then
	pushstream audiocd '{"discid":"'$discid'"}'
	exit
fi

# coverart
if [[ -z $( ls $diraudiocd/$discid.* 2> /dev/null ) ]]; then
	if [[ -z $artist ]]; then
		data=$( head -1 $diraudiocd/$discid )
		artist=$( echo $data | cut -d^ -f1 )
		album=$( echo $data | cut -d^ -f2 )
	fi
	args="\
$artist
$album
audiocd
$discid"
	/srv/http/bash/status-coverartonline.sh "$args" &> /dev/null &
fi
