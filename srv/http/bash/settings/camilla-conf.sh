#!/bin/bash

. /srv/http/bash/common.sh
. $dirshm/output # $card, $name

[[ -e $dirshm/btmixer ]] && SINK=1 && icon=bluetooth
[[ -e $dirshm/btsource ]] && SOURCE=1 && icon=btsender

if [[ ( $SINK && ! -e $dirsystem/devicewithbt ) || $SOURCE ]]; then
	dbuspath=$( bluealsa-cli list-pcms | grep -E '(sink|source)$' )
	[[ ! $dbuspath ]] && echo 'BlueALSA mixer not found.' && exit 1
#-------------------------------------------------------------------------------
	mac=$( sed -E 's|.*/dev_([^/]*).*|\1|; s|_|:|g' <<< $dbuspath )
	file_config=$dircamilladsp/$mac
	samplerate=$( bluealsa-aplay -L | awk '/Hz$/ {print $(NF-1)}' )
else
	file_config="$dircamilladsp/$name"
fi

if [[ -e $file_config ]]; then # existing
	FILE_CONFIG=$( < "$file_config" )
else
	FILE_CONFIG=$dircamilladsp/configs/camilladsp.yml
	[[ $mac ]] && FILE_CONFIG=${FILE_CONFIG/configs/&\/$mac}
fi

[[ $icon ]] && icon='<i class="i-'$icon'"></i>'
notify 'camilla blink' "$icon Config" "${FILE_CONFIG/*configs\/}"

if [[ -e $FILE_CONFIG ]]; then
	EXISTING=1
else
	mkdir -p $( dirname "$FILE_CONFIG" )
	cp /etc/camilladsp/configs/camilladsp.yml "$FILE_CONFIG"
fi
[[ ! $SINK ]] && sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card/" "$FILE_CONFIG"

if [[ ! $EXISTING ]]; then
	if [[ $SINK ]]; then
		sed -i -E -e '/playback:/,/format:/ s/(device:).*/\1 bluealsa/
				' -e 's/  (samplerate: ).*/\1'$samplerate'/
				' "$FILE_CONFIG"
	elif [[ $SOURCE ]]; then
		sed -i -E -e '/capture:/,/format:/ c\
  capture:\
    type: Bluez\
    channels: 2\
    dbus_path: '$dbuspath'\
    format: S16_LE
				' -e '
					s/(adjust_period:).*/\1 3/
					s/(capture_samplerate: ).*/\1'$samplerate'/
					s/(chunksize:).*/\1 4096/
					s/(enable_rate_adjust:).*/\1 true/
					s/(target_level:).*/\1 8000/
				' "$FILE_CONFIG"
	fi
fi

validate=$( camilladsp -c "$FILE_CONFIG" )
if [[ $validate != 'Config is valid' ]]; then
	echo "\
$validate

(config moved to $FILE_CONFIG.failed)"
	rm -f $dirshm/volume $dirsystem/camilladsp
	mv "$FILE_CONFIG"{,.failed}
	exit 1
#-------------------------------------------------------------------------------
fi

file_current=$( getVar CONFIG /etc/default/camilladsp )
dir_current=$( dirname "$file_current" )
dir_name=$( basename "$dir_current" )
[[ $dir_name != configs ]] && name=$dir_name # mac
echo $file_current > "$dircamilladsp/$name"
[[ "$file_current" != "$FILE_CONFIG" ]] && sed -i -E "s|^(CONFIG=).*|\1\"$FILE_CONFIG\"|" /etc/default/camilladsp
playerStop
card=$( getVar card $dirshm/output )
hwparams=$( timeout 0.1 aplay -D hw:$card --dump-hw-params /dev/zero 2>&1 \
				| sed -n -E '/^ACCESS.*MMAP/,/^TICK/ {/^(FORMAT|CHANNELS|RATE)/ p}' )
echo "$hwparams" > $dirshm/hwparams
bluealsaServices

exit 0
