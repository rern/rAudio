#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

linkConf() {
	ln -sf $dirmpdconf/{conf/,}$cmd.conf
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

case $cmd in

audiooutput )
	echo $asoundcard > $dirsystem/asoundcard
	$dirsettings/player-conf.sh
	;;
autoupdate | ffmpeg | normalization )
	[[ $enable ]] && linkConf || rm $dirmpdconf/$cmd.conf
	systemctl restart mpd
	pushRefresh
	;;
btoutputall )
	[[ -e $dirmpdconf/bluetooth.conf ]] && bluetooth=1
	[[ -e $dirmpdconf/output.conf ]] && output=1
	if [[ $enable ]]; then
		touch $dirsystem/btoutputall
		[[ $bluetooth && ! $output ]] && restart=1
	else
		rm $dirsystem/btoutputall
		[[ $bluetooth && $output ]] && restart=1
	fi
	[[ $restart ]] && $dirsettings/player-conf.sh || pushRefresh
	;;
buffer | outputbuffer )
	if [[ $enable ]]; then
		if [[ $cmd == buffer ]]; then
			data='audio_buffer_size  "'$audio_buffer_size'"'
			[[ $audio_buffer_size != 4096 ]] && link=1
		else
			data='max_output_buffer_size  "'$max_output_buffer_size'"'
			[[ $max_output_buffer_size != 8192 ]] && link=1
		fi
		echo "$data" > $dirmpdconf/conf/$cmd.conf
	fi
	[[ $link ]] && linkConf || rm $dirmpdconf/$cmd.conf
	$dirsettings/player-conf.sh
	;;
crossfade )
	if [[ $enable ]]; then
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
$( getContent "$dirsystem/custom-output-$aplayname" )"
	;;
custom )
	if [[ $enable ]]; then
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
dop )
	[[ $enable ]] && touch "$dirsystem/dop-$aplayname" || rm -f "$dirsystem/dop-$aplayname"
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
	echo $hwmixer > "$dirsystem/hwmixer-$aplayname"
	$dirsettings/player-conf.sh
	;;
mixertype )
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
novolume )
	mpc -q crossfade 0
	amixer -Mq sset "$hwmixer" 0dB
	echo none > "$dirsystem/mixertype-$aplayname"
	rm -f $dirsystem/{camilladsp,crossfade,equalizer}
	rm -f $dirmpdconf/{normalization,replaygain,soxr}.conf
	$dirsettings/player-conf.sh
	pushstream display '{"volumenone":true}'
	;;
playback )
	$dirbash/cmd.sh $action
	;;
replaygain )
	fileoutput=$dirmpdconf/output.conf
	if [[ $enable ]]; then
		echo 'replaygain  "'$type'"' > $dirmpdconf/conf/replaygain.conf
		[[ $hardware ]] && touch $dirsystem/replaygain-hw || rm -f $dirsystem/replaygain-hw
		linkConf
	else
		rm $dirmpdconf/replaygain.conf
	fi
	$dirsettings/player-conf.sh
	;;
restartmpd )
	$dirsettings/player-conf.sh
	;;
soxr )
	rm -f $dirmpdconf/soxr* $dirsystem/soxr
	if [[ $enable ]]; then
		if [[ $quality == custom ]]; then
			data='
	plugin          "soxr"
	quality         "custom"
	precision       "'$precision'"
	phase_response  '$phase_response'"
	passband_end    "'$passband_end'"
	stopband_begin  "'$stopband_begin'"
	attenuation     "'$attenuation'"
	flags           "'$flags'"'
		else
			data='
	plugin   "soxr"
	quality  "'$quality'"
	thread   "'$thread'"'
		fi
		echo "\
resampler {\
$data
}" > $dirmpdconf/conf/$cmd.conf
		linkConf
		echo $quality > $dirsystem/soxr
	fi
	systemctl restart mpd
	pushRefresh
	;;
statusalbumignore )
	cat $dirmpd/albumignore
	;;
statusbtreceiver )
	mac=$( cut -d' ' -f1 $dirshm/btconnected )
	echo "\
<bll># bluealsa-aplay -L</bll>
$( bluealsa-aplay -L | grep -A2 $mac )

<bll># bluetoothctl info $mac</bll>
$( bluetoothctl info $mac )"
	;;
statusmpdignore )
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
statusnonutf8 )
	cat $dirmpd/nonutf8
	;;
statusoutput )
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
volume )
	amixer -c $asoundcard -Mq sset "$mixer" $vol%
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
