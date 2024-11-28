#!/bin/bash

getVarYml() { # var: value || var: "value";*
	if [[ $2 ]]; then
		sed -n -E '/^\s*'$1':/,/^\s*'$2':/ {/'$2'/! d; s/^.*:\s"*|"*$//g; p}' "$fileconf" # /var1/,/var2/ > var2: value > value
	else
		sed -n -E '/^\s*'$1':/ {s/^.*:\s"*|"*$//g; p}' "$fileconf"                        # var: value value
	fi
}

### included by <<< player-conf.sh
[[ ! $dirbash ]] && . /srv/http/bash/common.sh     # if run directly
[[ ! $CARD ]] && . <( sed -n -E '/^card|^name/ {s/(^card|^name)/\U\1/;p}' $dirshm/output )

if [[ -e $dirshm/btreceiver ]]; then
	BLUETOOTH=1
	systemctl -q is-active localbrowser && action=stop || action=start
	systemctl $action bluetoothbutton
else
	systemctl stop bluetoothbutton
fi
if [[ -e $dirsystem/camilladsp ]]; then
	modprobe snd_aloop
	if ! aplay -l | grep -q Loopback; then
		error='<c>Loopback</c> not available &emsp;'
		rmmod snd-aloop &> /dev/null
	fi
	fileconf=$( getVar CONFIG /etc/default/camilladsp )
	! camilladsp -c "$fileconf" &> /dev/null && error+="<c>$fileconf</c> not valid"
	if [[ $error ]]; then
		notify 'warning yl' CamillaDSP "Error: $error" -1
		rm $dirsystem/camilladsp
		$dirsettings/player-conf.sh
		exit
# --------------------------------------------------------------------
	fi
	CAMILLADSP=1
	channels=$( getVarYml capture channels )
	format=$( getVarYml capture format )
	samplerate=$( getVarYml samplerate )
########
	ASOUNDCONF+='
pcm.!default { 
	type plug
	slave.pcm camilladsp
}
pcm.camilladsp {
	type plug
	slave {
		pcm {
			type     hw
			card     Loopback
			device   0
			channels '$channels'
			format   '$format'
			rate     '$samplerate'
		}
	}
}
ctl.!default {
	type hw
	card Loopback
}
ctl.camilladsp {
	type hw
	card Loopback
}'
else
	systemctl stop camilladsp &> /dev/null
	rmmod snd-aloop &> /dev/null
	if [[ $BLUETOOTH ]]; then
########
		ASOUNDCONF+='
pcm.bluealsa {
	type plug
	slave.pcm {
		type bluealsa
		device 00:00:00:00:00:00
		profile "a2dp"
	}
}'
	fi
	if [[ -e $dirsystem/equalizer ]]; then
		if [[ $BLUETOOTH ]]; then
			slavepcm=bluealsa
		elif [[ $CARD != -1 ]]; then
			slavepcm='"plughw:'$CARD',0"'
		fi
		if [[ $slavepcm ]]; then
			EQUALIZER=1
########
			ASOUNDCONF+='
pcm.!default {
	type plug
	slave.pcm plugequal
}
pcm.plugequal {
	type equal
	slave.pcm '$slavepcm'
}
ctl.equal {
	type equal
}'
		fi
	fi
fi
######## >
echo "$ASOUNDCONF" >> /etc/asound.conf # append after default lines set by player-devices.sh

# ----------------------------------------------------------------------------
if [[ $CAMILLADSP ]]; then
	# must stop for exclusive device access - aplay probing
	$dirbash/cmd.sh playerstop
	systemctl stop camilladsp
	default=$( < /etc/default/camilladsp )
	configfile=$( sed -n '/^CONFIG/ {s/.*=//; p}' <<< $default )
	if grep -q -m1 configs-bt <<< $default; then
		bluetooth=true
		name=$( < $dirshm/btname )
		grep -q dbus_path "$configfile" && DEVICES=( '{ "Bluez": "bluez" }' '{ "blueALSA": "bluealsa" }' )
	else
		DEVICES=( '{ "Loopback": "hw:Loopback,0" }' "$( < $dirshm/devices )" )
	fi
	for c in Loopback $CARD; do
		lines=$( tty2std "timeout 0.1 aplay -D hw:$c /dev/zero --dump-hw-params" )
		CHANNELS+=( $( awk '/^CHANNELS/ {print $NF}' <<< $lines | tr -d ']\r' ) )
		formats=$( sed -n '/^FORMAT/ {s/_3LE/LE3/; s/FLOAT_LE/FLOAT32LE/; s/^.*: *\|[_\r]//g; s/ /\n/g; p}' <<< $lines )
		listformat=
		for f in FLOAT64LE FLOAT32LE S32LE S24LE3 S24LE S16LE; do
			grep -q $f <<< $formats && listformat+=', "'$f'"'
		done
		FORMATS+=( "[ ${listformat:1} ]" )
		if [[ $c != Loopback ]]; then
			ratemax=$( sed -n -E '/^RATE/ {s/.* (.*)].*/\1/; p}' <<< $lines )
			for r in 44100 48000 88200 96000 176400 192000 352800 384000 705600 768000; do
				(( $r > $ratemax )) && break || SAMPLINGS+=', "'$( sed 's/...$/,&/' <<< $r )'": '$r
			done
		fi
	done
######## >
	data='
  "capture"  : {
	  "device"   : '${DEVICES[0]}'
	, "channels" : '${CHANNELS[0]}'
	, "formats"  : '${FORMATS[0]}'
}
, "playback" : {
	  "device"   : '${DEVICES[1]}'
	, "channels" : '${CHANNELS[1]}'
	, "formats"  : '${FORMATS[1]}'
}
, "samplings" : {
	'${SAMPLINGS:1}'
}'
	echo "{ $data }" | jq > $dirshm/camilladevices
######## <
	[[ -e /etc/default/camilladsp.backup ]] && mv -f /etc/default/camilladsp{.backup,}
	if [[ $BLUETOOTH ]]; then
		$dirsettings/camilla-bluetooth.sh btreceiver
	else
		fileformat="$dirsystem/camilla-$NAME"
		[[ -e $fileformat ]] && FORMAT=$( getContent "$fileformat" ) || FORMAT=$( jq -r .playback.formats[0] $dirshm/camilladevices )
		format0=$( getVarYml playback format )
		if [[ $format0 != $FORMAT ]]; then
			sed -i -E '/playback:/,/format:/ s/^(\s*format: ).*/\1'$FORMAT'/' "$fileconf"
			echo $FORMAT > "$fileformat"
		fi
		card0=$( getVarYml playback device | cut -c4 )
		[[ $card0 != $CARD ]] && sed -i -E '/playback:/,/device:/ s/(device: "hw:).*/\1'$CARD',0"/' "$fileconf"
		camillaDSPstart
	fi
else
	if [[ -e $dirsystem/equalizer ]]; then
		value=$( getVar current $dirsystem/equalizer.json )
		[[ $( < $dirshm/player ) =~ (airplay|spotify) ]] && user=root || user=mpd
		$dirbash/cmd.sh "equalizer
$value
$user
CMD VALUE USR"
	fi
fi
