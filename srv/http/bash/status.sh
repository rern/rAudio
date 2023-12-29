#!/bin/bash

# file mode
# initial page load / refresh > status.sh
# changes:
#    - mpdidle.sh > status-push.sh
#    - radioparadize / radiofrance - no stream update - status-radio.sh

. /srv/http/bash/common.sh

if [[ -L $dirmpd && ! -e $dirmpd/counts ]]; then # shared data
	for i in {1..10}; do
		sleep 1
		[[ -e $dirmpd/counts ]] && mounted=1 && break
	done
	[[ ! $mounted ]] && echo -1 && exit # >>>>>>>>>>
fi

outputStatus() {
	if [[ $snapclient ]]; then
		echo "$status" # - no braces
	else
		data2json "$status"
	fi
	[[ $1 != noexit ]] && exit # >>>>>>>>>>
}

if [[ $1 == withdisplay ]]; then
	if [[ -e $dirshm/nosound ]]; then
		volumenone=true
	else
		[[ ! -e $dirshm/mixernone || -e $dirshm/btreceiver || -e $dirsystem/snapclientserver ]] && volumenone=false || volumenone=true
	fi
	systemctl -q is-active mediamtx && dabradio=true
	[[ -e $dirsystem/localbrowser.conf ]] && ! grep -q screenoff=0 $dirsystem/localbrowser.conf && screenoff=true
	display=$( grep -v } $dirsystem/display.json )
	[[ -e $filesharedip ]] && display=$( sed -E 's/"(sd|usb).*/"\1": false,/' <<< $display )
	display+='
, "audiocd"     : '$( exists $dirshm/audiocd )'
, "camilladsp"  : '$( exists $dirsystem/camilladsp )'
, "color"       : "'$( getContent $dirsystem/color )'"
, "dabradio"    : '$dabradio'
, "equalizer"   : '$( exists $dirsystem/equalizer )'
, "multiraudio" : '$( exists $dirsystem/multiraudio )'
, "relays"      : '$( exists $dirsystem/relays )'
, "screenoff"   : '$screenoff'
, "snapclient"  : '$( [[ -e $dirsystem/snapclient && ! -e $dirsystem/snapclientserver ]] && echo true )'
, "volumenone"  : '$volumenone'
}'
fi

comsume_pos=( $( mpc status '%consume% %songpos%' ) )
[[ ${comsume_pos[0]} == on ]] && consume=true
pos=${comsume_pos[1]}                 # mpc songpos : start at 1
(( $pos > 0 )) && song=$(( pos - 1 )) # mpd song    : start at 0

if [[ $1 == snapclient ]]; then
	snapclient=1
	player=mpd
else
	player=$( < $dirshm/player )
	[[ ! $player ]] && player=mpd && echo mpd > $dirshm/player
	[[ $player != mpd ]] && icon=$player
	
	readarray -t vcc <<< $( volumeCardControl )
	volume=${vcc[0]}
	card=${vcc[1]}
	control=${vcc[2]}
	if [[ -e $dirmpd/listing ]] || mpc | grep -q ^Updating; then
		updating_db=true
	fi
	[[ -e $dirsystem/volumemute ]] && volumemute=$( < $dirsystem/volumemute ) || volumemute=0
########
	status+='
, "player"       : "'$player'"
, "btreceiver"   : '$( exists $dirshm/btreceiver )'
, "card"         : '$card'
, "consume"      : '$consume'
, "control"      : "'$control'"
, "counts"       : '$( getContent $dirmpd/counts )'
, "file"         : ""
, "icon"         : "'$icon'"
, "librandom"    : '$( exists $dirsystem/librandom )'
, "lyrics"       : '$( exists $dirsystem/lyrics )'
, "relays"       : '$( exists $dirsystem/relays )'
, "relayson"     : '$( exists $dirshm/relayson )'
, "shareddata"   : '$( exists $filesharedip )'
, "snapclient"   : '$( exists $dirshm/snapclient )'
, "stoptimer"    : '$( exists $dirshm/pidstoptimer )'
, "updateaddons" : '$( exists $diraddons/update )'
, "updating_db"  : '$updating_db'
, "updatingdab"  : '$( exists $dirshm/updatingdab )'
, "volume"       : '$volume'
, "volumemute"   : '$volumemute'
, "webradio"     : false'
	if [[ -e $dirsystem/scrobble ]]; then
		scrobbleconf=$( conf2json $dirsystem/scrobble.conf )
