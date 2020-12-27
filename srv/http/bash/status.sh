#!/bin/bash

dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm

btclient=$( [[ -e $dirtmp/btclient ]] && echo true || echo false )
relays=$( [[ -e $dirsystem/relays ]] && echo true || echo false )
relayson=$( [[ -e  $dirtmp/relaystimer ]] && echo true || echo false )
lcd=$( grep -q dtoverlay=tft35a /boot/config.txt && echo true || echo false )
player=$( ls $dirtmp/player-* 2> /dev/null | cut -d- -f2  )
volume=$( /srv/http/bash/cmd.sh volumeget )
[[ -z $player ]] && player=mpd && touch $dirtmp/player-mpd

########
status='
  "player"     : "'$player'"
, "webradio"   : false
, "btclient"   : '$btclient'
, "relays"     : '$relays'
, "relayson"   : '$relayson'
, "lcd"        : '$lcd'
, "volume"     : '$volume'
, "volumemute" : 0'

case $player in

airplay )
	path=$dirtmp/airplay
	for item in Artist Album coverart Title; do
		val=$( cat $path-$item 2> /dev/null )
		[[ -z $val ]] && continue
########
		status+=', "'$item'":"'${val//\"/\\\"}'"' # escape " for json - no need for ' : , [ {
	done
	start=$( cat $path-start 2> /dev/null )
	Time=$( cat $path-Time 2> /dev/null )
	if [[ -n $start && -n $Time ]]; then
		now=$( date +%s%3N )
		elapsed=$(( ( now - start + 500 ) / 1000 ))
	fi
	[[ -e $dirtmp/airplay-coverart.jpg ]] && coverart=/data/shm/airplay-coverart.$( date +%s ).jpg
########
	status+='
, "coverart"       : "'$coverart'"
, "elapsed"        : '$elapsed'
, "playlistlength" : 1
, "sampling"       : "16 bit 44.1 kHz 1.41 Mbit/s • AirPlay"
, "state"          : "play"
, "Time"           : '$Time
# >>>>>>>>>>
	echo {$status}
	exit
	;;
bluetooth )
########
	status+=$( /srv/http/bash/status-bluetooth.sh )
# >>>>>>>>>>
	echo {$status}
	exit
	;;
snapclient )
	[[ -e $dirsystem/snapserverpw ]] && snapserverpw=$( cat $dirsystem/snapserverpw ) || snapserverpw=rune
	snapserverip=$( cat $dirtmp/snapserverip )
########
	status+='
, "snapserverip" : "'$snapserverip'"
, "snapserverpw" : "'$snapserverpw'"'
# >>>>>>>>>>
	echo {$status}
	exit
	;;
spotify )
	file=$dirtmp/spotify
	elapsed=$( cat $file-elapsed 2> /dev/null || echo 0 )
	state=$( cat $file-state )
	if [[ $state == play ]]; then
		start=$( cat $file-start )
		now=$( date +%s%3N )
		elapsed=$(( now - start + elapsed ))
		time=$( sed 's/.*"Time"\s*:\s*\(.*\)\s*,\s*"Title".*/\1/' < $file )
		if (( $elapsed > $(( time * 1000 )) )); then
			elapsed=0
			echo 0 > $file-elapsed
		fi
	fi
	elapsed=$(( ( elapsed + 500 ) / 1000 ))
########
	status+=$( cat $file )
########
	status+='
, "elapsed" : '$elapsed'
, "state"   : "'$state'"'
# >>>>>>>>>>
	echo {$status}
	exit
	;;
	
esac

filter='^Album\|^Artist\|^audio\|^bitrate\|^consume\|^duration\|^elapsed\|^file\|^Name\|^playlistlength\|'
filter+='^random\|^repeat\|^single\|^song:\|^state\|^Time\|^Title\|^updating_db'
card=$( head -1 /etc/asound.conf | cut -d' ' -f2 )
hwmixer=$( sed -n "/^\s*device.*hw:$card/,/mixer_control/ p" /etc/mpd.conf \
			| grep mixer_control \
			| cut -d'"' -f2 )
[[ -z $hwmixer ]] && filter+='\|^volume'

mpdStatus() {
	mpdtelnet=$( { echo clearerror; echo status; echo $1; sleep 0.05; } \
		| telnet 127.0.0.1 6600 2> /dev/null \
		| grep "$filter" )
}
mpdStatus currentsong
[[ $? != 0 ]] && exit

# when playlist is empty, add song without play - currentsong = (blank)
! grep -q '^file' <<< "$mpdtelnet" && mpdStatus 'playlistinfo 0'
# webradio track changed events - one missed state data
! grep -q '^state' <<< "$mpdtelnet" && mpdStatus currentsong

readarray -t lines <<< "$mpdtelnet"
for line in "${lines[@]}"; do
	key=${line/:*}
	val=${line#*: }
	case $key in
		audio )
			data=( ${val//:/ } )
			samplerate=${data[0]}
			bitdepth=${data[1]}
			;;
		bitrate )
			bitrate=$(( val * 1000 ));;
		# true/false
		consume | random | repeat | single )
			[[ $val == 1 ]] && tf=true || tf=false
