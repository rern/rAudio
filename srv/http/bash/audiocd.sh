#!/bin/bash

. /srv/http/bash/common.sh

[[ -e $dirshm/eject ]] && exit

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
		audioCD && mpc -q stop
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
		[[ $1 == ejecticonclick ]] && eject && touch $dirshm/eject
		( sleep 3 && rm -f $dirshm/{audiocd,eject} ) &
	fi
	exit
	
fi

[[ $( mpc -f %file% playlist | grep -m1 ^cdda: ) ]] && exit

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
	query=$( curl -sfL "$server+query+$discdata&$options" | head -2 | tr -d '\r' ) # remove \r
	if [[ $? != 0 ]]; then
		notify audiocd 'Audio CD' 'CD database server not reachable.'
	else
		[[ $( head -c 3 <<< $query ) == 210 ]] && genre_id=$( awk 'NR==2 {print $1"+"$2}' <<< $query )
		[[ $genre_id ]] && data=$( curl -sfL "$server+read+$genre_id&$options" | grep '^.TITLE' | tr -d '\r' ) # remove \r
		if [[ $data ]]; then
			artist_album=$( sed -n '/^DTITLE/ {s/^DTITLE=//; s| / |^|; p}' <<< $data )
			readarray -t titles <<< $( tail -n +1 <<< $data | cut -d= -f2 )
			frames=( ${cddiscid[@]:2} )
			unset frames[-1]
			frames+=( $(( ${cddiscid[@]: -1} * 75 )) )
			framesL=${#frames[@]}
			for (( i=1; i < framesL; i++ )); do
				f0=${frames[$(( i - 1 ))]}
				f1=${frames[i]}
				time=$(( ( f1 - f0 ) / 75 )) # 75 frame/s
				tracks+="$artist_album^${titles[i]}^$time"$'\n'
			done
			echo "$tracks" > $diraudiocd/$discid
		fi
	fi
fi
# suppress playbackStatusGet in passive.js
if [[ -e $dirsystem/autoplay ]] && grep -q cd=true $dirsystem/autoplay.conf; then
	pushData playlist '{ "autoplaycd": 1 }'
fi
# add tracks to playlist
grep -q -m1 'audiocdplclear.*true' $dirsystem/display.json && mpc -q clear
! statePlay && trackcd=$(( $( mpc status %length% ) + 1 ))
notify audiocd 'Audio CD' 'Add tracks to Playlist ...'
trackL=${cddiscid[1]}
for i in $( seq 1 $trackL ); do
  mpc -q add cdda:///$i
done
echo $discid > $dirshm/audiocd
pushData playlist '{ "refresh": true }'
eject -x 4
# coverart
if [[ -e $diraudiocd/$discid ]]; then
	artist_album=$( head -1 $diraudiocd/$discid )
	artist=$( cut -d^ -f1 <<< $artist_album )
	album=$( cut -d^ -f2 <<< $artist_album )
	notify audiocd 'Audio CD' "$artist • $album"
	if [[ ! $( ls $diraudiocd/$discid.* 2> /dev/null ) ]]; then
		$dirbash/status-coverartonline.sh "cmd
$artist
$album
$discid
CMD ARTIST ALBUM DISCID" &> /dev/null &
	fi
fi
# set 1st track of cd
if [[ $trackcd ]]; then
	$dirbash/cmd.sh "mpcskip
$trackcd
play
CMD POS ACTION"
	[[ ! -e $dirsystem/autoplay ]] && mpc -q stop
fi
