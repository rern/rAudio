#!/bin/bash

# file mode
#    - initial page load / refresh > status.sh
#    - changes                     > mpdidle.sh > cmd-pushstatus.sh
# radioparadize - update stream every 5s > status-radioparadise.sh
# radiofrance   - no stream update       > radiofrance.service > status-radiofrance.sh

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm
date=$( date +%s )

btclient=$( [[ -e $dirtmp/btclient ]] && echo true || echo false )
consume=$( mpc | grep -q 'consume: on' && echo true || echo false )
counts=$( cat /srv/http/data/mpd/counts 2> /dev/null || echo false )
[[ -z $counts ]] && counts=false # fix - sometime blank on startup
librandom=$( [[ -e $dirsystem/librandom ]] && echo true || echo false )
player=$( ls $dirtmp/player-* 2> /dev/null | cut -d- -f2  )
[[ -z $player ]] && player=mpd && touch $dirtmp/player-mpd
playlistlength=$( mpc playlist | wc -l | tee $dirtmp/playlistlength ) # save for add webradio by other apps
playlists=$( ls /srv/http/data/playlists | wc -l )
relays=$( [[ -e $dirsystem/relays ]] && echo true || echo false )
relayson=$( [[ -e  $dirtmp/relaystimer ]] && echo true || echo false )
updateaddons=$( [[ -e /srv/http/data/addons/update ]] && echo true || echo false )
if [[ -e $dirsystem/updating ]]; then 
	updating_db=true
	if ! mpc | grep -q ^Updating; then
		path=$( cat $dirsystem/updating )
		[[ $path == rescan ]] && mpc -q rescan || mpc -q update "$path"
	fi
else
	updating_db=false
fi
if [[ -e $dirtmp/nosound ]]; then
	volume=false
else
	controlvolume=$( $dirbash/cmd.sh volumecontrolget )
	control=$( echo $controlvolume | cut -d^ -f1 )
	volume=$( echo $controlvolume | cut -d^ -f2 )
fi

if [[ $1 == snapserverstatus ]]; then
########
	status=
else
########
	status='
  "player"         : "'$player'"
, "btclient"       : '$btclient'
, "consume"        : '$consume'
, "control"        : "'$control'"
, "counts"         : '$counts'
, "librandom"      : '$librandom'
, "playlistlength" : '$playlistlength'
, "playlists"      : '$playlists'
, "relays"         : '$relays'
, "relayson"       : '$relayson'
, "updateaddons"   : '$updateaddons'
, "updating_db"    : '$updating_db'
, "volume"         : '$volume'
, "volumemute"     : 0
, "webradio"       : false'
fi

if [[ $player != mpd && $player != upnp ]]; then
	case $player in

	airplay )
		path=$dirtmp/airplay
		for item in Artist Album coverart Title; do
			val=$( cat $path-$item 2> /dev/null )
			[[ -z $val ]] && continue
	########
			status+=', "'$item'":"'${val//\"/\\\"}'"' # escape " for json - no need for ' : , [ {
		done
		start=$( cat $path-start 2> /dev/null || echo 0 )
		Time=$( cat $path-Time 2> /dev/null || echo false )
		now=$( date +%s%3N )
		if [[ -n $start && -n $Time ]]; then
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
	, "Time"           : '$Time'
	, "timestamp"      : '$now
		;;
	bluetooth )
	########
		status+=$( $dirbash/status-bluetooth.sh )
		;;
	snapclient )
		[[ -e $dirsystem/snapserverpw ]] && snapserverpw=$( cat $dirsystem/snapserverpw ) || snapserverpw=ros
		snapserverip=$( cat $dirtmp/snapserverip 2> /dev/null )
		snapserverstatus+=$( sshpass -p "$snapserverpw" ssh -q root@$snapserverip $dirbash/status.sh snapserverstatus \
								| sed 's|"coverart" : "|&http://'$snapserverip'/|' )
	########
		status+=${snapserverstatus:1:-1}
		;;
	spotify )
		file=$dirtmp/spotify
		elapsed=$( cat $file-elapsed 2> /dev/null || echo 0 )
		state=$( cat $file-state )
		now=$( date +%s%3N )
		if [[ $state == play ]]; then
			start=$( cat $file-start )
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
		status+='
	, "elapsed"   : '$elapsed'
	, "state"     : "'$state'"
	, "timestamp" : '$now
		;;
		
	esac
