#!/bin/bash

# restartMPD                  - simple changes
# $dirsettings/player-conf.sh - complex changes

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< "$1"

columnFileOutput() {
	fileoutput=$dirmpdconf/output.conf
	conf=$( sed '/{\|}/ d; s/  *"/^"/' $fileoutput | column -t -s^ )
	echo "\
audio_output {
$conf
}" > $fileoutput
}
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
		ln -s $dirmpdconf/{conf/,}autoupdate.conf
	else
		rm $dirmpdconf/autoupdate.conf
	fi
	restartMPD
	;;
albumignore )
	cat $dirmpd/albumignore
	;;
bluetoothinfo )
	mac=$( cut -d' ' -f1 $dirshm/btconnected )
	echo "\
<bll># bluetoothctl info $mac</bll>
$( bluetoothctl info $mac )"
	;;
buffer )
	if [[ ${args[1]} == true ]]; then
		echo 'audio_buffer_size "'${args[2]}'"' > $dirmpdconf/conf/buffer.conf
		ln -sf $dirmpdconf/{conf/,}buffer.conf
	else
		rm $dirmpdconf/buffer.conf
	fi
	restartMPD
	;;
bufferoutput )
	if [[ ${args[1]} == true ]]; then
		echo 'max_output_buffer_size "'${args[2]}'"' > $dirmpdconf/conf/outputbuffer.conf
		ln -sf $dirmpdconf/{conf/,}outputbuffer.conf
	else
		rm $dirmpdconf/outputbuffer.conf
	fi
	restartMPD
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
$( cat $dirmpdconf/conf/custom.conf 2> /dev/null )
^^
$( cat "$dirsystem/custom-output-${args[1]}" 2> /dev/null )"
	;;
custom )
	if [[ ${args[1]} == true ]]; then
		global=${args[2]}
		output=${args[3]}
		aplayname=${args[4]}
		fileglobal=$dirmpdconf/conf/custom.conf
		fileoutput="$dirsystem/custom-output-$aplayname"
		if [[ $global ]]; then
			echo -e "$global" > $fileglobal
			ln -sf $dirmpdconf/{conf/,}custom.conf
		else
			rm -f $fileglobal
		fi
		[[ $output ]] && echo -e "$output" > "$fileoutput" || rm -f "$fileoutput"
		[[ $global || $output ]] && touch $dirsystem/custom || rm -f $dirsystem/custom
		$dirsettings/player-conf.sh
		if ! systemctl -q is-active mpd; then # config errors
			rm -f $fileglobal "$fileoutput" $dirsystem/custom
			$dirsettings/player-conf.sh
			echo -1
		fi
	else
		rm -f $dirmpdconf/custom.conf $dirsystem/custom
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
	if [[ ${args[1]} == true ]]; then
		sed -i '/}/ i\	dop  "yes"' $dirmpdconf/output.conf
		touch "$dirsystem/dop-${args[2]}"
	else
		sed -i '/dop.*yes/ d' $dirmpdconf/output.conf
		rm -f "$dirsystem/dop-${args[2]}"
	fi
	columnFileOutput
	restartMPD
	;;
ffmpeg )
	if [[ ${args[1]} == true ]]; then
		ln -s $dirmpdconf/{conf/,}ffmpeg.conf
	else
		rm $dirmpdconf/ffmpeg.conf
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
		ln -s $dirmpdconf/{conf/,}normalization.conf
	else
		rm $dirmpdconf/normalization.conf
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
replaygain )
	sed -i '/replay_gain_handler/ d' $dirmpdconf/output.conf
	if [[ ${args[1]} == true ]]; then
		echo 'replaygain          "'${args[2]}'"' > $dirmpdconf/conf/replaygain.conf
		grep -q mixer_type.*hardware $dirmpdconf/output.conf && sed -i '/}/ i\	replay_gain_handler  "mixer"' $dirmpdconf/output.conf
		ln -sf $dirmpdconf/{conf/,}replaygain.conf
	else
		rm $dirmpdconf/replaygain.conf
	fi
	columnFileOutput
	restartMPD
	;;
soxr )
	if [[ ${args[1]} == true ]]; then
		cat << EOF > $dirmpdconf/conf/soxr-custom.conf
resampler {
	plugin          "soxr"
	quality         "custom"
	precision       "${args[2]}"
	phase_response  "${args[3]}"
	passband_end    "${args[4]}"
	stopband_begin  "${args[5]}"
	attenuation     "${args[6]}"
	flags           "${args[7]}"
}
EOF
		ln -sf $dirmpdconf/conf/soxr-custom.conf $dirmpdconf/soxr.conf
	else
		ln -sf $dirmpdconf/{conf/,}soxr.conf
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
