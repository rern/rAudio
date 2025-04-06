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
	$dirbash/status-push.sh
	exit
# --------------------------------------------------------------------
fi
mpc -q playlist | grep -m1 ^cdda:// && exit # suppress 2nd udev event
# --------------------------------------------------------------------
cddiscid=( $( cd-discid 2> /dev/null ) ) # ( discid total_tracks offset0(lead-in) offset1(track1) ... total_seconds(last track) )
if [[ ! $cddiscid ]]; then
	notify audiocd 'Audio CD' 'CD contains no tracks length'
	exit
# --------------------------------------------------------------------
fi
discid=${cddiscid[0]}
trackL=${cddiscid[1]} # also = offset last index (offsets: +1 lead-in)

cdData() {
	local artist f0 f1 offset time title tracks va
	offset=( ${cddiscid[@]:2} )                           # offset - frame end
	offset[trackL]=$(( ${offset[trackL]} * 75 ))          # last - seconds > frames 1:75
	(( $( grep -c ' / ' <<< ${titles[@]} ) > 1 )) && va=1 # title=ARTIST / TITLE format more than 1 track
	for (( i=0; i < trackL; i++ )); do                    # ${offset[0]} - lead-in
		f0=${offset[i]}
		f1=${offset[i+1]}
		time=$(( ( f1 - f0 + 37 ) / 75 ))                 # frames > seconds 75:1 (+37 round to nearest)
		title=${titles[i]}
		if [[ $va && $title == *' / '* ]]; then
			artist=${title/ \/ *}
			title=${title/* \/ }
		fi
		tracks+="$artist^$album^$title^$time"$'\n'
	done
	echo -n "$tracks" > $diraudiocd/$discid
}

grep -qs -m1 '\^^^' $diraudiocd/$discid && rm $diraudiocd/$discid # remove bad data

if [[ ! -e $diraudiocd/$discid ]]; then # gnudb
	server='https://gnudb.gnudb.org/~cddb/cddb.cgi?cmd=cddb'
	discdata=$( tr ' ' + <<< ${cddiscid[@]} )
	options='hello=owner+rAudio+rAudio+1&proto=6'
	notify 'audiocd blink' 'Audio CD' 'Fetch CD data ...'
	query=$( curl -sfL "$server+query+$discdata&$options" | tr -d '\r' ) # remove \r
	if [[ $? == 0 ]]; then
# 210 Found exact matches, list follows (until terminating `.')
# GENRE0 DISCID ARTIST / ALBUM
# GENRE1 DISCID ARTIST / ALBUM
		#[[ $( head -c 3 <<< $query ) == 210 ]] && genre_id=$( awk 'NR==2 {print $1"+"$2}' <<< $query )
		#[[ $genre_id ]] && data=$( curl -sfL "$server+read+$genre_id&$options" | grep '^.TITLE' | tr -d '\r' ) # remove \r
		[[ $( head -c 3 <<< $query ) == 210 ]] && genre_id=$( awk 'NR==2 {print $1"/"$2}' <<< $query )
		[[ $genre_id ]] && data=$( curl -sfL "https://gnudb.org/gnudb/$genre_id" \
									| grep '^.TITLE' \
									| tr -d '\r' ) # remove \r
		if [[ $data ]]; then
# DTITLE=ARTIST / ALBUM
# TTITLE0=TITLE1
# TTITLE1=TITLE2
# ...
			artist_album=$( sed -n '/^DTITLE/ {s/^DTITLE=//; p}' <<< $data )
			artist=${artist_album/ \/ *}
			album=${artist_album/* \/ }
			readarray -t titles <<< $( grep -v ^D <<< $data | cut -d= -f2 )
			cdData
		fi
	fi
fi
if [[ ! -e $diraudiocd/$discid ]]; then # cd-info
	cdinfo=$( cd-info )
	if [[ ! $cdinfo ]]; then
		notify audiocd 'Audio CD' 'CD data not found.'
	else
		readarray -t msf <<< $( awk '/^CD-ROM Track List/,/^Media Catalog Number/ {print $2}' <<< $cdinfo \
									| grep ^[0-9] \
									| sed -E 's/:0/:/g; s/^0//; s/:/ /g' ) # mm:ss:fr
# Disc mode is listed as: CD-DA
# CD-ROM Track List (1 - 20)
# #: MSF       LSN    Type   Green? Copy? Channels Premphasis?
# 1: 00:02:00  000000 audio  false  no    2        no
# 2: 04:46:46  021346 audio  false  no    2        no
# ...
# CD-TEXT for Disc:
	# TITLE: ALBUM
	# PERFORMER: ARTIST
	# DISC_ID: DISCID
# ...
# CD-TEXT for Track  1:
	# TITLE: TITLE1
# CD-TEXT for Track  2:
	# TITLE: TITLE2
	# PERFORMER: ARTIST
#...
		discdata=$( sed -n '/^CD-TEXT for Disc/,/^\s*DISC_ID:/ {s/^\s*//; p}' <<< $cdinfo )
		artist=$( grep ^PERFORMER <<< $discdata | cut -d' ' -f2- )
		album=$( grep ^TITLE <<< $discdata | cut -d' ' -f2- )
		lines=$( sed -n '/^CD-TEXT for Track/,$ {s/^\s*//; p}' <<< $cdinfo | tail +2 )
		lines+='
CD-TEXT-'
		while read line; do
			if [[ $line == TITLE:* ]]; then
				t=$( sed 's/^TITLE: //' <<< $line )
			elif [[ $line == CD-TEXT* ]]; then
				titles+=( "$t" )
				t=
			fi
		done <<< $lines
		cdData
	fi
fi
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
if [[ ! $album ]]; then
	line=$( head -1 $diraudiocd/$discid )
	artist=${line/^*}
	album=$( cut -d^ -f2 <<< $line )
fi
$dirbash/status-coverartonline.sh "cmd
$artist
$album
$discid
CMD ARTIST ALBUM DISCID" &