# >>>>>>>>>>
	echo {$status}
	systemctl stop radiofrance
	rm -f $dirtmp/webradiodata
	touch $dirtmp/stop
	exit
fi

filter='^Album\|^Artist\|^audio\|^bitrate\|^duration\|^elapsed\|^file\|^Name\|^random\|^repeat\|^single\|^song:\|^state\|^Time\|^Title'
mpdStatus() {
	mpdtelnet=$( { echo clearerror; echo status; echo $1; sleep 0.05; } \
		| telnet 127.0.0.1 6600 2> /dev/null \
		| grep "$filter" )
}
mpdStatus currentsong

# 'file:' missing / blank
#   - when playlist is empty, add song without play
#     - 'currentsong' has no data
#     - use 'playlistinfo 0' instead
#   - webradio start - blank 'file:' (in case 1 sec delay from cmd.sh not enough)
! grep -q '^file: .\+' <<< "$mpdtelnet" && mpdStatus 'playlistinfo 0'
# 'state:' - missing on webradio track change
grep -q '^state' <<< "$mpdtelnet" || mpdStatus currentsong

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
		random | repeat | single )
			[[ $val == 1 ]] && tf=true || tf=false
########
			status+='
, "'$key'" : '$tf
			;;
		# number
		duration | elapsed | song | Time )
			printf -v $key '%s' $val;; # value of $key as "var name" - value of $val as "var value"
		# string - escaped name
		Album | AlbumArtist | Artist | Name | Title )
			printf -v $key '%s' "${val//\"/\\\"}";; # escape " for json
		file )
			file0=$val           # no escape " for coverart and ffprobe
			file=${val//\"/\\\"};; # escape " for json
		# string
		* ) # state | updating_db
			printf -v $key '%s' "$val";;
	esac
done

[[ -z $elapsed ]] && elapsed=false || elapsed=$( printf '%.0f\n' $elapsed )
[[ -z $song ]] && song=false
[[ -z $Time ]] && Time=false
volumemute=$( cat $dirsystem/volumemute 2> /dev/null || echo 0 )
########
status+='
, "elapsed"     : '$elapsed'
, "file"        : "'$file'"
, "song"        : '$song'
, "state"       : "'$state'"
, "timestamp"   : '$( date +%s%3N )'
, "volumemute"  : '$volumemute

if (( $playlistlength  == 0 )); then
	ip=$( ifconfig | grep inet.*broadcast | head -1 | awk '{print $2}' )
	[[ -n $ip ]] && hostname=$( avahi-resolve -a4 $ip | awk '{print $NF}' )
########
	status+='
, "coverart" : ""
, "hostname" : "'$hostname'"
, "ip"       : "'$ip'"'
# >>>>>>>>>>
	echo {$status}
	exit
fi
fileheader=${file:0:4}
if [[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]]; then
	radioheader=1
else
	systemctl stop radiofrance
	rm -f $dirtmp/webradiodata
