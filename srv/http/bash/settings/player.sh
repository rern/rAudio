#!/bin/bash

# restartMPD                  - simple changes
# $dirsettings/player-conf.sh - complex changes

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< "$1"

restartMPD() {
	systemctl restart mpd
	pushRefresh
}
volumeBtGet() {
	voldb=$( amixer -MD bluealsa 2> /dev/null \
		| grep -m1 '%.*dB' \
		| sed -E 's/.*\[(.*)%\] \[(.*)dB.*/\1 \2/' )
}

case ${args[0]} in

audiooutput )
	echo ${args[1]} > $dirsystem/asoundcard
	$dirsettings/player-conf.sh
	;;
autoupdate )
	if [[ ${args[1]} == true ]]; then
		sed -i '1 i\auto_update            "yes"' $mpdconf
	else
		sed -i '/^auto_update/ d' $mpdconf
	fi
	restartMPD
	;;
albumignore )
	cat $dirmpd/albumignore
	;;
bufferdisable )
	sed -i '/^audio_buffer_size/ d' $mpdconf
	restartMPD
	;;
bufferset )
	buffer=${args[1]}
	sed -i '/^audio_buffer_size/ d' $mpdconf
	if (( $buffer == 4096 )); then
		rm -f $dirsystem/buffer.conf
	else
		sed -i '1 i\audio_buffer_size      "'$buffer'"' $mpdconf
		echo $buffer > $dirsystem/buffer.conf
	fi
	restartMPD
	;;
bufferoutputdisable )
	sed -i '/^max_output_buffer_size/ d' $mpdconf
	restartMPD
	;;
bufferoutputset )
	buffer=${args[1]}
	sed -i '/^max_output_buffer_size/ d' $mpdconf
	if (( $buffer == 8192 )); then
		rm -f $dirsystem/bufferoutput.conf
	else
		sed -i '1 i\max_output_buffer_size "'$buffer'"' $mpdconf
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
	rm -f $dirsystem/custom
	$dirsettings/player-conf.sh
	;;
customget )
	echo "\
$( cat $dirmpd/mpd-custom.conf 2> /dev/null )
^^
$( cat "$dirsystem/custom-output-${args[1]}" 2> /dev/null )"
	;;
customset )
	global=${args[1]}
	output=${args[2]}
	aplayname=${args[3]}
	fileglobal=$dirmpd/mpd-custom.conf
	fileoutput="$dirsystem/custom-output-$aplayname"
	[[ $global ]] && echo -e "$global" > $fileglobal || rm -f $fileglobal
	[[ $output ]] && echo -e "$output" > "$fileoutput" || rm -f "$fileoutput"
	[[ $global || $output ]] && touch $dirsystem/custom
	$dirsettings/player-conf.sh
	if ! systemctl -q is-active mpd; then # config errors
		rm -f $file*
		$dirsettings/player-conf.sh
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
		name=${aplayname/bcm2835/On-board}
		line=$( sed -n "/name.*$name/,/}/ =" $mpdconf | tail -1 )
		sed -i "$line i\	dop            \"yes\"" $mpdconf
		touch "$dirsystem/dop-$aplayname"
	else
		sed -i '/dop.*yes/ d' $mpdconf
		rm -f "$dirsystem/dop-$aplayname"
	fi
	restartMPD
	;;
ffmpeg )
	if [[ ${args[1]} == true ]]; then
		sed -i '/mpd-soxr/ a\
include "mpd-ffmpeg.conf"
' $mpdconf
		touch $dirsystem/ffmpeg
	else
		sed -i '/mpd-ffmpeg/ d' $mpdconf
		rm $dirsystem/ffmpeg
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
	$dirsettings/player-conf.sh
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
	$dirsettings/player-conf.sh
	data='{"volumenone":'$( [[ $mixertype == none ]] && echo true || echo false )'}'
	pushstream display "$data"
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
		sed -i '/^user/ i\volume_normalization  "yes"' $mpdconf
	else
		sed -i '/^volume_normalization/ d' $mpdconf
	fi
	restartMPD
	;;
novolume )
	aplayname=${args[1]}
	card=${args[2]}
	hwmixer=${args[3]}
	sed -i -E '/^replaygain|^volume_normalization/ d' $mpdconf
	mpc -q crossfade 0
	amixer -Mq sset "$hwmixer" 0dB
	echo none > "$dirsystem/mixertype-$aplayname"
	rm -f $dirsystem/{camilladsp,crossfade,equalizer,replaygain,normalization}
	$dirsettings/player-conf.sh
	data='{"volumenone":true}'
	pushstream display "$data"
	;;
replaygaindisable )
	sed -i '/^replaygain/ d' $mpdconf
	restartMPD
	;;
replaygainset )
	replaygain=${args[1]}
	sed -i '/^user/ i\replaygain          "'$replaygain'"' $mpdconf
	echo $replaygain > $dirsystem/replaygain.conf
	restartMPD
	;;
soxrdisable )
	sed -i 's/mpd-soxr-custom.conf/mpd-soxr.conf/' $mpdconf
	rm $dirsystem/soxr
	restartMPD
	;;
soxrset )
cat << EOF > $dirmod/mpd-soxr-custom.conf
resampler {
	plugin         "soxr"
	quality        "custom"
	precision      "${args[1]}"
	phase_response "${args[2]}"
	passband_end   "${args[3]}"
	stopband_begin "${args[4]}"
	attenuation    "${args[5]}"
	flags          "${args[6]}"
}
EOF
	sed -i 's/mpd-soxr.conf/mpd-soxr-custom.conf/' $mpdconf
	touch $dirsystem/soxr
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
