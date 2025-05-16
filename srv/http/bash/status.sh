#!/bin/bash

# file mode
# initial page load / refresh > status.sh
# changes:
#    - mpdidle.sh > status-push.sh
#    - radioparadize / radiofrance - no stream update - status-radio.sh

. /srv/http/bash/common.sh

ip=$( ipAddress )

statusData() {
	if [[ $snapclient ]]; then
		status=$( sed -E 's|^(, "stationcover" *: ")(.+")|\1http://'$ip'\2|
						  s|^(, "coverart" *: ")(.+")|\1http://'$ip'\2|' <<< ${status:1} )
		data2jsonPatch "$status"
	else
		data2json "$status"
	fi
}

[[ -L $dirmpd && ! -s $dirmpd ]] && echo -1 && exit
# --------------------------------------------------------------------
if [[ -e $dirshm/nosound ]]; then
	volumenone=true
else
	. <( grep -E '^mixer|^mixertype' $dirshm/output )
	if [[ $mixertype != none ]] \
		|| [[ -e $dirshm/btreceiver || -e $dirsystem/snapclientserver ]] \
		|| [[ -e $dirsystem/camilladsp && $mixer ]]; then
		volumenone=false
	else
		volumenone=true
	fi
fi
grep -qs screenoff=[1-9] $dirsystem/localbrowser.conf && screenoff=true || screenoff=false
display=$( grep -v } $dirsystem/display.json )
[[ -e $filesharedip ]] && display=$( sed -E 's/"(sd|usb).*/"\1": false,/' <<< $display )
[[ -e $dirsystem/ap ]] && apconf=$( getContent $dirsystem/ap.conf )
[[ -e $dirsystem/loginsetting ]] && loginsetting=true || lock=$( exists $dirsystem/login )
display+='
, "ap"           : '$( exists $dirsystem/ap )'
, "apconf"       : '$apconf'
, "audiocd"      : '$( exists $dirshm/audiocd )'
, "camilladsp"   : '$( exists $dirsystem/camilladsp )'
, "color"        : '$( exists $dirsystem/color )'
, "dabradio"     : '$( exists $dirsystem/dabradio )'
, "equalizer"    : '$( exists $dirsystem/equalizer )'
, "loginsetting" : '$loginsetting'
, "lock"         : '$lock'
, "multiraudio"  : '$( exists $dirsystem/multiraudio )'
, "relays"       : '$( exists $dirsystem/relays )'
, "screenoff"    : '$screenoff'
, "snapclient"   : '$( exists $dirsystem/snapclient )'
, "volumenone"   : '$volumenone'
}'
status+='
, "display"      : '$display

if [[ $1 == snapclient ]]; then
	snapclient=1
	player=mpd
	icon=snapcast
else
	player=$( < $dirshm/player )
	[[ ! $player ]] && player=mpd && echo mpd > $dirshm/player
	[[ $player != mpd ]] && icon=$player
	if [[ -e $dirshm/btreceiver ]]; then
		card='"btreceiver"'
		mixer=$( < $dirshm/btmixer )
	else
		. <( grep -E '^card|^mixer' $dirshm/output )
	fi
	[[ -e $dirmpd/listing || -e $dirmpd/updating ]] && updating_db=true || updating_db=false
########
	status+='
, "player"       : "'$player'"
, "btreceiver"   : '$( exists $dirshm/btreceiver )'
, "card"         : '$card'
, "control"      : "'$mixer'"
, "counts"       : '$( getContent $dirmpd/counts '{}' )'
, "icon"         : "'$icon'"
, "librandom"    : '$( exists $dirsystem/librandom )'
, "lyrics"       : '$( exists $dirsystem/lyrics )'
, "relays"       : '$( exists $dirsystem/relays )'
, "relayson"     : '$( exists $dirshm/relayson )'
, "shareddata"   : '$( exists $filesharedip )'
, "snapclient"   : '$( exists $dirshm/snapserverip )'
, "stoptimer"    : '$( exists $dirshm/pidstoptimer )'
, "updateaddons" : '$( exists $diraddons/update )'
, "updating_db"  : '$updating_db'
, "volume"       : '$( volumeGet )'
, "volumemax"    : '$( volumeMaxGet )'
, "volumemute"   : '$( getContent $dirsystem/volumemute 0 )'
, "webradio"     : false'
	if [[ -e $dirsystem/scrobble ]]; then
		scrobbleconf=$( conf2json $dirsystem/scrobble.conf )
########
		status+='
, "scrobble"     : true
, "scrobbleconf" : '${scrobbleconf,,}
	fi
fi

