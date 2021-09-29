#!/bin/bash

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushRefresh() {
	data=$( $dirbash/player-data.sh )
	pushstream refresh "$data"
}
restartMPD() {
	$dirbash/mpd-conf.sh
}
scontrols() {
	amixer scontents \
		| grep -A1 ^Simple \
		| sed 's/^\s*Cap.*: /^/' \
		| tr -d '\n' \
		| sed 's/--/\n/g' \
		| grep pvolume
}
update() { # for /etc/conf.d/devmon - devmon@http.service
	if [[ -e $dirsystem/updating ]]; then
		/srv/http/data/shm/updatingusb
	else
		echo USB > $dirsystem/updating
		mpc update USB
	fi
	sleep 1
	pushRefresh
	pushstream mpdupdate 1
}

case ${args[0]} in

amixer )
	card=$( head -1 /etc/asound.conf | cut -d' ' -f2 )
	aplayname=$( aplay -l | grep "^card $card" | awk -F'[][]' '{print $2}' )
	if [[ $aplayname != snd_rpi_wsp ]]; then
		scontrols | cut -d^ -f1
	else
		echo "\
Simple mixer control 'HPOUT1 Digital',0
Simple mixer control 'HPOUT2 Digital',0
Simple mixer control 'SPDIF Out',0
Simple mixer control 'Speaker Digital',0"
	fi
	;;
audiooutput )
	aplayname=${args[1]}
	card=${args[2]}
	output=${args[3]}
	mixer=${args[4]}
	sed -i "s/.$/$card/" /etc/asound.conf
	restartMPD
	;;
autoupdate )
	if [[ ${args[1]} == true ]]; then
		sed -i '1 i\auto_update            "yes"' /etc/mpd.conf
	else
		sed -i '/^auto_update/ d' /etc/mpd.conf
	fi
	restartMPD
	;;
bufferdisable )
	sed -i '/^audio_buffer_size/ d' /etc/mpd.conf
	restartMPD
	;;
bufferset )
	buffer=${args[1]}
	sed -i '/^audio_buffer_size/ d' /etc/mpd.conf
	if (( $buffer == 4096 )); then
		rm -f $dirsystem/buffer.conf
	else
		sed -i '1 i\audio_buffer_size      "'$buffer'"' /etc/mpd.conf
		echo $buffer > $dirsystem/buffer.conf
	fi
	restartMPD
	;;
bufferoutputdisable )
	sed -i '/^max_output_buffer_size/ d' /etc/mpd.conf
	restartMPD
	;;
bufferoutputset )
	buffer=${args[1]}
	sed -i '/^max_output_buffer_size/ d' /etc/mpd.conf
	if (( $buffer == 8192 )); then
		rm -f $dirsystem/bufferoutput.conf
	else
		sed -i '1 i\max_output_buffer_size "'$buffer'"' /etc/mpd.conf
		echo $buffer > $dirsystem/bufferoutput.conf
	fi
	restartMPD
	;;
count )
	albumartist=$( mpc list albumartist | awk NF | wc -l )
	composer=$( mpc list composer | awk NF | wc -l )
	genre=$( mpc list genre | awk NF | wc -l )
	count="$count $( mpc stats | head -n3 | awk '{print $2,$4,$6}' )"

	data='
		  "album"       : '$( echo $count | cut -d' ' -f2 )'
		, "albumartist" : '$albumartist'
		, "artist"      : '$( echo $count | cut -d' ' -f1 )'
		, "composer"    : '$composer'
		, "coverart"    : '$( ls -1q /srv/http/data/coverarts | wc -l )'
		, "date"        : '$( mpc list date | awk NF | wc -l )'
		, "genre"       : '$genre'
		, "nas"         : '$( mpc ls NAS 2> /dev/null | wc -l )'
		, "sd"          : '$( mpc ls SD 2> /dev/null | wc -l )'
		, "song"        : '$( echo $count | cut -d' ' -f3 )'
		, "usb"         : '$( mpc ls USB 2> /dev/null | wc -l )'
		, "webradio"    : '$( ls -U /srv/http/data/webradios/* 2> /dev/null | wc -l )
	mpc | grep -q Updating && data+=', "updating_db":1'
	echo {$data}
	echo $albumartist $composer $genre > /srv/http/data/system/mpddb
	;;
crossfadedisable )
	mpc crossfade 0
	pushRefresh
	;;
crossfadeset )
	crossfade=${args[1]}
	mpc crossfade $crossfade
	echo $crossfade > $dirsystem/crossfade.conf
	touch $dirsystem/crossfade
	pushRefresh
	;;