########
			status+='
, "'$key'" : '$tf
			;;
		# number
		duration | elapsed | playlistlength | song | Time | volume )
			printf -v $key '%s' $val;; # value of $key as "var name" - value of $val as "var value"
		# string - escaped name
		Album | AlbumArtist | Artist | Name | Title )
			printf -v $key '%s' "${val//\"/\\\"}";; # escape " for json
		file )
			file0=$val             # no escape " for coverart and ffprobe
			file=${val//\"/\\\"};; # escape " for json
		# string
		* ) # state | updating_db
			printf -v $key '%s' "$val"
	esac
done

[[ -z $elapsed ]] && elapsed=false || elapsed=$( printf '%.0f\n' $elapsed )
[[ -e $dirsystem/librandom ]] && librandom=true || librandom=false
[[ -z $playlistlength ]] && playlistlength=0
[[ -z $song ]] && song=false
[[ -z $Time ]] && Time=false
[[ -e $dirsystem/updating ]] && updating_db=true || updating_db=false
[[ -z $volume ]] && volume=false
counts=$( cat /srv/http/data/mpd/counts 2> /dev/null || echo false )
playlists=$( ls /srv/http/data/playlists | wc -l )
volumemute=$( cat $dirsystem/volumemute 2> /dev/null || echo 0 )
########
status+='
, "elapsed"        : '$elapsed'
, "file"           : "'$file'"
, "hwmixer"        : "'$hwmixer'"
, "playlistlength" : '$playlistlength'
, "song"           : '$song'
, "state"          : "'$state'"
, "updating_db"    : '$updating_db'
, "volume"         : '$volume'
, "counts"         : '$counts'
, "librandom"      : '$librandom'
, "playlists"      : '$playlists'
, "volumemute"     : '$volumemute

if (( $playlistlength  == 0 )); then
########
	status+='
, "coverart" : ""'
# >>>>>>>>>>
	echo {$status}
	exit
fi

if [[ ${file:0:4} == http ]]; then
	gatewaynet=$( ip route | awk '/default/ {print $3}' | cut -d. -f1-2 )
	urlnet=$( echo $file | sed 's|.*//\(.*\):.*|\1|' | cut -d. -f1-2 )
	if systemctl -q is-active upmpdcli && [[ $gatewaynet == $urlnet ]]; then # internal ip
		ext=UPnP
		duration=$( printf '%.0f\n' $duration )
########
		status+='
