#!/bin/bash

# restartMPD                  - simple changes
# $dirsettings/player-conf.sh - complex changes

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< $1

columnFileOutput() {
	fileoutput=$dirmpdconf/output.conf
	conf=$( sed -E '/{$|^}/ d; s/  *"/^"/' $fileoutput | column -t -s^ )
	echo "\
audio_output {
$conf
}" > $fileoutput
}
linkConf() {
	ln -sf $dirmpdconf/{conf/,}${args[0]}.conf
}
restartMPD() {
	systemctl restart mpd
	pushRefresh
}
volumeBtGet() {
	voldb=$( amixer -MD bluealsa 2> /dev/null | awk -F'[[%dB]' '/%.*dB/ {print $2" "$4;exit}' )
}

case ${args[0]} in

audiooutput )
	echo ${args[1]} > $dirsystem/asoundcard
	$dirsettings/player-conf.sh
	;;
autoupdate | ffmpeg | normalization )
	[[ ${args[1]} == true ]] && linkConf || rm $dirmpdconf/${args[0]}.conf
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
buffer | outputbuffer )
	type=${args[0]}
	if [[ ${args[1]} == true ]]; then
		[[ $type == buffer ]] && setting='audio_buffer_size  "'${args[2]}'"' || setting='max_output_buffer_size  "'${args[2]}'"'
		echo "$setting" > $dirmpdconf/conf/$type.conf
		linkConf
	else
		rm $dirmpdconf/$type.conf
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
$( getContent $dirmpdconf/conf/custom.conf )
^^
$( getContent "$dirsystem/custom-output-${args[1]}" )"
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
			linkConf
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
	aplayname=$( aplay -l | awk -F'[][]' '/^card $card/ {print $2}' )
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
$( < /etc/asound.conf )"
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
filetype )
	type=$( mpd -V \
				| sed -n '/\[ffmpeg/ {s/.*ffmpeg. //; s/ rtp.*//; p}' \
				| tr ' ' '\n' \
				| sort )
	for i in {a..z}; do
		line=$( grep ^$i <<< $type | tr '\n' ' ' )
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
	[[ $mixertype == none ]] && none=true || none=false
	pushstream display '{"volumenone":'$none'}'
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
$( sed 's|^| <grn>•</grn> |' "$file" )
"
	done
	echo "$list"
	;;
nonutf8 )
	cat $dirmpd/nonutf8
	;;
novolume )
	aplayname=${args[1]}
	card=${args[2]}
	hwmixer=${args[3]}
	mpc -q crossfade 0
	amixer -Mq sset "$hwmixer" 0dB
	echo none > "$dirsystem/mixertype-$aplayname"
	rm -f $dirsystem/{camilladsp,crossfade,equalizer}
	rm -f $dirmpdconf/{normalization,replaygain,soxr}.conf
	$dirsettings/player-conf.sh
	pushstream display '{"volumenone":true}'
	;;
replaygain )
	if [[ ${args[1]} == true ]]; then
		echo 'replaygain  "'${args[2]}'"' > $dirmpdconf/conf/replaygain.conf
		if (( $( grep -Ec 'mixer_type.*hardware|replay_gain_handler' $dirmpdconf/output.conf ) == 1 )); then
			sed -i '/}/ i\	replay_gain_handler  "mixer"' $dirmpdconf/output.conf
		fi
		linkConf
	else
		sed -i '/replay_gain_handler/ d' $dirmpdconf/output.conf
		rm $dirmpdconf/replaygain.conf
	fi
	columnFileOutput
	restartMPD
	;;
soxr )
	rm -f $dirmpdconf/soxr*
	if [[ ${args[1]} == true ]]; then
		if [[ ${args[2]} == custom ]]; then
			cat << EOF > $dirmpdconf/conf/soxr-custom.conf
resampler {
	plugin          "soxr"
	quality         "custom"
	precision       "${args[3]}"
	phase_response  "${args[4]}"
	passband_end    "${args[5]}"
	stopband_begin  "${args[6]}"
	attenuation     "${args[7]}"
	flags           "${args[8]}"
}
EOF
		ln -sf $dirmpdconf/{conf/,}soxr-custom.conf
		else
			cat << EOF > $dirmpdconf/conf/soxr.conf
resampler {
	plugin   "soxr"
	quality  "${args[2]}"
	thread   "${args[3]}"
}
EOF
			linkConf
		fi
		echo ${args[2]} > $dirsystem/soxr
	else
		rm -f $dirsystem/soxr
	fi
	restartMPD
	;;
volume0db )
	amixer -c ${args[1]} -Mq sset "${args[2]}" 0dB
	alsactl store
	level=$( $dirbash/cmd.sh volumeget )
	pushstream volume '{"val":'$level',"db":"0.00"}'
	;;
volumebt0db )
	btdevice=${args[1]}
	amixer -D bluealsa -q sset "$btdevice" 0dB 2> /dev/null
	alsactl store
	volumeBtGet
	val=${voldb/ *}
	echo $val > "$dirsystem/btvolume-$btdevice"
	pushstream volumebt '{"val":'$val',"db":"0.00"}'
	;;
volumebtget )
	volumeBtGet
	echo $voldb
	;;
volumebtsave )
	echo ${args[1]} > "$dirsystem/btvolume-${args[2]}"
	alsactl store
	volumeBtGet
	pushstream volumebt '{"val":'${voldb/ *}',"db":"'${voldb/* }'"}'
	;;
volumeget )
	$dirbash/cmd.sh volumeget$'\n'${args[1]}
	;;
	
esac