fi
if [[ $fileheader == cdda ]]; then
	ext=CD
	discid=$( cat $dirtmp/audiocd 2> /dev/null )
	if [[ -n $discid && -e /srv/http/data/audiocd/$discid ]]; then
		track=${file/*\/}
		readarray -t audiocd <<< $( sed -n ${track}p /srv/http/data/audiocd/$discid | tr ^ '\n' )
		Artist=${audiocd[0]}
		Album=${audiocd[1]}
		Title=${audiocd[2]}
		Time=${audiocd[3]}
		coverfile=$( ls /srv/http/data/audiocd/$discid.* 2> /dev/null | head -1 )
		[[ -n $coverfile ]] && coverart=/data/audiocd/$discid.$( date +%s ).${coverfile/*.}
	else
		[[ $state == stop ]] && Time=0
	fi
		status+='
, "Album"     : "'$Album'"
, "Artist"    : "'$Artist'"
, "discid"    : "'$discid'"
, "Time"      : '$Time'
, "Title"     : "'$Title'"'
elif [[ -n $radioheader ]]; then
	if [[ $player == upnp ]]; then # internal ip
		ext=UPnP
		systemctl stop radiofrance
		rm -f $dirtmp/webradiodata
		[[ -n $duration ]] && duration=$( printf '%.0f\n' $duration )
########
		status+='
, "Album"  : "'$Album'"
, "Artist" : "'$Artist'"
, "Time"   : "'$duration'"
, "Title"  : "'$Title'"'
		# fetched coverart
		covername=$( echo $Artist$Album | tr -d ' "`?/#&'"'" )
		onlinefile=$( ls $dirtmp/online-$covername.* 2> /dev/null | head -1 )
		[[ -n $onlinefile ]] && coverart=/data/shm/online-$covername.$date.${onlinefile/*.}
	else
		ext=Radio
		# before webradios play: no 'Name:' - use station name from file instead
		urlname=${file//\//|}
		radiofile=/srv/http/data/webradios/$urlname
		if [[ -e "$radiofile" ]]; then
			radiodata=$( cat $radiofile )
			station=$( sed -n 1p <<< "$radiodata" )
			radiosampling=$( sed -n 2p <<< "$radiodata" )
		fi
		if [[ $state != play ]]; then
			Title=
			systemctl stop radiofrance
			rm -f $dirtmp/webradiodata
		elif [[ -e $dirtmp/stop ]]; then # on start - previous Title still exists
			rm $dirtmp/stop
			Title=
		else
			if [[ $( dirname $file ) == 'http://stream.radioparadise.com' ]]; then
				radioparadise=1
			elif [[ $( dirname $file ) == 'https://icecast.radiofrance.fr' ]]; then
				radiofrance=1
			fi
			if [[ -z $radiofrance ]]; then
				systemctl stop radiofrance
			fi
			if [[ -n $radioparadise || -n $radiofrance ]]; then
				if [[ -e $dirtmp/webradiodata ]]; then
					readarray -t radiodata <<< $( cat $dirtmp/webradiodata )
					Artist=${radiodata[0]}
					Title=${radiodata[1]}
					Album=${radiodata[2]}
					coverart=${radiodata[3]}
					station=${station/* - }
				fi
				if [[ -n $radioparadise ]]; then
					$dirbash/status-radioparadise.sh $file "$station" &> /dev/null &
				elif [[ -n $radiofrance && ! -e $dirtmp/radiofrance ]]; then
					echo $file > $dirtmp/radiofrance
					systemctl start radiofrance
				fi
			elif [[ -n $Title ]]; then
				# $Title - 's/ - \|: /\n/' split Artist - Title
				#  - Artist - Title (extra tag)
				#  - Artist: Title (extra tag)
				readarray -t radioname <<< $( echo $Title | sed 's/ - \|: /\n/g' )
				Artist=${radioname[0]}
				Title=${radioname[1]}
				# fetched coverart
				Title=$( echo $Title | sed 's/ (.*$//' ) # remove ' (extra tag)' for coverart search
				covername=$( echo $Artist$Title | tr -d ' "`?/#&'"'" )
				webradiofile=$( ls $dirtmp/webradio-$covername.* 2> /dev/null | head -1 )
				if [[ -n $webradiofile ]]; then
					coverart=/data/shm/webradio-$covername.$date.${webradiofile: -3}
					Album=$( cat $dirtmp/webradio-$covername 2> /dev/null )
				fi
			fi
		fi
		filenoext=/data/webradiosimg/$urlname
		pathnoext=/srv/http$filenoext
		if [[ -e $pathnoext.gif ]]; then
			coverartradio=$filenoext.$date.gif
		elif [[ -e $pathnoext.jpg ]]; then
			coverartradio=$filenoext.$date.jpg
		fi
########
		status+='
, "Album"         : "'$Album'"
, "Artist"        : "'$Artist'"
, "coverartradio" : "'$coverartradio'"
, "Name"          : "'$Name'"
, "station"       : "'$station'"
, "Time"          : false
, "Title"         : "'$Title'"
, "webradio"      : true'
	fi
else
	ext=${file/*.}
	if [[ ${ext:0:9} == cue/track ]]; then
		cuefile=$( dirname "$file" )
		cuesrc=$( grep ^FILE "/mnt/MPD/$cuefile" | head -1 | sed 's/FILE "\|" WAVE.*//g' )
		ext=${cuesrc/*.}
	fi
	ext=${ext^^}
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
fi

[[ -z $radioparadise && -z $radiofrance ]] && rm -f $dirtmp/webradiodata

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
		[[ $bitdepth == 'N/A' && ( $ext == WAV || $ext == AIFF ) ]] && bitdepth=$(( bitrate / samplerate / 2 ))
		sample="$( awk "BEGIN { printf \"%.1f\n\", $samplerate / 1000 }" ) kHz"
		if [[ -n $bitdepth && $ext != Radio && $ext != MP3 && $ext != AAC ]]; then
			sampling="$bitdepth bit $sample $rate"
		else # lossy has no bitdepth
			sampling="$sample $rate"
		fi
	fi
	[[ $ext != Radio && $ext != UPnP ]] && sampling+=" &bull; $ext"
}

if [[ $ext == CD ]]; then
	sampling='16 bit 44.1 kHz 1.41 Mbit/s &bull; CD'
elif [[ $state != stop ]]; then
	[[ $ext == DSF || $ext == DFF ]] && bitdepth=dsd
	# save only webradio: update sampling database on each play
	if [[ $ext != Radio ]]; then
		samplingLine $bitdepth $samplerate $bitrate $ext
	else
		if [[ -n $bitrate && $bitrate != 0 ]]; then
			samplingLine $bitdepth $samplerate $bitrate $ext
			[[ -e $radiofile ]] && echo $station$'\n'$sampling > $radiofile
		else
			sampling=$radiosampling
		fi
	fi
else
	if [[ $ext != Radio ]]; then
		if [[ $ext == DSF || $ext == DFF ]]; then
			# DSF: byte# 56+4 ? DSF: byte# 60+4
			[[ $ext == DSF ]] && byte=56 || byte=60;
			[[ -n $cuesrc ]] && file="$( dirname "$cuefile" )/$cuesrc"
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
	else
		sampling=$radiosampling
	fi
fi

########
pos="$(( song + 1 ))/$playlistlength"
[[ -n $sampling ]] && sampling="$pos &bull; $sampling" || sampling=$pos
status+='
, "ext"      : "'$ext'"
, "sampling" : "'$sampling'"
, "coverart" : ""'

[[ -e $dirsystem/vumeter ]] && vumeter=1
[[ -e $dirsystem/vuled ]] && vuled=1
if [[ -n $vumeter || -n $vuled ]]; then
# >>>>>>>>>>
	[[ -n $vumeter ]] && echo {$status}
	if [[ $state == play ]]; then
		if ! pgrep cava &> /dev/null; then
			killall cava &> /dev/null
			cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
		fi
	else
		killall cava &> /dev/null
		curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":0}'
		if [[ -n $vuled ]]; then
			p=$( cat /srv/http/data/system/vuledpins )
			for i in $p; do
				echo 0 > /sys/class/gpio/gpio$i/value
			done
		fi
	fi
	[[ -n $vumeter ]] && exit
fi

if grep -q '"cover": false' $dirsystem/display; then
# >>>>>>>>>>
	echo {$status}
	exit
fi

if [[ $ext != CD && -z $radioheader ]]; then
	coverart=$( $dirbash/status-coverart.sh "\
$Artist
$Album
$file0" )
elif [[ $state == play && -z $coverart && -n $Artist ]]; then
	if [[ -n $radioheader ]]; then
		[[ -n $Title ]] && args="\
$Artist
$Title
webradio"
	else
		[[ -n $Album ]] && args="\
$Artist
$Album"
	fi
fi
########
status+='
, "coverart" : "'$coverart'"'
# >>>>>>>>>>
echo {$status}

[[ -z $args ]] && exit

killall status-coverartonline.sh &> /dev/null # new track - kill if still running
$dirbash/status-coverartonline.sh "$args" &> /dev/null &
