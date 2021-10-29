#!/bin/bash

# file mode
# initial page load / refresh > status.sh
# changes:
#    - mpdidle.sh > cmd-pushstatus.sh
#    - radioparadize / radiofrance - no stream update - status-radio.sh

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirshm=/srv/http/data/shm
date=$( date +%s )

outputStatus() { # sed - null > false
	echo {$status} \
		| sed  's/:\s*,/: false,/g
				s/:\s*}/: false }/g
				s/\[\s*,/[ false,/g
				s/,\s*,/, false,/g
				s/,\s*]/, false ]/g'
}

if (( $# != 0 )); then # snapclient
	player=mpd
########
	status='
  "player" : "snapclient"
, "icon"   : "snapclient"'
else
	btclient=$( [[ -e $dirshm/btclient ]] && echo true )
	consume=$( mpc | grep -q 'consume: on' && echo true )
	counts=$( cat /srv/http/data/mpd/counts 2> /dev/null )
	librandom=$( [[ -e $dirsystem/librandom ]] && echo true )
	player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
	[[ -z $player ]] && player=mpd && touch $dirshm/player-mpd
	[[ $player != mpd ]] && icon=$player
	playlists=$( ls /srv/http/data/playlists | wc -l )
	relays=$( [[ -e $dirsystem/relays ]] && echo true )
	relayson=$( [[ -e  $dirshm/relayson ]] && echo true )
	updateaddons=$( [[ -e /srv/http/data/addons/update ]] && echo true )
	if [[ -e $dirsystem/updating ]]; then 
		updating_db=true
		if ! mpc | grep -q ^Updating; then
			path=$( cat $dirsystem/updating )
			[[ $path == rescan ]] && mpc -q rescan || mpc -q update "$path"
		fi
	fi
	if [[ -e $dirshm/nosound ]]; then
		volume=false
	elif [[ -e $dirshm/btclient ]]; then
		for i in {1..5}; do # takes some seconds to be ready
			volume=$( mpc volume | cut -d: -f2 | tr -d ' %n/a' )
			[[ -n $volume ]] && break
			sleep 1
		done
	else
		controlvolume=$( $dirbash/cmd.sh volumecontrolget )
		control=$( echo $controlvolume | cut -d^ -f1 )
		volume=$( echo $controlvolume | cut -d^ -f2 )
	fi
	scrobble=$( [[ -e $dirsystem/scrobble ]] && echo true )

########
	status='
  "player"         : "'$player'"
, "btclient"       : '$btclient'
, "consume"        : '$consume'
, "control"        : "'$control'"
, "counts"         : '$counts'
, "file"           : ""
, "icon"           : "'$icon'"
, "librandom"      : '$librandom'
, "playlists"      : '$playlists'
, "relays"         : '$relays'
, "relayson"       : '$relayson'
, "scrobble"       : '$scrobble'
, "stream"         : false
, "updateaddons"   : '$updateaddons'
, "updating_db"    : '$updating_db'
, "volume"         : '$volume'
, "volumemute"     : 0
, "webradio"       : false'
fi

if [[ $player != mpd && $player != upnp ]]; then
	case $player in

	airplay )
		dirairplay=$dirshm/airplay
		start=$( cat $dirairplay/start 2> /dev/null || echo 0 )
		Time=$( cat $dirairplay/Time 2> /dev/null )
		timestamp=$( date +%s%3N )
		[[ -n $start && -n $Time ]] && elapsed=$( printf '%.0f' $(( ( timestamp - start + 500 ) / 1000 )) )
		[[ -e $dirshm/airplay/coverart.jpg ]] && coverart=/data/shm/airplay/coverart.$( date +%s ).jpg
########
		status+='
, "Album"     : "'$( cat $dirairplay/Album 2> /dev/null )'"
, "Artist"    : "'$( cat $dirairplay/Artist 2> /dev/null )'"
, "Title"     : "'$( cat $dirairplay/Title 2> /dev/null )'"
, "coverart"  : "'$coverart'"
, "elapsed"   : '$elapsed'
, "sampling"  : "16 bit 44.1 kHz 1.41 Mbit/s • AirPlay"
, "state"     : "play"
, "Time"      : '$Time'
, "timestamp" : '$timestamp
		;;
	bluetooth )
