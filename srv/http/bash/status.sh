#!/bin/bash

dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm
date=$( date +%s )

btclient=$( [[ -e $dirtmp/btclient ]] && echo true || echo false )
consume=$( mpc | grep -q 'consume: on' && echo true || echo false )
counts=$( cat /srv/http/data/mpd/counts 2> /dev/null || echo false )
[[ -z $counts ]] && counts=false # fix - sometime blank on startup
lcd=$( grep -q dtoverlay=tft35a /boot/config.txt 2> /dev/null && echo true || echo false )
librandom=$( [[ -e $dirsystem/librandom ]] && echo true || echo false )
player=$( ls $dirtmp/player-* 2> /dev/null | cut -d- -f2  )
playlistlength=$( mpc playlist | wc -l | tee $dirtmp/playlistlength ) # save for add webradio by other apps
playlists=$( ls /srv/http/data/playlists | wc -l )
relays=$( [[ -e $dirsystem/relays ]] && echo true || echo false )
relayson=$( [[ -e  $dirtmp/relaystimer ]] && echo true || echo false )
updateaddons=$( [[ -e /srv/http/data/addons/update ]] && echo true || echo false )
if [[ -e $dirtmp/nosound ]]; then
	volume=false
else
	controlvolume=$( /srv/http/bash/cmd.sh volumecontrolget )
	control=$( echo $controlvolume | cut -d^ -f1 )
	volume=$( echo $controlvolume | cut -d^ -f2 )
fi

[[ -z $player ]] && player=mpd && touch $dirtmp/player-mpd

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
, "lcd"            : '$lcd'
, "librandom"      : '$librandom'
, "playlistlength" : '$playlistlength'
, "playlists"      : '$playlists'
, "relays"         : '$relays'
, "relayson"       : '$relayson'
, "updateaddons"   : '$updateaddons'
, "volume"         : '$volume'
, "volumemute"     : 0
, "webradio"       : false'
fi

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
# >>>>>>>>>>
	echo {$status}
	;;
bluetooth )
########
	status+=$( /srv/http/bash/status-bluetooth.sh )
# >>>>>>>>>>
	echo {$status}
	;;
snapclient )
	[[ -e $dirsystem/snapserverpw ]] && snapserverpw=$( cat $dirsystem/snapserverpw ) || snapserverpw=ros
	snapserverip=$( cat $dirtmp/snapserverip 2> /dev/null )
	snapserverstatus+=$( sshpass -p "$snapserverpw" ssh -q root@$snapserverip /srv/http/bash/status.sh snapserverstatus \
							| sed 's|"coverart" : "|&http://'$snapserverip'/|' )
########
	status+=${snapserverstatus:1:-1}
# >>>>>>>>>>
	echo {$status}
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
# >>>>>>>>>>
	echo {$status}
	;;
	
esac

killall status-radiofrance.sh &> /dev/null
[[ $player != mpd ]] && rm -f $dirtmp/radiometa && exit

filter='^Album\|^Artist\|^audio\|^bitrate\|^duration\|^elapsed\|^file\|^Name\|^playlistlength\|'
filter+='^random\|^repeat\|^single\|^song:\|^state\|^Time\|^Title\|^updating_db'

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
if ! grep -q '^file: .\+' <<< "$mpdtelnet"; then
	if grep -q '^playlistlength: 1$' <<< "$mpdtelnet"; then
		mpdStatus 'playlistinfo 0'
	else
		mpdStatus currentsong
	fi
fi
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
			file=${val//\"/\\\"} # escape " for json
			file=${file/\?*};;   # remove url trailing '?...'
		# string
		* ) # state | updating_db
			printf -v $key '%s' "$val"
	esac
done

[[ -z $elapsed ]] && elapsed=false || elapsed=$( printf '%.0f\n' $elapsed )
[[ -z $song ]] && song=false
[[ -z $Time ]] && Time=false
mpc | grep -q ^Updating && updating_db=true || updating_db=false
volumemute=$( cat $dirsystem/volumemute 2> /dev/null || echo 0 )
########
status+='
, "elapsed"     : '$elapsed'
, "file"        : "'$file'"
, "song"        : '$song'
, "state"       : "'$state'"
, "timestamp"   : '$( date +%s%3N )'
, "updating_db" : '$updating_db'
, "volumemute"  : '$volumemute

if (( $playlistlength  == 0 )); then
########
	status+='
, "coverart" : ""'
# >>>>>>>>>>
	echo {$status}
	exit
fi