########
		status+='
, "scrobble"     : true
, "scrobbleconf" : '${scrobbleconf,,}
	fi
fi
########
[[ $display ]] && status+='
, "display"      : '$display

if [[ $player != mpd && $player != upnp ]]; then
	case $player in

	airplay )
		dirairplay=$dirshm/airplay
		[[ -e $dirairplay/state ]] && state=$( < $dirairplay/state ) || state=stop
		Time=$( getContent $dirairplay/Time )
		timestamp=$( date +%s%3N )
		if [[ $state == pause ]]; then
			elapsed=$( < $dirairplay/elapsed )
		else
			[[ -e $dirairplay/start ]] && start=$( < $dirairplay/start ) || start=0
			elapsedms=$(( timestamp - start ))
			elapsed=$(( ( elapsedms + 1500 ) / 1000 )) # roundup + 1s
		fi
		
		if [[ -e $dirairplay/timestamp ]]; then
			diff=$(( timestamp - $( < $dirairplay/timestamp ) ))
			elapsed=$(( diff / 1000 + elapsed ))
		fi
########
		status+='
, "Album"     : "'$( getContent $dirairplay/Album )'"
, "Artist"    : "'$( getContent $dirairplay/Artist )'"
, "Title"     : "'$( getContent $dirairplay/Title )'"
, "coverart"  : "/data/shm/airplay/coverart.jpg"
, "elapsed"   : '$elapsed'
, "sampling"  : "16 bit 44.1 kHz 1.41 Mbit/s • AirPlay"
, "state"     : "'$state'"
, "Time"      : '$Time'
, "timestamp" : '$timestamp
		;;
	bluetooth )
########
		status+="
$( $dirbash/status-bluetooth.sh )"
		;;
	snapcast )
		serverip=$( < $dirshm/serverip )
		serverstatus=$( sshCommand $serverip $dirbash/status.sh snapclient )
########
		status+=$( sed -E  -e 's|^(, "stationcover" *: ")(.+")|\1http://'$serverip'\2|
						 ' -e 's|^(, "coverart" *: ")(.+")|\1http://'$serverip'\2|
						 ' -e 's|^, *"icon".*|, "icon" : "snapcast"|' <<< $serverstatus )
		;;
	spotify )
		. $dirshm/spotify/state
		[[ $state == play ]] && elapsed=$(( $( date +%s ) - start + 1 )) # 1s delayed
########
		status+="
$( < $dirshm/spotify/status )"
	status+='
, "elapsed"   : '$elapsed'
, "timestamp" : '$( date +%s%3N )
		;;
		
	esac
# >>>>>>>>>> spotify
	outputStatus
fi

(( $( grep -cE '"cover".*true|"vumeter".*false' $dirsystem/display.json ) == 2 )) && displaycover=1

#. <( mpc playlist -f 'Album="%album%"; Artist="%artist%"; Composer="%composer%"; Conductor="%conductor%"; file="%file%"; time=%time%; title="%title%"' | sed "$song q;d" )
#. <( mpc status 'state=%state%; current=%songpos%; length=%length%; random=%random%; consume=%consume%' )

filter='Album AlbumArtist Artist Composer Conductor audio bitrate duration file Name state Time Title'
[[ ! $snapclient ]] && filter+=' playlistlength random repeat single'
filter=^${filter// /:|^}: # ^Album|^AlbumArtist|^Artist...
readarray -t lines <<< $( { echo clearerror; echo status; echo playlistinfo $song; sleep 0.05; } \
								| telnet 127.0.0.1 6600 2> /dev/null \
								| grep -E $filter )
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
			bitrate=$(( val * 1000 ))
			;;
		duration | playlistlength | state | Time )
			printf -v $key '%s' $val
			;; # value of $key as "var name" - value of $val as "var value"
		Album | AlbumArtist | Artist | Composer | Conductor | Name | Title )
			printf -v $key '%s' "$( stringEscape $val )"
			;;                   # string to escape " for json and trim leading/trailing spaces
		file )
			filenoesc=$val # no escape " for coverart and ffprobe
			[[ $filenoesc == *".cue/track"* ]] && filenoesc=$( dirname "$filenoesc" )
			file=$( stringEscape "$val" )
			;;   # escape " for json
		random | repeat | single )
			[[ $val == 1 ]] && val=true || val=false