########
		status+="
$( $dirbash/status-bluetooth.sh )"
		;;
	snapclient )
		[[ -e $dirsystem/snapserverpw ]] && snapserverpw=$( cat $dirsystem/snapserverpw ) || snapserverpw=ros
		snapserverip=$( cat $dirshm/snapserverip 2> /dev/null )
########
		status+="
$( sshpass -p "$snapserverpw" ssh -q root@$snapserverip $dirbash/status.sh snapclient \
	| sed 's|"coverart" : "|&http://'$snapserverip'/|; s/^{\|}$//g' )"
		;;
	spotify )
		dirspotify=$dirshm/spotify
		elapsed=$( cat $dirspotify/elapsed 2> /dev/null || echo 0 )
		state=$( cat $dirspotify/state )
		timestamp=$( date +%s%3N )
		[[ $state == play ]] && elapsed+=$(( timestamp - $( cat $dirspotify/start ) ))
		elapsed=$( printf '%.0f' $(( ( elapsed + 500 ) / 1000 )) )
########
		status+="
, $( cat $dirspotify/status )"
	status+='
, "elapsed"   : '$elapsed'
, "state"     : "'$state'"
, "timestamp" : '$timestamp
		;;
		
	esac
# >>>>>>>>>>
	outputStatus
	exit
fi

(( $( grep '"cover".*true\|"vumeter".*false' $dirsystem/display | wc -l ) == 2 )) && displaycover=1

