#!/bin/bash

. /srv/http/bash/common.sh

[[ -e $dirshm/eject ]] && exit
# --------------------------------------------------------------------
if [[ $1 == on ]]; then
	notify audiocd 'Audio CD' 'USB CD On'
	touch $dirshm/audiocd
	ln -s $dirmpdconf/{conf/,}cdio.conf
	systemctl restart mpd
	pushRefresh player
	exit
# --------------------------------------------------------------------
fi
if [[ $1 == eject || $1 == off || $1 == ejecticonclick ]]; then # eject/off : remove tracks from playlist
	audioCDplClear
	if [[ $1 == off ]]; then
		notify audiocd 'Audio CD' 'USB CD Off'
		rm -f $dirmpdconf/cdio.conf
		systemctl restart mpd
		( sleep 3 && rm -f $dirshm/audiocd ) &
	else
		[[ $1 == ejecticonclick ]] && eject && touch $dirshm/eject
		( sleep 3 && rm -f $dirshm/eject ) &
	fi
	$dirbash/cmd.sh playlistpush
	pushStatus
	exit
# --------------------------------------------------------------------
fi
mpc -q playlist | grep -m1 ^cdda:// && exit # suppress 2nd udev event
# --------------------------------------------------------------------
discid=$( audiocd-meta )
[[ ! $discid ]] && notify audiocd 'Audio CD' 'Failed: Disc ID calculation.' && exit
# --------------------------------------------------------------------
! compgen -G $diraudiocd/$discid/cover.* && $dirbash/status-coverart.sh "cmd
$( head -2 $diraudiocd/$discid/data )
$discid
CMD ALBUM ARTIST DISCID" &> /dev/null &
# add tracks to playlist
notify audiocd 'Audio CD' 'Add to Playlist'
grep -q -m1 'audiocdplclear.*true' $dirsystem/display.json && mpc -q clear
[[ $( mpcState ) != play ]] && trackcd=$(( $( mpc status %length% ) + 1 ))
notify 'audiocd blink' 'Audio CD' 'Add to Playlist ...'
for i in $( seq 1 $trackL ); do
	tracklist+="cdda:///$i "
done
mpc -q add $tracklist
echo $discid > $dirshm/audiocd
eject -x 4
# set 1st track of cd as current
if [[ $trackcd ]]; then
	mpc -q play $trackcd
	mpc -q stop
fi
$dirbash/cmd.sh playlistpush
notify audiocd 'Audio CD' Ready
