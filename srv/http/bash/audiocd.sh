#!/bin/bash

[[ -e /dev/shm/eject ]] && exit

. /srv/http/bash/common.sh

notifyCD() {
	notify 'audiocd blink' 'Audio CD' "$1" -1
}

# --------------------------------------------------------------------
if [[ $1 == on ]]; then
	touch $dirshm/audiocd
	ln -s $dirmpdconf/{conf/,}cdio.conf
	systemctl restart mpd
	notify audiocd 'USB Drive' On
	pushRefresh player
	exit
# --------------------------------------------------------------------
fi
if [[ $1 == eject || $1 == ejecticonclick || $1 == off ]]; then # eject/off : remove tracks from playlist
	if [[ $1 == off ]]; then
		audioCDplClear
		rm -f $dirmpdconf/cdio.conf
		systemctl restart mpd
		( sleep 3 && rm -f $dirshm/audiocd ) &
		pushRefresh player
		notify audiocd 'USB Drive' Off
	else
		[[ $1 == ejecticonclick ]] && eject
		touch $dirshm/eject
		( sleep 3 && rm -f $dirshm/eject ) &
		audioCDplClear
	fi
	pushStatus
	exit
# --------------------------------------------------------------------
fi
mpc playlist | grep -q ^cdda && exit # debounce udev change
# --------------------------------------------------------------------
ready=$( timeout 0.1 cd-paranoia -Q 2>&1 )
grep -q '^++ WARN: .* No medium found' <<< $ready && exit
# --------------------------------------------------------------------
notifyCD 'Fetch data ...'

[[ $( mpcState ) != play ]] && trackcd=$(( $( mpc status %length% ) + 1 ))
trackL=$( audiocd-meta -t )
for i in $( seq 1 $trackL ); do # add tracks to playlist
	tracklist+="cdda:///$i "
done
mpc -q add $tracklist
eject -x 4 # set max speed

discid=$( audiocd-meta )
echo $discid > $dirshm/audiocd
if [[ $discid ]]; then
	readarray -t album_artist < <( head -2 $diraudiocd/$discid/data )
	album=${album_artist[0]}
	artist=${album_artist[1]}
	! compgen -G $diraudiocd/$discid/cover.* > /dev/null && $dirbash/status-coverart.sh "cmd
$album
$artist
$discid
CMD ALBUM ARTIST DISCID" &> /dev/null &
fi
# set 1st track of cd as current
if [[ $trackcd ]]; then
	mpc -q play $trackcd
	mpc -q stop
fi
$dirbash/cmd.sh playlistpush
