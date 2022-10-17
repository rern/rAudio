#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< "$1"

volumeBtGet() {
	voldb=$( amixer -MD bluealsa 2> /dev/null \
		| grep -m1 '%.*dB' \
		| sed -E 's/.*\[(.*)%\] \[(.*)dB.*/\1 \2/' )
}
restartMPD() {
	$dirsettings/player-conf.sh
}

case ${args[0]} in

audiooutput )
	echo ${args[1]} > $dirsystem/asoundcard
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
albumignore )
	cat $dirmpd/albumignore
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
crossfadedisable )
	mpc -q crossfade 0
	pushRefresh
	;;
crossfadeset )
	crossfade=${args[1]}
	mpc -q crossfade $crossfade
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
	echo "\
$( cat $dirsystem/custom-global 2> /dev/null )
^^
$( cat "$dirsystem/custom-output-${args[1]}" 2> /dev/null )"
	;;
customset )
	file=$dirsystem/custom
	global=${args[1]}
	output=${args[2]}
	aplayname=${args[3]}
	[[ $global ]] && echo -e "$global" > $file-global || rm -f $file-global
	if [[ $output ]]; then
		echo -e "$output" > "$file-output-$aplayname"
	else
		rm -f "$file-output-$aplayname"
	fi
	[[ $global || $output ]] && touch $file
	restartMPD
	if ! systemctl -q is-active mpd; then
		sed -i '/ #custom$/ d' /etc/mpd.conf
		rm -f $dirsystem/custom
		restartMPD
		echo -1
	fi
	;;
devices )
	bluealsa=$( amixer -D bluealsa 2> /dev/nulll \
					| grep -B1 pvolume \
					| head -1 )
	[[ $bluealsa ]] && devices="\
<bll># amixer -D bluealsa scontrols</bll>
$bluealsa

"
	devices+="\
<bll># aplay -l | grep ^card</bll>
$( aplay -l | grep ^card | grep -v 'Loopback.*device 1' )

<bll># amixer scontrols</bll>"
	card=$( < $dirsystem/asoundcard )
	aplayname=$( aplay -l \
					| grep "^card $card" \
					| awk -F'[][]' '{print $2}' )
	if [[ $aplayname != snd_rpi_wsp ]]; then
		devices+="
$( amixer -c $card scontrols )
"
	else
		devices+="\
Simple mixer control 'HPOUT1 Digital',0
Simple mixer control 'HPOUT2 Digital',0
Simple mixer control 'SPDIF Out',0
Simple mixer control 'Speaker Digital',0
"
	fi
	devices+="
<bll># cat /etc/asound.conf</bll>
$( cat /etc/asound.conf )"
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
ffmpeg )
	if [[ ${args[1]} == true ]]; then
		sed -i '/^resampler/ i\
decoder {\
	plugin         "ffmpeg"\
	enabled        "yes"\
}\

' /etc/mpd.conf
	else
		sed -i '/decoder/,+4 d' /etc/mpd.conf
	fi
	restartMPD
	;;
filetype )
	type=$( mpd -V | grep '\[ffmpeg' | sed 's/.*ffmpeg. //; s/ rtp.*//' | tr ' ' '\n' | sort )
	for i in {a..z}; do
		line=$( grep ^$i <<< "$type" | tr '\n' ' ' )
		[[ $line ]] && list+=${line:0:-1}'<br>'
	done
	echo "${list:0:-4}"
	;;
hwmixer )
	aplayname=${args[1]}
	hwmixer=${args[2]}
	echo $hwmixer > "$dirsystem/hwmixer-$aplayname"
	sed -i '/mixer_control_name = / s/".*"/"'$hwmixer'"/' /etc/shairport-sync.conf
	systemctl try-restart shairport-sync shairport-meta
	restartMPD
	;;
mixertype )
	mixertype=${args[1]}
	aplayname=${args[2]}
	hwmixer=${args[3]}
	if [[ $hwmixer ]]; then # set 0dB
		mpc -q stop
		if [[ $mixertype == hardware ]];then
			vol=$( mpc volume | cut -d: -f2 | tr -d ' %' )
			amixer -Mq sset "$hwmixer" $vol%
		else
			amixer -Mq sset "$hwmixer" 0dB
		fi
	fi
	if [[ $mixertype == hardware ]]; then
		rm -f "$dirsystem/mixertype-$aplayname"
	else
		echo $mixertype > "$dirsystem/mixertype-$aplayname"
	fi
	restartMPD
	curl -s -X POST http://127.0.0.1/pub?id=display -d '{ "volumenone": '$( [[ $mixertype == none ]] && echo true || echo false )' }'
	;;
mpdignorelist )
	file=$dirmpd/mpdignorelist
	readarray -t files < $file
	list="\
<bll># find /mnt/MPD -name .mpdignore</bll>
"
	for file in "${files[@]}"; do
		list+="\
$file
$( cat "$file" | sed 's|^| <grn>●</grn> |' )
"
	done
	echo "$list"
	;;
nonutf8 )
	cat $dirmpd/nonutf8
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
	mpc -q crossfade 0
	amixer -Mq sset "$hwmixer" 0dB
	echo none > "$dirsystem/mixertype-$aplayname"
	rm -f $dirsystem/{camilladsp,crossfade,equalizer,replaygain,normalization}
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
	amixer -c ${args[1]} -Mq sset "${args[2]}" 0dB
	level=$( $dirbash/cmd.sh volumeget )
	data='{"val":'$level',"db":"0.00"}'
	pushstream volume "$data"
	;;
volumebt0db )
	amixer -D bluealsa -q sset "${args[1]}" 0dB 2> /dev/null
	volumeBtGet
	data='{"val":'${voldb/ *}',"db":"0.00"}'
	pushstream volumebt "$data"
	;;
volumebtget )
	volumeBtGet
	echo $voldb
	;;
volumebtsave )
	echo ${args[1]} > "$dirsystem/btvolume-${args[2]}"
	volumeBtGet
	data='{"val":'${voldb/ *}',"db":"'${voldb/* }'"}'
	pushstream volumebt "$data"
	;;
volumeget )
	$dirbash/cmd.sh volumeget$'\n'${args[1]}
	;;
	
esac
