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
notify 'audiocd blink' 'Audio CD' 'Fetch data ...' -1
discid=$( audiocd-meta )
if [[ $discid ]]; then
	readarray -t album_artist < <( head -2 $diraudiocd/$discid/data )
	album=${album_artist[0]}
	artist=${album_artist[1]}
	! compgen -G $diraudiocd/$discid/cover.* && $dirbash/status-coverart.sh "cmd
	$album
	$artist
	$discid
	CMD ALBUM ARTIST DISCID" &> /dev/null &
	notify 'audiocd blink' 'Audio CD' "$artist - $album"
else
	notify 'audiocd blink' 'Audio CD' 'Add to Playlist ...'
fi
grep -q -m1 'audiocdplclear.*true' $dirsystem/display.json && mpc -q clear
# add tracks to playlist
[[ $( mpcState ) != play ]] && trackcd=$(( $( mpc status %length% ) + 1 ))
trackL=$(( $( wc -l < $diraudiocd/$discid/data ) - 2 ))
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