if [[ $player != mpd && $player != upnp ]]; then
	case $player in

	airplay )
		dirairplay=$dirshm/airplay
		state=$( getContent $dirairplay/state stop )
		Time=$( getContent $dirairplay/Time )
		timestamp=$( date +%s%3N )
		if [[ $state == pause ]]; then
			elapsed=$( < $dirairplay/elapsed )
		else
			start=$( getContent $dirairplay/start 0 )
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
, "coverart"  : "/data/shm/airplay/coverart.jpg"
, "elapsed"   : '$elapsed'
, "file"      : ""
, "sampling"  : "16 bit 44.1 kHz 1.41 Mbit/s • AirPlay"
, "state"     : "'$state'"
, "Time"      : '$Time'
, "timestamp" : '$timestamp'
, "Title"     : "'$( getContent $dirairplay/Title )'"'
		;;
	bluetooth )
########
		status+="
$( $dirbash/status-bluetooth.sh )"
		;;
	snapcast )
		serverip=$( < $dirshm/snapserverip )
		serverstatus=$( websocat ws://$serverip:8080 <<< '{ "status": "snapclient" }' )
########
		status+="
$( echo -e "$serverstatus" )"
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
	statusData
	exit
# --------------------------------------------------------------------
fi

pos=$( mpc status %songpos% )
(( $pos > 0 )) && song=$(( pos - 1 )) || song=0 # mpd song    : start at 0
filter='Album AlbumArtist Artist Composer Conductor audio bitrate duration file playlistlength state Time Title'
[[ ! $snapclient ]] && filter+=' consume random repeat single'
filter=^${filter// /:|^}: # ^Album|^AlbumArtist|^Artist...
lines=$( { echo clearerror; echo status; echo playlistinfo $song; sleep 0.05; } \
				| telnet 127.0.0.1 6600 2> /dev/null \
				| grep -E $filter )
while read line; do
	key=${line/:*}
	val=${line#*: }
	case $key in
		audio ) # samplerate:bitdepth:channel
			samplerate=${val/:*}
			bitdepth=$( cut -d: -f2 <<< $val )
			;;
		bitrate )
			[[ $val && $val != 0 ]] && bitrate=$(( val * 1000 ))
			;;
		duration | playlistlength | state | Time )
			printf -v $key '%s' $val
			;; # value of $key as "var name" - value of $val as "var value"
		Album | AlbumArtist | Artist | Composer | Conductor | Title )
			printf -v $key '%s' "$( quoteEscape $val )"
			;; # string to escape " for json
		file )
			filenoesc=$val # no escape " for coverart and ffprobe
			[[ $filenoesc == *".cue/track"* ]] && filenoesc=$( dirname "$filenoesc" )
			file=$( quoteEscape $val )
			;;   # escape " for json
		consume | random | repeat | single )
			[[ $val == 1 ]] && val=true || val=false
########
			status+='
, "'$key'" : '$val
			;;
	esac
done <<< $lines

[[ $playlistlength ]] && pllength=$playlistlength || pllength=0
########
status+='
, "file"      : "'$file'"
, "pllength"  : '$pllength'
, "song"      : '$song'
, "state"     : "'$state'"
, "timestamp" : '$( date +%s%3N )
if [[ $pllength == 0 && ! $snapclient ]]; then
	[[ $ip ]] && hostname=$( avahi-resolve -a4 $ip | awk '{print $NF}' )
########
	status+='
, "coverart" : ""
, "hostname" : "'${hostname/.*}'"
, "ip"       : "'$ip'"'
# >>>>>>>>>> empty playlist
	statusData
	exit