filter='^Album\|^AlbumArtist\|^Artist\|^audio\|^bitrate\|^duration\|^file\|^Name\|^song:\|^state\|^Time\|^Title'
(( $# == 0 )) && filter='\|^playlistlength\|^random\|^repeat\|^single' # not snapclient
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
			[[ $val == 1 ]] && tf=true
########
			status+='
, "'$key'" : '$tf
			;;
		# number
		duration | playlistlength | song | Time )
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

[[ -z $playlistlength ]] && playlistlength=$( mpc playlist | wc -l )
volumemute=$( cat $dirsystem/volumemute 2> /dev/null || echo 0 )
########
status+='
, "file"           : "'$file'"
, "playlistlength" : '$playlistlength'
, "song"           : '$song'
, "state"          : "'$state'"
, "timestamp"      : '$( date +%s%3N )'
, "volumemute"     : '$volumemute

if (( $playlistlength  == 0 )); then
	ip=$( ifconfig | grep inet.*broadcast | head -1 | awk '{print $2}' )
	[[ -n $ip ]] && hostname=$( avahi-resolve -a4 $ip | awk '{print $NF}' )
########
	status+='
, "coverart" : ""
, "hostname" : "'$hostname'"
, "ip"       : "'$ip'"'
# >>>>>>>>>>
	outputStatus
	exit
fi
fileheader=${file:0:4}
if [[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]]; then
	stream=1
########
	status+='
, "stream" : true'
fi
if [[ $fileheader == cdda ]]; then
	ext=CD
	icon=audiocd
	discid=$( cat $dirshm/audiocd 2> /dev/null )
	if [[ -n $discid && -e /srv/http/data/audiocd/$discid ]]; then
		track=${file/*\/}
		readarray -t audiocd <<< $( sed -n ${track}p /srv/http/data/audiocd/$discid | tr ^ '\n' )
		Artist=${audiocd[0]}
		Album=${audiocd[1]}
		Title=${audiocd[2]}
		Time=${audiocd[3]}
		if [[ -n $displaycover ]]; then
			coverfile=$( ls /srv/http/data/audiocd/$discid.* 2> /dev/null | head -1 )
			[[ -n $coverfile ]] && coverart=/data/audiocd/$discid.$( date +%s ).${coverfile/*.}
		fi
	else
		[[ $state == stop ]] && Time=0
	fi
########
		status+='
, "Album"  : "'$Album'"
, "Artist" : "'$Artist'"
, "discid" : "'$discid'"
, "Time"   : '$Time'
, "Title"  : "'$Title'"'
elif [[ -n $stream ]]; then
	if [[ $player == upnp ]]; then # internal ip
		ext=UPnP
		[[ -n $duration ]] && duration=$( printf '%.0f\n' $duration )
########
		status+='
, "Album"  : "'$Album'"
, "Artist" : "'$Artist'"
, "Time"   : "'$duration'"
, "Title"  : "'$Title'"'
		# fetched coverart
		if [[ -n $displaycover ]]; then
			covername=$( echo $Artist$Album | tr -d ' "`?/#&'"'" )
			onlinefile=$( ls $dirshm/online-$covername.* 2> /dev/null | head -1 )
			[[ -n $onlinefile ]] && coverart=/data/shm/online-$covername.$date.${onlinefile/*.}
		fi
	else
		ext=Radio
		icon=webradio
		# before webradios play: no 'Name:' - use station name from file instead
		urlname=${file//\//|}
		radiofile=/srv/http/data/webradios/$urlname
		if [[ -e "$radiofile" ]]; then
			radiodata=$( cat $radiofile )
			station=$( sed -n 1p <<< "$radiodata" )
			radiosampling=$( sed -n 2p <<< "$radiodata" )
		fi
		[[ $file == *icecast.radiofrance.fr* ]] && icon=radiofrance
		[[ $file == *stream.radioparadise.com* ]] && icon=radioparadise
		if [[ $state != play ]]; then
			Title=
		else
			if [[ $icon == radiofrance || $icon == radioparadise ]]; then
				id=$( basename ${file/-*} )
				[[ $id != fip && $id != francemusique ]] && id=$( echo $id | sed 's/fip\|francemusique//' )
			fi
			if [[ -n $id ]]; then # triggered once on start - subsequently by cmd-pushstatus.sh
				stationname=${station/* - }
				if [[ ! -e $dirshm/radio || -z $( head -3 $dirshm/status 2> /dev/null ) ]]; then
					echo "\
$file
$stationname
$id
$radiosampling" > $dirshm/radio
					rm -f $dirshm/status
					systemctl start radio
				else
					readarray -t tmpstatus <<< $( cat $dirshm/status 2> /dev/null | sed 's/"/\\"/g' )
					Artist=${tmpstatus[0]}
					Title=${tmpstatus[1]}
					Album=${tmpstatus[2]}
					[[ -n $displaycover ]] && coverart=${tmpstatus[3]}
					station=$stationname
				fi
			elif [[ -n $Title && -n $displaycover ]]; then
				# split Artist - Title: Artist - Title (extra tag) or Artist: Title (extra tag)
				readarray -t radioname <<< $( echo $Title | sed 's/ - \|: /\n/' )
				Artist=${radioname[0]}
				Title=${radioname[1]}
				# fetched coverart
				artisttitle="$Artist${Title/ (*}" # remove ' (extra tag)' for coverart search
				covername=$( echo $artisttitle | tr -d ' "`?/#&'"'" )
				coverfile=$( ls $dirshm/webradio-$covername.* 2> /dev/null | head -1 )
				if [[ -n $coverfile ]]; then
					coverart=/data/shm/$( basename $coverfile )
					Album=$( cat $dirshm/webradio-$covername 2> /dev/null )
				fi
			fi
		fi
		if [[ -n $displaycover ]]; then
			filenoext=/data/webradiosimg/$urlname
			pathnoext=/srv/http$filenoext
			if [[ -e $pathnoext.gif ]]; then
				stationcover=$filenoext.$date.gif
			elif [[ -e $pathnoext.jpg ]]; then
				stationcover=$filenoext.$date.jpg
			fi
		fi
########
		status+='
, "Album"        : "'$Album'"
, "Artist"       : "'$Artist'"
, "stationcover" : "'$stationcover'"
, "Name"         : "'$Name'"
, "station"      : "'$station'"
, "Time"         : false
, "Title"        : "'$Title'"
, "webradio"     : true'
	if [[ -n $id ]]; then
		sampling="$(( song + 1 ))/$playlistlength &bull; $radiosampling"
		elapsed=$( printf '%.0f' $( { echo status; sleep 0.05; } \
					| telnet 127.0.0.1 6600 2> /dev/null \
					| grep ^elapsed \
					| cut -d' ' -f2 ) )
########
		status+='
, "coverart"     : "'$coverart'"
, "elapsed"      : '$elapsed'
, "ext"          : "Radio"
, "icon"         : "'$icon'"
, "sampling"     : "'$sampling'"
, "song"         : '$song
# >>>>>>>>>>
		outputStatus
		exit
	fi
	
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
	[[ -z $AlbumArtist ]] && AlbumArtist=$Artist
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

samplingfile=$dirshm/sampling-$( echo $file | tr -d ' "`?/#&'"'_.\-" )
samplingSave() {
	echo $sampling > $samplingfile
	files=$( ls -1t $dirshm/sampling-* 2> /dev/null )
	(( $( echo "$files" | wc -l ) > 10 )) && rm -f "$( echo "$files" | tail -1 )"
}
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
	[[ $ext != Radio ]] && sampling+=" &bull; $ext"
}

if [[ $ext == CD ]]; then
	sampling='16 bit 44.1 kHz 1.41 Mbit/s &bull; CD'
elif [[ $state != stop ]]; then
	if [[ $ext == DSF || $ext == DFF ]]; then
		bitdepth=dsd
		[[ $state == pause ]] && bitrate=$(( ${samplerate/dsd} * 2 * 44100 ))
	fi
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
	samplingSave &
else
	if [[ $ext == Radio ]]; then
		sampling="$radiosampling"
	else
		if [[ -e $samplingfile ]]; then
			sampling=$( cat $samplingfile )
		else
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
		fi
		samplingSave &
	fi
fi

########
pos="$(( song + 1 ))/$playlistlength"
sampling="$pos &bull; $sampling"
status+='
, "ext"      : "'$ext'"
, "coverart" : ""
, "icon"     : "'$icon'"
, "sampling" : "'$sampling'"'

if [[ -z $displaycover ]]; then
	elapsed=$( printf '%.0f' $( { echo status; sleep 0.05; } \
				| telnet 127.0.0.1 6600 2> /dev/null \
				| grep ^elapsed \
				| cut -d' ' -f2 ) )
# >>>>>>>>>>
	status+='
, "elapsed"  : '$elapsed
	outputStatus
	exit
fi

if [[ $ext != CD && -z $stream ]]; then
	getcover=1
	coverart=$( $dirbash/status-coverart.sh "\
$AlbumArtist
$Album
$file0" )
fi
elapsed=$( printf '%.0f' $( { echo status; sleep 0.05; } \
			| telnet 127.0.0.1 6600 2> /dev/null \
			| grep ^elapsed \
			| cut -d' ' -f2 ) )
########
status+='
, "elapsed"  : '$elapsed'
, "coverart" : "'$coverart'"'
# >>>>>>>>>>
outputStatus

[[ -n $getcover ]] && exit

[[ -z $AlbumArtist ]] && AlbumArtist=$Artist
[[ -z $AlbumArtist ]] && exit

if [[ -n $stream && $state == play && -n $Title ]]; then
	args="\
$AlbumArtist
${Title/ (*}
webradio"
elif [[ -n $Album ]]; then
	args="\
$AlbumArtist
$Album"
fi
if [[ -n $args ]]; then
	killall status-coverartonline.sh &> /dev/null # new track - kill if still running
	$dirbash/status-coverartonline.sh "$args" &> /dev/null &
fi