########
			status+='
, "'$key'" : '$val
			;;
	esac
done

[[ $playlistlength ]] && pllength=$playlistlength || pllength=0
status=$( grep -v '^, "file"' <<< $status )
########
status+='
, "file"      : "'$file'"
, "pllength"  : '$pllength'
, "song"      : '$song'
, "state"     : "'$state'"
, "timestamp" : '$( date +%s%3N )
if [[ $pllength  == 0 && ! $snapclient ]]; then
	ip=$( ipAddress )
	[[ $ip ]] && hostname=$( avahi-resolve -a4 $ip | awk '{print $NF}' )
########
	status+='
, "coverart" : ""
, "hostname" : "'$hostname'"
, "ip"       : "'$ip'"'
# >>>>>>>>>> empty playlist
	outputStatus
fi
fileheader=${file:0:4}
[[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]] && stream=true # webradio dab upnp
if [[ $fileheader == cdda ]]; then
	ext=CD
	icon=audiocd
	if [[ -e $dirshm/audiocd && -e $diraudiocd/$discid ]]; then
		discid=$( < $dirshm/audiocd )
		track=${file/*\/}
		readarray -t audiocd <<< $( sed "$track q:d" $diraudiocd/$discid | tr ^ '\n' )
		Artist=${audiocd[0]}
		Album=${audiocd[1]}
		Title=${audiocd[2]}
		Time=${audiocd[3]}
		if [[ $displaycover ]]; then
			coverfile=$( ls $diraudiocd/$discid.* 2> /dev/null | head -1 )
			[[ $coverfile ]] && coverart="${coverfile:9}"
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
elif [[ $stream ]]; then
	if [[ $player == upnp ]]; then # internal ip
		ext=UPnP
		[[ $duration ]] && duration=$( printf '%.0f' $duration )
########
		status+='
, "Album"  : "'$Album'"
, "Artist" : "'$Artist'"
, "Time"   : "'$duration'"
, "Title"  : "'$Title'"'
		if [[ $displaycover ]]; then # fetched coverart
			covername=$( tr -d ' "`?/#&'"'" <<< $Artist$Album )
			covername=${covername,,}
			onlinefile=$( ls $dirshm/online/$covername.* 2> /dev/null | head -1 )
			[[ $onlinefile ]] && coverart="${onlinefile:9}"
		fi
	else
		ext=Radio
		if [[ $file == *rtsp://*$( hostname -f )* ]]; then
			ext=DAB
			dirradio=$dirdabradio
			icon=dabradio
		else
			dirradio=$dirwebradio
			case $file in
				*icecast.radiofrance.fr* )   icon=radiofrance;;
				*stream.radioparadise.com* ) icon=radioparadise;;
			esac
		fi
		# before webradio play: no 'Name:' - use station name from file instead
		url=${file/\#charset*}
		urlname=${url//\//|}
		radiofile=$dirradio/$urlname
		[[ ! -e $radiofile  ]] && radiofile=$( find $dirradio -name "$urlname" )
		if [[ -e $radiofile ]]; then
			readarray -t radiodata < "$radiofile"
			station=${radiodata[0]}
			radiosampling=${radiodata[1]}
		fi
		if [[ $state != play ]]; then
			state=stop
			Title=
		else
			if [[ $icon =~ ^(radioparadise|radiofrance|dabradio)$ ]]; then # while playing: status-push.sh
				if [[ $icon == dabradio ]]; then
					radio_dab=dab
					radiosampling="48 kHz 160 kbit/s"
				else
					radio_dab=radio
				fi
				sampling=$radiosampling
				if [[ ! -e $dirshm/radio ]]; then
					state=play
					stationcover=${dirradio:9}/img/$urlname.jpg
					datastation='
  "coverart"     : "'$stationcover'"
, "file"         : "'$file'"
, "icon"         : "'$icon'"
, "sampling"     : "'$sampling'"
, "state"        : "play"
, "station"      : "'$station'"
, "stationcover" : "'$stationcover'"
, "Time"         : false
, "webradio"     : true'
					pushData mpdplayer "{ $datastation }"
					echo "file=$file" > $dirshm/radio
					! systemctl -q is-active $radio_dab && systemctl start $radio_dab
				else
					. <( grep -E '^Artist|^Album|^Title|^coverart' $dirshm/status )
					[[ ! $displaycover ]] && coverart=
				fi
			elif [[ $Title && $displaycover ]]; then
				if [[ $Title == *" - "* ]]; then # split 'Artist - Title' or 'Artist: Title'
					readarray -t radioname <<< $( sed -E 's/ - |: /\n/' <<< $Title )
					Artist=${radioname[0]}
					Title=${radioname[1]}
					! grep -q "$Title" /srv/http/assets/data/titles_with_paren && Title=$( sed -E 's/ +\(.*$| +\[.*$| +- .*$//' <<< $Title )
				else
					Artist=$station
				fi
				# fetched coverart
				covername=$( tr -d ' "`?/#&'"'" <<< "$Artist${Title/ (*}" ) # remove '... (extra tag)'
				covername=${covername,,}
				coverfile=$( ls $dirshm/webradio/$covername.* 2> /dev/null | head -1 )
				if [[ $coverfile ]]; then
					coverart="${coverfile:9}"
					Album=$( getContent $dirshm/webradio/$covername )
				fi
			fi
		fi
		if [[ $displaycover ]]; then
			stationcover=$( ls $dirwebradio/img/$urlname.* 2> /dev/null )
			if [[ $stationcover ]]; then
				stationcover="$( sed 's|^/srv/http||; s/#/%23/g; s/?/%3F/g' <<< $stationcover )"
				[[ ! $coverart ]] && coverart=$stationcover
			fi
		fi
########
		status=$( grep -E -v '^, "state"|^, "webradio"' <<< $status )
########
		status+='
, "Album"        : "'$Album'"
, "Artist"       : "'$Artist'"
, "stationcover" : "'$stationcover'"
, "Name"         : "'$Name'"
, "state"        : "'$state'"
, "station"      : "'$station'"
, "Time"         : false
, "Title"        : "'$Title'"
, "webradio"     : true'
		if [[ $radio_dab ]]; then # rp / rf / dab
			elapsed=$( mpcElapsed )
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
		fi
	fi
else
	mpdpath=$( dirname "$file" )
	path="/mnt/MPD/$mpdpath"
	[[ -e "$path/booklet.pdf" ]] && booklet=true
	ext=${file/*.}
	if [[ ${ext:0:9} == cue/track ]]; then
		cuesrc=$( grep -m1 ^FILE "$path" | cut -d'"' -f2 )
		ext=${cuesrc/*.}
	fi
	ext=${ext^^}
	# missing id3tags
	[[ ! $AlbumArtist ]] && AlbumArtist=$Artist
	[[ ! $Artist ]] && Artist=$AlbumArtist
	[[ ! $Artist ]] && dirname=${file%\/*} && Artist=${dirname/*\/}
	[[ ! $Title ]] && filename=${file/*\/} && Title=${filename%.*}
########
	status+='
, "Album"     : "'$Album'"
, "Artist"    : "'$Artist'"
, "booklet"   : '$booklet'
, "Composer"  : "'$Composer'"
, "Conductor" : "'$Conductor'"
, "Time"      : '$Time'
, "Title"     : "'$Title'"'
fi

samplingfile=$dirshm/sampling/$( tr -d ' "`?/#&'"'_.\-" <<< $file )
samplingSave() {
	if [[ $sampling && $player != upnp ]]; then
		echo $sampling > $samplingfile
		files=$( ls -1t $dirshm/sampling 2> /dev/null )
		(( $( wc -l <<< $files ) > 20 )) && rm -f "$( tail -1 <<< $files )"
	fi
}
samplingLine() {
	bitdepth=$1
	samplerate=$2
	bitrate=$3
	ext=$4
	if [[ $bitrate == 0 || ! $bitrate ]]; then
		if [[ ${bitdepth//[!0-9]/} ]]; then
			bitrate=$(( bitdepth * samplerate * 2 ))
		else
			bitrate=$( ffprobe \
							-v quiet \
							-show_entries format=bit_rate \
							-of default=noprint_wrappers=1:nokey=1 \
							"/mnt/MPD/$filenoesc" )
		fi
	fi
	if (( $bitrate < 1000000 )); then
		rate="$(( bitrate / 1000 )) kbit/s"
	else
		[[ $bitdepth == dsd ]] && bitrate=$(( bitrate / 2 ))
		rate="$( calc 2 $bitrate/1000000 ) Mbit/s"
	fi
	
	if [[ $bitdepth == dsd ]]; then
		sampling="${samplerate^^} • $rate"
	else
		[[ $bitdepth == 'N/A' && ( $ext == WAV || $ext == AIFF ) ]] && bitdepth=$(( bitrate / samplerate / 2 ))
		sample="$( calc 1 $samplerate/1000 ) kHz"
		if [[ $bitdepth && ! $ext =~ ^(AAC|MP3|OGG|Radio)$ ]]; then
			sampling="$bitdepth bit $sample $rate"
		else # lossy has no bitdepth
			sampling="$sample $rate"
		fi
	fi
	[[ $ext != Radio ]] && sampling+=" • $ext"
}

if [[ $ext == CD ]]; then
	sampling='16 bit 44.1 kHz 1.41 Mbit/s • CD'
elif [[ $ext == DAB ]]; then
	sampling='48 kHz 160 kbit/s • DAB'
elif [[ $state != stop ]]; then
	if [[ $ext == DSF || $ext == DFF ]]; then
		bitdepth=dsd
		[[ $state == pause ]] && bitrate=$(( ${samplerate/dsd} * 2 * 44100 ))
	elif [[ $ext == Radio ]]; then
		if [[ $bitrate && $bitrate != 0 ]]; then
			samplingLine $bitdepth $samplerate $bitrate $ext
			[[ -e $radiofile ]] && sed -i "2 s|.*|$sampling|" $radiofile # update sampling on each play
		else
			sampling=$radiosampling
		fi
	else
		samplingLine $bitdepth $samplerate $bitrate $ext
	fi
	samplingSave &
else
	if [[ $ext == Radio ]]; then
		sampling="$radiosampling"
	else
		if [[ -e $samplingfile ]]; then
			sampling=$( < $samplingfile )
		else
			if [[ $ext == DSF || $ext == DFF ]]; then
				# DSF: byte# 56+4 ? DSF: byte# 60+4
				[[ $ext == DSF ]] && byte=56 || byte=60;
				[[ $cuesrc ]] && file="$( dirname "$mpdpath" )/$cuesrc"
				hex=( $( hexdump -x -s$byte -n4 "/mnt/MPD/$file" | head -1 | tr -s ' ' ) )
				dsd=$(( ${hex[1]} / 1100 * 64 )) # hex byte#57-58 - @1100:dsd64
				bitrate=$( calc 2 $dsd*44100/1000000 )
				sampling="DSD$dsd • $bitrate Mbit/s • $ext"
			else
				data=( $( ffprobe -v quiet -select_streams a:0 \
					-show_entries stream=bits_per_raw_sample,sample_rate \
					-show_entries format=bit_rate \
					-of default=noprint_wrappers=1:nokey=1 \
					"/mnt/MPD/$filenoesc" ) )
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
status+='
, "ext"      : "'$ext'"
, "coverart" : "'$coverart'"
, "icon"     : "'$icon'"
, "sampling" : "'$sampling'"'

if [[ $coverart || ! $displaycover ]]; then # webradio $coverart exists
	elapsed=$( mpcElapsed )
# >>>>>>>>>> webradio with found coverart
########
	status+='
, "elapsed"  : '$elapsed
	outputStatus
fi

if [[ $player == upnp || ( ! $stream && $ext != CD ) ]]; then
	getcover=1
	[[ ! $AlbumArtist ]] && AlbumArtist=$Artist
	coverart=$( $dirbash/status-coverart.sh "cmd
$AlbumArtist
$Album
$filenoesc
CMD ARTIST ALBUM FILE" )
	[[ $coverart ]] && coverart="$coverart"
fi
elapsed=$( mpcElapsed )
########
	status+='
, "elapsed"  : '$elapsed'
, "coverart" : "'$coverart'"'
# >>>>>>>>>> not cd && not stream
outputStatus $( [[ ! $getcover && $Artist ]] && echo noexit )

[[ $getcover || ! $Artist ]] && exit # >>>>>>>>>>

if [[ $stream && $state == play && $Title ]]; then
	args="\
$Artist
$Title
webradio"
elif [[ $Album ]]; then
	args="\
$Artist
$Album"
fi
[[ ! $args ]] && exit

$dirbash/status-coverartonline.sh "cmd
$args
CMD ARTIST ALBUM TYPE" &> /dev/null &
