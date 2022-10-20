#!/bin/bash

# restartMPD                  - simple changes
# $dirsettings/player-conf.sh - complex changes

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< "$1"

restartMPD() {
	if [[ $1 ]]; then
		file=$dirmpd/$1.conf
		conf=$( sed 's/  *"/@"/' $file | column -t -s@ )
		echo "\
$( grep -v ^i <<< "$conf" | sort )
$( grep ^i <<< "$conf" )" > $file
	fi
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
		echo 'auto_update            "yes"' >> $mpdconf
	else
		sed -i '/^auto_update/ d' $mpdconf
	fi
	restartMPD mpd
	;;
albumignore )
	cat $dirmpd/albumignore
	;;
buffer )
	if [[ ${args[1]} == true ]]; then
		buffer=${args[2]}
		sed -i '/^audio_buffer_size/ d' $mpdconf
		if (( $buffer == 4096 )); then
			rm -f $dirsystem/buffer.conf
		else
			echo 'audio_buffer_size      "'$buffer'"' >> $mpdconf
			echo $buffer > $dirsystem/buffer.conf
		fi
	else
		sed -i '/^audio_buffer_size/ d' $mpdconf
	fi
	restartMPD mpd
	;;
bufferoutput )
	if [[ ${args[1]} == true ]]; then
		buffer=${args[2]}
		sed -i '/^max_output_buffer_size/ d' $mpdconf
		if (( $buffer == 8192 )); then
			rm -f $dirsystem/bufferoutput.conf
		else
			echo 'max_output_buffer_size "'$buffer'"' >> $mpdconf
			echo $buffer > $dirsystem/bufferoutput.conf
		fi
	else
		sed -i '/^max_output_buffer_size/ d' $mpdconf
	fi
	restartMPD mpd
	;;
crossfade )
	if [[ ${args[1]} == true ]]; then
		crossfade=${args[2]}
		mpc -q crossfade $crossfade
		echo $crossfade > $dirsystem/crossfade.conf
		touch $dirsystem/crossfade
	else
		mpc -q crossfade 0
	fi
	pushRefresh
	;;
customget )
	echo "\
$( cat $dirmpd/mpd-custom.conf 2> /dev/null )
^^
$( cat "$dirsystem/custom-output-${args[1]}" 2> /dev/null )"
	;;
custom )
	if [[ ${args[1]} == true ]]; then
		global=${args[2]}
		output=${args[3]}
		aplayname=${args[4]}
		fileglobal=$dirmpd/mpd-custom
		fileoutput="$dirsystem/custom-output-$aplayname"
		if [[ $global ]]; then
			echo -e "$global" > $fileglobal
			ln -sf $fileglobal{,.conf}
		else
			rm -f $fileglobal*
		fi
		[[ $output ]] && echo -e "$output" > "$fileoutput" || rm -f "$fileoutput"
		[[ $global || $output ]] && touch $dirsystem/custom || rm -f $dirsystem/custom
		$dirsettings/player-conf.sh
		if ! systemctl -q is-active mpd; then # config errors
			rm -f $fileglobal* "$fileoutput" $dirsystem/custom
			$dirsettings/player-conf.sh
			echo -1
		fi
	else
		rm -f $dirmpd/mpd-custom.conf $dirsystem/custom
		$dirsettings/player-conf.sh
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
	file="$dirsystem/dop-${args[2]}"
	if [[ $dop == true ]]; then
		sed -i '/}/ i\	dop            "yes"' $dirmpd/mpd-output.conf
		touch "$file"
	else
		sed -i '/dop.*yes/ d' $dirmpd/mpd-output.conf
		rm -f "$file"
	fi
	restartMPD mpd-output
	;;
ffmpeg )
	if [[ ${args[1]} == true ]]; then
		ln -s $dirmpd/conf/mpd-ffmpeg.conf $dirmpd
	else
		rm $dirmpd/mpd-ffmpeg.conf
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
		echo 'volume_normalization  "yes"' >> $mpdconf
	else
		sed -i '/^volume_normalization/ d' $mpdconf
	fi
	restartMPD mpd
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
replaygain )
	if [[ ${args[1]} == true ]]; then
		replaygain=${args[2]}
		echo 'replaygain          "'$replaygain'"' >> $mpdconf
		echo $replaygain > $dirsystem/replaygain.conf
	else
		sed -i '/^replaygain/ d' $mpdconf
	fi
	restartMPD mpd
	;;
soxr )
	if [[ ${args[1]} == true ]]; then
		cat << EOF > $dirmpd/conf/mpd-soxr-custom.conf
resampler {
	plugin         "soxr"
	quality        "custom"
	precision      "${args[2]}"
	phase_response "${args[3]}"
	passband_end   "${args[4]}"
	stopband_begin "${args[5]}"
	attenuation    "${args[6]}"
	flags          "${args[7]}"
}
EOF
		ln -sf $dirmpd/conf/mpd-soxr-custom.conf $dirmpd/mpd-soxr.conf
	else
		ln -sf $dirmpd/conf/mpd-soxr.conf $dirmpd
	fi
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