customdisable )
	sed -i '/ #custom$/ d' /etc/mpd.conf
	rm -f $dirsystem/custom
	restartMPD
	;;
customget )
	global=$( cat $dirsystem/custom-global 2> /dev/null )
	output=$( cat "$dirsystem/custom-output-${args[1]}" 2> /dev/null )
	echo "\
$global
^^
$output"
	;;
customset )
	file=$dirsystem/custom
	global=${args[1]}
	output=${args[2]}
	aplayname=${args[3]}
	[[ -n $global ]] && echo -e "$global" > $file-global || rm -f $file-global
	if [[ -n $output ]]; then
		echo -e "$output" > "$file-output-$aplayname"
	else
		rm -f "$file-output-$aplayname"
	fi
	[[ -n $global || -n $output ]] && touch $file
	restartMPD
	if ! systemctl -q is-active mpd; then
		sed -i '/ #custom$/ d' /etc/mpd.conf
		rm -f $dirsystem/custom
		restartMPD
		echo -1
	fi
	;;
devices )
	devices=$'<bl># cat /etc/asound.conf</bl>\n'$( cat /etc/asound.conf )
	devices+=$'\n\n<bl># aplay -l | grep ^card</bl>\n'$( aplay -l | grep ^card )
	devices+=$'\n\n<bl># amixer scontrols</bl>\n'$( $dirbash/player.sh amixer )
	echo "$devices"
	;;
dop )
	dop=${args[1]}
	aplayname=${args[2]}
	if [[ $dop == true ]]; then
		touch "$dirsystem/dop-$aplayname"
	else
		rm -f "$dirsystem/dop-$aplayname"
	fi
	restartMPD
	;;
equalizer )
	[[ ${args[1]} == true ]] && touch $dirsystem/equalizer || rm $dirsystem/equalizer
	restartMPD
	;;
equalizerval )
	type=${args[1]} # none = get values
	name=${args[2]}
	newname=${args[3]}
	touch $dirsystem/equalizer.conf # if not exist
	if [[ -n $type ]]; then
		if [[ $type == preset ]]; then
			[[ $name == Flat ]] && v=flat || v=( $( grep "^$name\^" $dirsystem/equalizer.conf | cut -d^ -f2- ) )
		else # remove then save again with current values
			append=1
			sed -i "/^$name\^/ d" $dirsystem/equalizer.conf
			[[ $type == delete ]] && v=flat
		fi
		[[ $type == rename ]] && name=$newname
	fi
	flat='66 66 66 66 66 66 66 66 66 66'
	[[ $v == flat ]] && v=( $flat )
	freq=( 31 63 125 250 500 1 2 4 8 16 )
	for (( i=0; i < 10; i++ )); do
		(( i < 5 )) && unit=Hz || unit=kHz
		band=( "0$i. ${freq[i]} $unit" )
		[[ -n $v ]] && su mpd -c "amixer -qD equal sset \"$band\" ${v[i]}"
		val+=" $( su mpd -c "amixer -D equal sget \"$band\"" | awk '/^ *Front Left/ {print $4}' )"
	done
	val=${val:1}
	if [[ $type == new ]]; then
		exist=$( grep "$val" $dirsystem/equalizer.conf | cut -d^ -f1 )
		[[ -n $exist ]] && echo '[ -1, "'$exist'" ]' && exit
	fi
	
	[[ -n $append ]] && echo $name^$val >> $dirsystem/equalizer.conf
	readarray -t lines <<< $( cut -d^ -f1 $dirsystem/equalizer.conf | sort )
	presets='"Flat"'
	for line in "${lines[@]}"; do
		presets+=',"'$line'"'
	done
	[[ $type =~ new|rename ]] && echo "[ $presets ]" && exit
	
	[[ $val == $flat ]] && current=Flat || current=$( grep "$val" $dirsystem/equalizer.conf | cut -d^ -f1 )
	if [[ -z $current ]]; then
		current='(unnamed)'
		presets="\"(unnamed)\",$presets"
	fi
#############
	echo '{
  "current" : "'$current'"
, "values"  : [ '${val// /,}' ]
, "presets" : [ '$presets' ]
}'
	;;
ffmpeg )
	if [[ ${args[1]} == true ]]; then
		sed -i '/ffmpeg/ {n; s/".*"/"yes"/}' /etc/mpd.conf
	else
		sed -i '/ffmpeg/ {n; s/".*"/"no"/}' /etc/mpd.conf
	fi
	restartMPD
	;;
filetype )
	type=$( mpd -V | grep '\[ffmpeg' | sed 's/.*ffmpeg. //; s/ rtp.*//' | tr ' ' '\n' | sort )
	for i in {a..z}; do
		line=$( grep ^$i <<<"$type" | tr '\n' ' ' )
		[[ -n $line ]] && list+=${line:0:-1}'<br>'
	done
	echo "${list:0:-4}"
	;;
