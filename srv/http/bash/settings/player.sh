#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< $1

linkConf() {
	ln -sf $dirmpdconf/{conf/,}${args[0]}.conf
}
volumeGet() {
	card=$( < $dirsystem/asoundcard )
	control=$( getContent $dirshm/amixercontrol )
	[[ ! $control ]] && exit
	
	amixer=$( amixer -c $card -M sget "$control" )
	if grep -q dB <<< $amixer; then
		awk -F'[[%dB]' '/%.*dB/ {print $2" "$4;exit}' <<< $amixer
	else
		grep -m1 % <<< $amixer | sed -E 's/.*\[(.*)%].*/\1/'
	fi
}
volumeGetBt() {
	amixer -MD bluealsa 2> /dev/null | awk -F'[[%dB]' '/%.*dB/ {print $2" "$4;exit}'
}

case ${args[0]} in

audiooutput )
	echo ${args[1]} > $dirsystem/asoundcard
	$dirsettings/player-conf.sh
	;;
autoupdate | ffmpeg | normalization )
	[[ ${args[1]} == true ]] && linkConf || rm $dirmpdconf/${args[0]}.conf
	systemctl restart mpd
	pushRefresh
	;;
albumignore )
	cat $dirmpd/albumignore
	;;
bluetoothinfo )
	mac=$( cut -d' ' -f1 $dirshm/btconnected )
	echo "\
<bll># bluealsa-aplay -L</bll>
$( bluealsa-aplay -L | grep -A2 $mac )

<bll># bluetoothctl info $mac</bll>
$( bluetoothctl info $mac )"
	;;
buffer | outputbuffer )
	type=${args[0]}
	if [[ ${args[1]} == true ]]; then
		kb=${args[2]}
		if [[ $type == buffer ]]; then
			setting='audio_buffer_size  "'$kb'"'
		else
			setting='max_output_buffer_size  "'$kb'"'
		fi
		echo "$setting" > $dirmpdconf/conf/$type.conf
		linkConf
	else
		rm $dirmpdconf/$type.conf
	fi
	$dirsettings/player-conf.sh
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
			echo 0
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
		touch "$dirsystem/dop-${args[2]}"
	else
		rm -f "$dirsystem/dop-${args[2]}"
	fi
	$dirsettings/player-conf.sh
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
			vol=$( mpc status %volume% | tr -d ' %n/a' )
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
	[[ $mixertype != software ]] && rm -f $dirsystem/replaygain-hw
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
	fileoutput=$dirmpdconf/output.conf
	if [[ ${args[1]} == true ]]; then
		echo 'replaygain  "'${args[2]}'"' > $dirmpdconf/conf/replaygain.conf
		[[ ${args[3]} == true ]] && touch $dirsystem/replaygain-hw || rm -f $dirsystem/replaygain-hw
		linkConf
	else
		rm $dirmpdconf/replaygain.conf
	fi
	$dirsettings/player-conf.sh
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
	systemctl restart mpd
	pushRefresh
	;;
volume0db )
	card=$( < $dirsystem/asoundcard )
	control=$( getContent $dirshm/amixercontrol )
	[[ ! $control ]] && exit
	
	amixer -c $card -Mq sset "$control" 0dB
	alsactl store
	voldb=$( volumeGet )
	pushstream volume '{"val":'${voldb/ *}',"db":"0.00"}'
	;;
volume0dbbt )
	btdevice=$( < $dirshm/btreceiver )
	amixer -MD bluealsa -q sset "$btdevice" 0dB 2> /dev/null
	voldb=$( volumeGetBt )
	vol=${voldb/ *}
	echo $vol > "$dirsystem/btvolume-$btdevice"
	pushstream volume '{"val":'$vol',"db":"0.00"}'
	;;
volumeget )
	volumeGet
	;;
volumegetbt )
	volumeGetBt
	;;
volumepush )
	voldb=$( volumeGet )
	vol=${voldb/ *}
	db=${voldb/* }
	pushstream volume '{"val":'$vol',"db":"'$db'"}'
	;;
volumepushbt )
	voldb=$( volumeGetBt )
	vol=${voldb/ *}
	db=${voldb/* }
	pushstream volume '{"val":'$vol',"db":"'$db'"}'
	btdevice=$( < $dirshm/btreceiver )
	echo $vol > "$dirsystem/btvolume-$btdevice"
	;;
	
esac