# --------------------------------------------------------------------
fi
(( $( grep -cE '"cover".*true|"vumeter".*false' $dirsystem/display.json ) == 2 )) && displaycover=1
fileheader=${file:0:4}
[[ 'http rtmp rtp: rtsp' =~ ${fileheader,,} ]] && stream=true # webradio dab upnp
if [[ $fileheader == cdda ]]; then
	ext=CD
	icon=audiocd
	audiocd=1
	if [[ -e $diraudiocd/$discid ]]; then
		discid=$( < $dirshm/audiocd )
		track=${file/*\/}
		readarray -t disciddata <<< $( sed -n "$track p" $diraudiocd/$discid | tr ^ '\n' )
		Artist=${disciddata[0]}
		Album=${disciddata[1]}
		Title=${disciddata[2]}
		Time=${disciddata[3]}
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
			covername=$( alphaNumeric $Artist$Album )
			covername=${covername,,}
			onlinefile=$( ls $dirshm/online/$covername.* 2> /dev/null | head -1 )
			[[ $onlinefile ]] && coverart="${onlinefile:9}"
		fi
	else
		webradio=1
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
					stationcover=$( php -r "echo rawurlencode( '${stationcover//\'/\\\'}' );" )
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
				covername=$( alphaNumeric "$Artist${Title/ (*}" ) # remove '... (extra tag)'
				covername=${covername,,}
				coverfile=$( ls $dirshm/webradio/$covername.* 2> /dev/null | head -1 )
				if [[ $coverfile ]]; then
					coverart="${coverfile:9}"
					coverart=$( php -r "echo rawurlencode( '${coverart//\'/\\\'}' );" )
					Album=$( getContent $dirshm/webradio/$covername )
				fi
			fi
		fi
		if [[ $displaycover ]]; then
			stationcover=$( ls $dirwebradio/img/$urlname.* 2> /dev/null )
			[[ $stationcover ]] && stationcover="$( sed 's|^/srv/http||; s/#/%23/g; s/?/%3F/g' <<< $stationcover )"
			stationcover=$( php -r "echo rawurlencode( '${stationcover//\'/\\\'}' );" )
		fi
########
		status+='
, "Album"        : "'$Album'"
, "Artist"       : "'$Artist'"
, "stationcover" : "'$stationcover'"
, "state"        : "'$state'"
, "station"      : "'$station'"
, "Time"         : false
, "Title"        : "'$Title'"
, "webradio"     : true'
		if [[ $radio_dab ]]; then # rp / rf / dab
			elapsed=$( mpcElapsed $webradio )
########
			status+='
, "coverart"     : "'$coverart'"
, "elapsed"      : '$elapsed'
, "ext"          : "Radio"
, "icon"         : "'$icon'"
, "sampling"     : "'$sampling'"
, "song"         : '$song
# >>>>>>>>>>
			statusData
			exit
# --------------------------------------------------------------------
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

samplingfile=$dirshm/sampling/$( alphaNumeric $file )

if [[ $audiocd ]]; then
	sampling='16 bit 44.1 kHz 1.41 Mbit/s • CD'
elif [[ $ext == DAB ]]; then
	sampling='48 kHz 160 kbit/s • DAB'
elif [[ $state != stop ]]; then
	[[ $ext == DSF || $ext == DFF ]] && bitdepth=dsd
	if [[ $ext == Radio ]]; then
		if [[ $bitrate ]]; then
			[[ -e $radiofile ]] && sed -i "2 s|.*|$sampling|" $radiofile # update sampling on each play
		else
			sampling=$radiosampling
		fi
	fi
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
			fi
		fi
	fi
fi
if [[ ! $sampling ]]; then
	if [[ ! $bitrate ]]; then
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
	if [[ $bitdepth == dsd ]]; then
		sampling="${samplerate^^} •"
	elif [[ $samplerate ]]; then
		[[ $bitdepth == 'N/A' && ( $ext == WAV || $ext == AIFF ) ]] && bitdepth=$(( bitrate / samplerate / 2 ))
		sample="$( calc 1 $samplerate/1000 ) kHz"
		if [[ $bitdepth && ! $ext =~ ^(AAC|MP3|OGG|Radio)$ ]]; then
			sampling="$bitdepth bit $sample"
		else # lossy has no bitdepth
			sampling=$sample
		fi
	fi
	if [[ $bitrate ]]; then
		if (( $bitrate < 1000000 )); then
			sampling+=" $(( bitrate / 1000 )) kbit/s"
		else
			[[ $bitdepth == dsd ]] && bitrate=$(( bitrate / 2 ))
			sampling+=" $( calc 2 $bitrate/1000000 ) Mbit/s"
		fi
	fi
	if [[ $ext == Radio ]]; then
		echo "\
$station
$sampling" > "$radiofile"
	else
		sampling+=" • $ext"
	fi
fi
if [[ $sampling && ! $audiocd && $ext != Radio && $player != upnp ]]; then
	echo $sampling > $samplingfile
	files=$( ls -t $dirshm/sampling 2> /dev/null )
	(( $( wc -l <<< $files ) > 20 )) && rm -f "$( tail -1 <<< $files )"
fi
########
status+='
, "ext"      : "'$ext'"
, "coverart" : "'$coverart'"
, "icon"     : "'$icon'"
, "sampling" : "'$sampling'"'

if [[ $coverart || ! $displaycover ]]; then # webradio $coverart exists
	elapsed=$( mpcElapsed $webradio )
# >>>>>>>>>> webradio with found coverart
########
	status+='
, "elapsed"  : '$elapsed
	statusData
	exit
# --------------------------------------------------------------------
fi

if [[ $player == upnp || ( ! $stream && ! $audiocd ) ]]; then
	getcover=1
	[[ ! $AlbumArtist ]] && AlbumArtist=$Artist
	coverart=$( $dirbash/status-coverart.sh "cmd
$AlbumArtist
$Album
$filenoesc
CMD ARTIST ALBUM FILE" )
fi
elapsed=$( mpcElapsed $webradio )
########
	status+='
, "elapsed"  : '$elapsed'
, "coverart" : "'$coverart'"'
# >>>>>>>>>> not cd && not stream
statusData
[[ $getcover || ! $Artist ]] && exit
# --------------------------------------------------------------------
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
# --------------------------------------------------------------------
$dirbash/status-coverartonline.sh "cmd
$args
CMD ARTIST ALBUM MODE" &> /dev/null &
