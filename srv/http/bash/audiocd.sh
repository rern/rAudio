#!/bin/bash

. /srv/http/bash/common.sh

pushstreamPlaylist() {
	pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
}

[[ $1 ]] && pushstreamNotify 'Audio CD' "USB CD $1" audiocd

if [[ $1 == on ]]; then
	touch $dirshm/audiocd
	sed -i '/^decoder/ i\
input {\
	plugin         "cdio_paranoia"\
	speed          "12"\
}\
' /etc/mpd.conf
	systemctl restart mpd
	$dirsettings/player-data.sh pushrefresh
	exit
	
elif [[ $1 == eject || $1 == off || $1 == ejectwithicon ]]; then # eject/off : remove tracks from playlist
	tracks=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	if [[ $tracks ]]; then
		pushstreamNotify 'Audio CD' 'Removed from Playlist.' audiocd
		[[ $( mpc | head -c 4 ) == cdda ]] && mpc -q stop
		tracktop=$( echo "$tracks" | head -1 )
		mpc -q del $tracks
		if (( $tracktop > 1 )); then
			mpc -q play $(( tracktop - 1 ))
			mpc -q stop
		fi
		pushstreamPlaylist
	fi
	if [[ $1 == off ]]; then
		linecdio=$( sed -n '/cdio_paranoia/ =' /etc/mpd.conf )
		sed -i "$(( linecdio - 1 )),/^$/ d" /etc/mpd.conf
		systemctl restart mpd
		$dirsettings/player-data.sh pushrefresh
	elif [[ $1 == ejectwithicon ]]; then
		eject
	fi
	( sleep 3 && rm -f $dirshm/audiocd ) &> /dev/null &
	exit
	
fi

! : >/dev/tcp/8.8.8.8/53 || [[ $( mpc -f %file% playlist | grep ^cdda: ) ]] && exit

cddiscid=( $( cd-discid 2> /dev/null ) ) # ( id tracks leadinframe frame1 frame2 ... totalseconds )
if [[ ! $cddiscid ]]; then
	pushstreamNotify 'Audio CD' 'ID of CD not found in database.' audiocd
	exit
	
fi

discid=${cddiscid[0]}

if [[ ! -e $diraudiocd/$discid ]]; then
	pushstreamNotifyBlink 'Audio CD' 'Search CD data ...' audiocd
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
	if [[ $genre_id ]]; then
		pushstreamNotifyBlink 'Audio CD' 'Fetch CD data ...' audiocd
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
# suppress getPlaybackStatus in passive.js
if [[ -e $dirsystem/autoplaycd ]]; then
	autoplaycd=1
	pushstream playlist '{"autoplaycd":1}'
fi
# add tracks to playlist
grep -q 'audiocdplclear.*true' $dirsystem/display && mpc -q clear
pushstreamNotify 'Audio CD' 'Add tracks to Playlist ...' audiocd
trackL=${cddiscid[1]}
for i in $( seq 1 $trackL ); do
  mpc -q add cdda:///$i
done
echo $discid > $dirshm/audiocd
pushstreamPlaylist
eject -x 4

if [[ $autoplaycd ]]; then
	cdtrack1=$(( $( mpc playlist | wc -l ) - $trackL + 1 ))
	$dirbash/cmd.sh "mpcplayback
play
$cdtrack1"
fi

# coverart
if [[ ! $artist || ! $album ]]; then
	artist_album=$( head -1 $diraudiocd/$discid )
	artist=$( echo $artist_album | cut -d^ -f1 )
	album=$( echo $artist_album | cut -d^ -f2 )
fi
[[ ! $artist || ! $album ]] && exit

args="\
$artist
$album
audiocd
$discid"
$dirbash/status-coverartonline.sh "$args" &> /dev/null &