fileheader=${file:0:4}
if [[ $fileheader == cdda ]]; then
	ext=CD
	discid=$( cat $dirtmp/audiocd )
	if [[ -e /srv/http/data/audiocd/$discid ]]; then
		track=${file/*\/}
		readarray -t audiocd <<< $( sed -n ${track}p /srv/http/data/audiocd/$discid | tr ^ '\n' )
		Artist=${audiocd[0]}
		Album=${audiocd[1]}
		Title=${audiocd[2]}
		Time=${audiocd[3]}
		status+='
, "Album"     : "'$Album'"
, "Artist"    : "'$Artist'"
, "discid"    : "'$discid'"
, "Time"      : '$Time'
, "Title"     : "'$Title'"'
		coverfile=$( ls /srv/http/data/audiocd/$discid.* 2> /dev/null )
		[[ -e $coverfile ]] && coverart=/data/audiocd/$discid.$( date +%s ).${coverfile/*.}
	fi
elif [[ $fileheader == http ]]; then
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
		# fetched coverart
		covername=$( echo $Artist$Album | tr -d ' "`?/#&'"'" )
		fetchedfile=$( ls $dirtmp/online-$covername.* 2> /dev/null )
		[[ -e $fetchedfile ]] && coverart=/data/shm/online-$covername.$date.${fetchedfile/*.}
	else
		ext=Radio
		# before webradios play: no 'Name:' - use station name from file instead
		urlname=${file//\//|}
		radiofile=/srv/http/data/webradios/$urlname
		if [[ -e "$radiofile" ]]; then
			radiodata=$( cat $radiofile )
			stationname=$( sed -n 1p <<< "$radiodata" )
			radiosampling=$( sed -n 2p <<< "$radiodata" )
		else
			stationname=$file
		fi
		if [[ $state == play ]]; then
			[[ $( dirname $file ) == 'http://stream.radioparadise.com' ]] && radioparadise=1
			[[ $( dirname $file ) == 'https://icecast.radiofrance.fr' ]] && radiofrance=1
			if [[ -n $radioparadise || -n $radiofrance ]]; then
				if [[ -e $dirtmp/radiometa ]]; then
					readarray -t radiometa <<< $( cat $dirtmp/radiometa )
					Artist=${radiometa[0]}
					Title=${radiometa[1]}
					Album=${radiometa[2]}
					coverart=${radiometa[3]}
					[[ -n $Album ]] && albumname=$Album || albumname=$stationname
					artistname=$Artist
					titlename=$Title
					station=${stationname/* - }
				fi
				if [[ -n $radioparadise ]]; then
					/srv/http/bash/status-radioparadise.sh $file "$stationname" &> /dev/null &
				elif [[ -n $radiofrance ]]; then
					/srv/http/bash/status-radiofrance.sh $file "$stationname" &> /dev/null &
				fi
			elif [[ -n $Title ]]; then
				# $Title - 's/ - \|: /\n/' split Artist - Title
				#  - Artist - Title (extra tag)
				#  - Artist: Title (extra tag)
				readarray -t radioname <<< $( echo $Title | sed 's/ - \|: /\n/g' )
				Artist=${radioname[0]}
				Title=${radioname[1]}
				artistname=$Artist
				titlename=$Title
				albumname=$stationname
				# fetched coverart
				Title=$( echo $Title | sed 's/ (.*$//' ) # remove ' (extra tag)' for coverart search
				covername=$( echo $Artist$Title | tr -d ' "`?/#&'"'" )
				fetchedfile=$( ls $dirtmp/online-$covername.* 2> /dev/null )
				[[ -e $fetchedfile ]] && coverart=/data/shm/online-$covername.$date.${fetchedfile/*.}
			else
				artistname=$stationname
				titlename=
				albumname=$file
			fi
		else
			[[ -e "$radiofile" ]] && artistname=$stationname
			titlename=
			albumname=$file
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
, "Album"         : "'$albumname'"
, "Artist"        : "'$artistname'"
, "coverartradio" : "'$coverartradio'"
, "Name"          : "'$Name'"
, "station"       : "'$station'"
, "Time"          : false
, "Title"         : "'$titlename'"
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

[[ -z $radioparadise && -z $radiofrance ]] && rm -f $dirtmp/radiometa

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
		if [[ $bitdepth == 'N/A' ]]; then
			[[ $ext == WAV || $ext == AIFF ]] && bit="$(( bitrate / samplerate / 2 )) bit"
		elif [[ $ext == Radio && ${file/*.} != flac ]]; then # only flac has bitdepth
			bit=
		elif [[ -n $bitdepth && $ext != MP3 && $ext != aac ]]; then # lossy has no bitdepth
			bit="$bitdepth bit"
		fi
		sample="$( awk "BEGIN { printf \"%.1f\n\", $samplerate / 1000 }" ) kHz"
		sampling="$bit $sample $rate"
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
			[[ -e $radiofile ]] && echo $stationname$'\n'$sampling > $radiofile
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

if [[ $fileheader != cdda && $fileheader != http ]] && grep -q '"cover": true,' /srv/http/data/system/display; then
	coverart=$( /srv/http/bash/status-coverart.sh "$file0
$Artist
$Album" )
fi
########
sampling="$(( song + 1 ))/$playlistlength &bull; $sampling"
status+='
, "coverart" : "'$coverart'"
, "sampling" : "'$sampling'"'
# >>>>>>>>>>
echo {$status}

[[ -n $coverart && $fileheader != cdda && $fileheader != http ]] && exit

if [[ $ext == Radio ]]; then
	[[ $state != play || -z $Artist || -z $Title ]] && exit
	
	args="\
$Artist
$Title
title"
elif [[ -n $Artist && -n $Album ]]; then
	args="\
$Artist
$Album"
	[[ $ext == CD ]] && args+="
audiocd
$discid"
fi
if [[ -n $args ]]; then
	killall status-coverartonline.sh &> /dev/null # new track - kill if still running
	/srv/http/bash/status-coverartonline.sh "$args" &> /dev/null &
fi