hwmixer )
	aplayname=${args[1]}
	hwmixer=${args[2]}
	if [[ $hwmixer == auto ]]; then
		hwmixer=$( scontrols \
					| cut -d"'" -f2 \
					| sort -u \
					| head -1 )
		rm -f "/srv/http/data/system/hwmixer-$aplayname"
	else
		echo $hwmixer > "/srv/http/data/system/hwmixer-$aplayname"
	fi
	sed -i '/mixer_control_name = / s/".*"/"'$hwmixer'"/' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync shairport-meta
	restartMPD
	;;
mixertype )
	mixertype=${args[1]}
	aplayname=${args[2]}
	hwmixer=${args[3]}
	if [[ -n $hwmixer ]]; then # set 0dB
		mpc stop
		vol=$( mpc volume | cut -d: -f2 | tr -d ' %' )
		if [[ $mixertype == hardware ]];then
			amixer -Mq sset "$hwmixer" $vol%
		else
			amixer -Mq sset "$hwmixer" 0dB
			rm -f /srv/http/data/shm/mpdvolume
		fi
	fi
	if [[ $mixertype == hardware ]]; then
		rm -f "$dirsystem/mixertype-$aplayname"
	else
		echo $mixertype > "$dirsystem/mixertype-$aplayname"
	fi
	restartMPD
	[[ $mixertype == software ]] && mpc volume $vol
	curl -s -X POST http://127.0.0.1/pub?id=display -d '{ "volumenone": '$( [[ $mixertype == none ]] && echo true || echo false )' }'
	;;
mpdignorelist )
	readarray -t files <<< $( find /mnt/MPD -name .mpdignore | sort -V )
	for file in "${files[@]}"; do
		list+="\
$file
$( cat "$file" | sed 's|^| <grn>●</grn> |' )
"
	done
	echo "$list"
	;;
normalization )
	if [[ ${args[1]} == true ]]; then
		sed -i '/^user/ a\volume_normalization   "yes"' /etc/mpd.conf
	else
		sed -i '/^volume_normalization/ d' /etc/mpd.conf
	fi
	restartMPD
	;;
novolume )
	aplayname=${args[1]}
	card=${args[2]}
	hwmixer=${args[3]}
	sed -i -e '/volume_normalization/ d
	' -e '/^replaygain/ s/".*"/"off"/
	' /etc/mpd.conf
	mpc crossfade 0
	amixer -Mq sset "$hwmixer" 0dB
	echo none > "$dirsystem/mixertype-$aplayname"
	rm -f $dirsystem/{crossfade,equalizer,replaygain,normalization} /srv/http/data/shm/mpdvolume
	restartMPD
	curl -s -X POST http://127.0.0.1/pub?id=display -d '{ "volumenone": true }'
	;;
replaygaindisable )
	sed -i '/^replaygain/ s/".*"/"off"/' /etc/mpd.conf
	restartMPD
	;;
replaygainset )
	replaygain=${args[1]}
	sed -i '/^replaygain/ s/".*"/"'$replaygain'"/' /etc/mpd.conf
	echo $replaygain > $dirsystem/replaygain.conf
	restartMPD
	;;
restart )
	restartMPD
	;;
soxrdisable )
	sed -i -e '/quality/,/}/ d
' -e '/soxr/ a\
	quality        "very high"\
}
' /etc/mpd.conf
	restartMPD
	;;
soxrset )
	echo '	quality        "custom"
	precision      "'${args[1]}'"
	phase_response "'${args[2]}'"
	passband_end   "'${args[3]}'"
	stopband_begin "'${args[4]}'"
	attenuation    "'${args[5]}'"
	flags          "'${args[6]}'"
}' > $dirsystem/soxr.conf
	sed -i -e '/quality/,/}/ d
' -e "/soxr/ r $dirsystem/soxr.conf
" /etc/mpd.conf
	restartMPD
	;;
volume0db )
	amixer -Mq sset "${args[1]}" 0dB
	level=$( $dirbash/cmd.sh volumeget )
	pushstream volume '{"val":'$level',"db":"0.00"}'
	rm -f /srv/http/data/shm/mpdvolume
	;;
volumeget )
	vol_db=( $( $dirbash/cmd.sh volumeget$'\n'db ) )
	vol=${vol_db[0]}
	db=${vol_db[1]}
	echo $vol $db
	[[ ${args[1]} == push ]] && pushstream volume '{"val":'$vol',"db":"'$db'"}'
	;;
	
esac
