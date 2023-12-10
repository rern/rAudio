#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

linkConf() {
	ln -sf $dirmpdconf/{conf/,}$CMD.conf
}

case $CMD in

audiooutput )
	echo $CARD > $dirsystem/asoundcard
	$dirsettings/player-conf.sh
	;;
autoupdate | ffmpeg | normalization )
	[[ $ON ]] && linkConf || rm $dirmpdconf/$CMD.conf
	systemctl restart mpd
	pushRefresh
	;;
btoutputall )
	enableFlagSet
	[[ -e $dirmpdconf/bluetooth.conf ]] && bluetooth=1
	[[ -e $dirmpdconf/output.conf ]] && output=1
	if [[ $ON ]]; then
		[[ $bluetooth && ! $output ]] && restart=1
	else
		[[ $bluetooth && $output ]] && restart=1
	fi
	if [[ $restart ]]; then
		$dirsettings/player-conf.sh
	else
		pushRefresh
	fi
	;;
buffer | outputbuffer )
	if [[ $ON ]]; then
		if [[ $CMD == buffer ]]; then
			data='audio_buffer_size  "'$KB'"'
			[[ $KB != 4096 ]] && link=1
		else
			data='max_output_buffer_size  "'$KB'"'
			[[ $KB != 8192 ]] && link=1
		fi
		echo "$data" > $dirmpdconf/conf/$CMD.conf
	fi
	[[ $link ]] && linkConf || rm $dirmpdconf/$CMD.conf
	$dirsettings/player-conf.sh
	;;
crossfade )
	[[ $ON ]] && sec=$SEC || sec=0
	mpc -q crossfade $sec
	pushRefresh
	;;
customget )
	echo "\
$( getContent $dirmpdconf/conf/custom.conf )
^^
$( getContent "$dirsystem/custom-output-$APLAYNAME" )"
	;;
custom )
	if [[ $ON ]]; then
		fileglobal=$dirmpdconf/conf/custom.conf
		fileoutput=$dirsystem/custom-output-$APLAYNAME
		if [[ $GLOBAL ]]; then
			echo -e "$GLOBAL" > $fileglobal
			linkConf
		else
			rm -f $fileglobal
		fi
		[[ $OUTPUT ]] && echo -e "$OUTPUT" > "$fileoutput" || rm -f "$fileoutput"
		[[ $GLOBAL || $OUTPUT ]] && touch $dirsystem/custom || rm -f $dirsystem/custom
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
	filedop=$dirsystem/dop-${args[1]} # OFF with args - value by index
	[[ $ON ]] && touch "$filedop" || rm -f "$filedop"
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
	echo $HWMIXER > "$dirsystem/hwmixer-$APLAYNAME"
	$dirsettings/player-conf.sh
	;;
mixertype )
	if [[ $MIXERTYPE == software ]]; then
		[[ -e $dirshm/amixercontrol ]] && mpc volume $( volumeGet value )
	else
		rm -f $dirsystem/replaygain-hw
	fi
	if [[ $HWMIXER ]]; then # set 0dB
		mpc -q stop
		[[ $MIXERTYPE == hardware ]] && vol=$( mpc status %volume% ) || vol=0dB
		amixer -c $CARD -Mq sset "$HWMIXER" $vol
	fi
	filemixertype=$dirsystem/mixertype-$APLAYNAME
	[[ $MIXERTYPE == hardware ]] && rm -f "$filemixertype" || echo $MIXERTYPE > "$filemixertype"
	$dirsettings/player-conf.sh
	[[ $MIXERTYPE == none ]] && tf=true || tf=false
	pushData display '{ "volumenone": '$tf' }'
	;;
novolume )
	mpc -q crossfade 0
	amixer -c $CARD -Mq sset "$HWMIXER" 0dB
	echo none > "$dirsystem/mixertype-$APLAYNAME"
	rm -f $dirsystem/{camilladsp,crossfade,equalizer}
	rm -f $dirmpdconf/{normalization,replaygain,soxr}.conf
	$dirsettings/player-conf.sh
	pushData display '{ "volumenone": true }'
	;;
replaygain )
	if [[ $ON ]]; then
		echo 'replaygain  "'$TYPE'"' > $dirmpdconf/conf/replaygain.conf
		[[ $HARDWARE ]] && touch $dirsystem/replaygain-hw || rm -f $dirsystem/replaygain-hw
		linkConf
	else
		rm $dirmpdconf/replaygain.conf
	fi
	$dirsettings/player-conf.sh
	;;
soxr )
	rm -f $dirmpdconf/soxr* $dirsystem/soxr
	if [[ $ON ]]; then
		if [[ $QUALITY == custom ]]; then
			data='
	plugin          "soxr"
	quality         "custom"
	precision       "'$PRECISION'"
	phase_response  '$PHASE_RESPONSE'"
	passband_end    "'$PASSBAND_END'"
	stopband_begin  "'$STOPBAND_BEGIN'"
	attenuation     "'$ATTENUATION'"
	flags           "'$FLAGS'"'
		else
			data='
	plugin   "soxr"
	quality  "'$QUALITY'"
	thread   "'$THREAD'"'
		fi
		echo "\
resampler {\
$data
}" > $dirmpdconf/conf/$CMD.conf
		linkConf
		echo $QUALITY > $dirsystem/soxr
	fi
	systemctl restart mpd
	pushRefresh
	;;
statusalbumignore )
	cat $dirmpd/albumignore
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
"
	if [[ ! -e $dirsystem/camilladsp ]]; then
		devices+="
<bll># amixer scontrols</bll>"
		card=$( < $dirsystem/asoundcard )
		aplayname=$( aplay -l | awk -F'[][]' '/^card $card/ {print $2}' )
		if [[ $aplayname != snd_rpi_wsp ]]; then
			devices+="
$( amixer scontrols )
"
		else
			devices+="\
Simple mixer control 'HPOUT1 Digital',0
Simple mixer control 'HPOUT2 Digital',0
Simple mixer control 'SPDIF Out',0
Simple mixer control 'Speaker Digital',0
"
		fi
	fi
	devices+="
<bll># cat /etc/asound.conf</bll>
$( < /etc/asound.conf )"
	echo "$devices"
	;;
volume )
	amixer -c $CARD -Mq sset "$MIXER" $VAL%
	[[ $VAL > 0 ]] && rm -f $dirsystem/volumemute
	;;
volumebt )
	amixer -MqD bluealsa sset "$MIXER" $VAL%
	;;
volume0db )
	[[ ! -e $dirshm/amixercontrol ]] && exit
	
	card=$( < $dirsystem/asoundcard )
	control=$( < $dirshm/amixercontrol )
	amixer -c $card -Mq sset "$control" 0dB
	volumeGet push hw
	;;
volume0dbbt )
	btdevice=$( < $dirshm/btreceiver )
	amixer -MqD bluealsa sset "$btdevice" 0dB 2> /dev/null
	volumeGet push hw
	;;
volumeget )
	volumeGet valdb
	;;
volumepush )
	volumeGet push hw
	;;
	
esac