, "Album"  : "'$Album'"
, "Artist" : "'$Artist'"
, "Time"   : "'$duration'"
, "Title"  : "'$Title'"'
	else
		ext=Radio
		# before webradios play: no 'Name:' - use station name from file instead
		urlname=${file//\//|}
		radiofile=/srv/http/data/webradios/$urlname
		radiodata=$( cat $radiofile )
		stationname=$( sed -n 1p <<< "$radiodata" )
		[[ $state == stop ]] && titlename=
		[[ $Name != $stationname ]] && albumname=$Name || albumname=$file 
		if [[ $state == play ]]; then
			albumname=$stationname
			readarray -t radioname <<< "$( sed 's/\s*$//; s/ - \|: /\n/g' <<< "$Title" )"
			artistname=${radioname[0]}
			titlename=${radioname[1]}
		else
			artistname=$stationname
		fi
########
		status=$( sed '/^, "webradio".*/ d' <<< "$status" )
		status+='
, "Album"    : "'$albumname'"
, "Artist"   : "'$artistname'"
, "Name"     : "'$Name'"
, "Time"     : false
, "Title"    : "'$titlename'"
, "webradio" : 'true
		systemctl start radiowatchdog
	fi
else
	ext=${file/*.}
	ext=${ext^^}
	position="$(( song + 1 ))/$playlistlength &bull; "
	# missing id3tags
	[[ -z $Album ]] && Album=
	[[ -z $Artist ]] && Artist=$AlbumArtist
	[[ -z $Artist ]] && dirname=${file%\/*} && Artist=${dirname/*\/}
	[[ -z $Title ]] && filename=${file/*\/} && Title=${filename%.*}
########
	status+='
, "Album"  : "'$Album'"
, "Artist" : "'$Artist'"
, "Time"   : '$Time'
, "Title"  : "'$Title'"'
	systemctl stop radiowatchdog
fi

samplingLine() {
	bitdepth=$1
	samplerate=$2
	bitrate=$3
	ext=$4
	
	[[ $bitrate -eq 0 || -z $bitrate ]] && bitrate=$(( bitdepth * samplerate * 2 ))
	if (( $bitrate < 1000000 )); then
		rate="$(( bitrate / 1000 )) kbit/s"
	else
		[[ $bitdepth == dsd ]] && bitrate=$(( bitrate / 2 ))
		rate="$( awk "BEGIN { printf \"%.2f\n\", $bitrate / 1000000 }" ) Mbit/s"
	fi
	
	if [[ $bitdepth == dsd ]]; then
			sampling="${samplerate^^} &bull; $rate"
	else
		if [[ $bitdepth == 'N/A' ]]; then # lossy has no bitdepth
			[[ $ext == WAV || $ext == AIFF ]] && bit="$(( bitrate / samplerate / 2 )) bit"
		else
			[[ -n $bitdepth && $ext != MP3 ]] && bit="$bitdepth bit"
		fi
		sample="$( awk "BEGIN { printf \"%.1f\n\", $samplerate / 1000 }" ) kHz"
		sampling="$bit $sample $rate"
		[[ $ext != Radio && $ext != UPnP ]] && sampling+=" &bull; $ext"
	fi
}

if [[ $state != stop ]]; then
	[[ $ext == DSF || $ext == DFF ]] && bitdepth=dsd
	# save only webradio: update sampling database on each play
	if [[ $ext != Radio ]]; then
		samplingLine $bitdepth $samplerate $bitrate $ext
	else
		if [[ -n $bitrate && $bitrate != 0 ]]; then
			samplingLine $bitdepth $samplerate $bitrate $ext
			echo $stationname$'\n'$sampling > $radiofile
		else
			sampling=$( sed -n 2p <<< "$radiodata" )
		fi
	fi
else
	if [[ $ext == Radio ]]; then
		sampling=$( sed -n 2p <<< "$radiodata" )
	else
		if [[ $ext == DSF || $ext == DFF ]]; then
			# DSF: byte# 56+4 ? DSF: byte# 60+4
			[[ $ext == DSF ]] && byte=56 || byte=60;
			hex=( $( hexdump -x -s$byte -n4 "/mnt/MPD/$file" | head -1 | tr -s ' ' ) )
			dsd=$(( ${hex[1]} / 1100 * 64 )) # hex byte#57-58 - @1100:dsd64
			bitrate=$( awk "BEGIN { printf \"%.2f\n\", $dsd * 44100 / 1000000 }" )
			sampling="DSD$dsd • $bitrate Mbit/s &bull; $ext"
		else
			data=( $( ffprobe -v quiet -select_streams a:0 \
				-show_entries stream=bits_per_raw_sample,sample_rate \
				-show_entries format=bit_rate \
				-of default=noprint_wrappers=1:nokey=1 \
				"/mnt/MPD/$file0" ) )
			samplerate=${data[0]}
			bitdepth=${data[1]}
			bitrate=${data[2]}
			samplingLine $bitdepth $samplerate $bitrate $ext
		fi
	fi
fi
########
status+='
, "sampling" : "'$position$sampling'"'

if grep -q '"cover": false,' /srv/http/data/system/display; then
########
	status+='
, "coverartradio" : ""'
# >>>>>>>>>>
	echo {$status}
	exit
fi

# coverart
if [[ $ext == Radio || -e $dirtmp/webradio ]]; then # webradio start - 'file:' missing
	rm -f $dirtmp/webradio
	date=$( date +%s )
	filenoext=/data/webradiosimg/$urlname
	pathnoext=/srv/http$filenoext
	if [[ -e $pathnoext.gif ]]; then
		coverartradio=$filenoext.$date.gif
	elif [[ -e $pathnoext.jpg ]]; then
		coverartradio=$filenoext.$date.jpg
	fi
########
	status+='
, "coverartradio" : "'$coverartradio'"'
	if [[ $state == play && -n $Title ]]; then
		# $Title          Artist Name - Title Name or Artist Name: Title Name (extra tag)
		# /\s*$\| (.*$//  remove trailing sapces and extra ( tag )
		# / - \|: /\n/    split artist - title
		# args:           "Artist Name"$'\n'"Title Name"$'\ntitle'
		data=$( sed 's/\s*$\| (.*$//; s/ - \|: /\n/g' <<< "$Title" )
		name=$( echo $data | tr -d ' "`?/#&'"'" )
		onlinefile=$( ls $dirtmp/online-$name.* 2> /dev/null )
		if [[ -e $onlinefile ]]; then
			coverart=/data/shm/online-$name.$date.${onlinefile/*.}
		else
			killall status-coverartonline.sh &> /dev/null # new track - kill if still running
			if [[ $file0 =~ radioparadise.com ]]; then
				/srv/http/bash/status-coverartonline.sh "$data"$'\n'$file0 &> /dev/null &
			else
				/srv/http/bash/status-coverartonline.sh "$data"$'\ntitle' &> /dev/null &
			fi
		fi
	else
		rm -f $dirtmp/online-*
	fi
else
	args="\
$file0
$Artist
$Album"
	coverart=$( /srv/http/bash/status-coverart.sh "$args" ) # no escape needed
fi
########
status+='
, "coverart" : "'$coverart'"'
# >>>>>>>>>>
echo {$status}
