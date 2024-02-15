#!/bin/bash

. /srv/http/bash/common.sh

[[ $1 ]] && notify audiocd 'Audio CD' "USB CD $1"

if [[ $1 == on ]]; then
	touch $dirshm/audiocd
	ln -s $dirmpdconf/{conf/,}cdio.conf
	systemctl restart mpd
	$dirsettings/player-data.sh pushrefresh
	exit
	
elif [[ $1 == eject || $1 == off || $1 == ejecticonclick ]]; then # eject/off : remove tracks from playlist
	tracks=$( mpc -f %file%^%position% playlist | grep ^cdda: | cut -d^ -f2 )
	if [[ $tracks ]]; then
		notify audiocd 'Audio CD' 'Removed from Playlist.'
		[[ $( mpc | head -c 4 ) == cdda ]] && mpc -q stop
		tracktop=$( head -1 <<< $tracks )
		mpc -q del $tracks
		if (( $tracktop > 1 )); then
			mpc -q play $(( tracktop - 1 ))
			mpc -q stop
		fi
		pushData playlist '{ "refresh": true }'
	fi
	if [[ $1 == off ]]; then
		rm -f $dirshm/audiocd $dirmpdconf/cdio.conf
		systemctl restart mpd
		$dirsettings/player-data.sh pushrefresh
	else
		[[ $1 == ejecticonclick ]] && eject
		( sleep 3 && rm -f $dirshm/audiocd ) &> /dev/null &
	fi
	exit
	
fi

[[ $( mpc -f %file% playlist | grep ^cdda: ) ]] && exit

cddiscid=( $( cd-discid 2> /dev/null ) ) # ( id tracks leadinframe frame1 frame2 ... totalseconds )
if [[ ! $cddiscid ]]; then
	notify audiocd 'Audio CD' 'ID of CD not found in database.'
	exit
	
fi

discid=${cddiscid[0]}

if [[ ! -e $diraudiocd/$discid ]]; then
	notify 'audiocd blink' 'Audio CD' 'Search CD data ...'
	server='https://gnudb.gnudb.org/~cddb/cddb.cgi?cmd=cddb'
	discdata=$( tr ' ' + <<< ${cddiscid[@]} )
	options='hello=owner+rAudio+rAudio+1&proto=6'
	notify 'audiocd blink' 'Audio CD' 'Fetch CD data ...'
	query=$( curl -sfL "$server+query+$discdata&$options" | head -2 | tr -d '\r' ) # contains \r
	[[ $? != 0 ]] && notify audiocd 'Audio CD' 'Server not reachable.' && exit
	
	[[ $( head -c 3 <<< $query ) == 210 ]] && genre_id=$( awk 'NR==2 {print $1"+"$2}' <<< $query )
	if [[ $genre_id ]]; then
		data=$( curl -sfL "$server+read+$genre_id&$options" | grep '^.TITLE' | tr -d '\r' ) # contains \r
		readarray -t artist_album <<< $( sed -n '/^DTITLE/ {s/^DTITLE=//; s| / |\n|; p}' <<< $data )
		artist=${artist_album[0]}
		album=${artist_album[1]}
		readarray -t titles <<< $( tail -n +1 <<< $data | cut -d= -f2 )
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
# suppress laybackStatusGet in passive.js
if [[ -e $dirsystem/autoplay ]] && grep -q cd=true $dirsystem/autoplay.conf; then
	autoplaycd=1
	pushData playlist '{ "autoplaycd": 1 }'
fi
# add tracks to playlist
grep -q -m1 'audiocdplclear.*true' $dirsystem/display.json && mpc -q clear
notify audiocd 'Audio CD' 'Add tracks to Playlist ...'
trackL=${cddiscid[1]}
for i in $( seq 1 $trackL ); do
  mpc -q add cdda:///$i
done
echo $discid > $dirshm/audiocd
pushData playlist '{ "refresh": true }'
eject -x 4

if [[ $autoplaycd ]]; then
	cdtrack1=$(( $( mpc status %length% ) - $trackL + 1 ))
	$dirbash/cmd.sh "mpcplayback
play
$cdtrack1
CMD ACTION POS"
fi

# coverart
if [[ ! $artist || ! $album ]]; then
	artist_album=$( head -1 $diraudiocd/$discid )
	artist=${artist_album/^*}
	album=${artist_album/*^}
fi
[[ ! $artist || ! $album ]] && exit

$dirbash/status-coverartonline.sh "cmd
$artist
$album
$discid
CMD ARTIST ALBUM DISCID" &> /dev/null &
