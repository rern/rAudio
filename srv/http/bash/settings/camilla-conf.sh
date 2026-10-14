#!/bin/bash

. /srv/http/bash/common.sh
. $dirshm/output # $card, $name

[[ -e $dirshm/btmixer ]] && SINK=1
[[ -e $dirshm/btsource ]] && SOURCE=1

if [[ ( $SINK && ! -e $dirsystem/devicewithbt ) || $SOURCE ]]; then
	dbuspath=$( bluealsa-cli list-pcms | grep -E '(sink|source)$' )
	mac=$( sed -E 's|.*/dev_([^/]*).*|\1|; s|_|:|g' <<< $dbuspath )
	file_config=$dircamilladsp/$mac
	samplerate=$( bluealsa-aplay -L | awk '/Hz$/ {print $(NF-1)}' )
else
	file_config="$dircamilladsp/$name"
fi
if [[ -e $file_config ]]; then # existing
	EXISTING=1
	FILE_CONFIG=$( < "$file_config" )
else
	if [[ $mac ]]; then
		dir="$dircamilladsp/configs/$mac"
		mkdir -p "$dir"
		FILE_CONFIG="$dir/camilladsp.yml"
	else
		FILE_CONFIG=$dircamilladsp/configs/camilladsp.yml
	fi
fi
if [[ ! -e $FILE_CONFIG ]]; then
	file_default=/etc/camilladsp/configs/camilladsp.yml
	if [[ $EXISTING ]]; then
		dir=$( dirname "$FILE_CONFIG" )
		name_miss=$( basename "$FILE_CONFIG" )
		file=$( compgen -G "$dir"/*.yml )
		if [[ $file ]]; then
			name_replace=$( basename "$file" )
		else
			file=$file_default
			name_replace='(default)'
		fi
		cp "$file" "$FILE_CONFIG"
		echo "\
<i class='i-warning yl'></i> Missing Config: <wh>$name_miss</wh>
Run with <wh>$name_replace</wh> instead." > $dirshm/missing_config
	else
		cp $file_default "$FILE_CONFIG"
	fi
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

file_current=$( getVar CONFIG /etc/default/camilladsp )
validate=$( camilladsp -c "$FILE_CONFIG" )
if [[ $validate != 'Config is valid' ]]; then
	echo "\
$validate

(config moved to $file_current.failed)"
	rm -f $dirshm/volume $dirsystem/camilladsp
	mv "$file_current"{,.failed}
	exit 1
fi

dir_current=$( dirname "$file_current" )
dir_name=$( basename "$dir_current" )
[[ $dir_name != configs ]] && name=$dir_name # mac
echo $file_current > "$dircamilladsp/$name"
[[ "$file_current" != "$FILE_CONFIG" ]] && sed -i -E "s|^(CONFIG=).*|\1\"$FILE_CONFIG\"|" /etc/default/camilladsp
[[ $SOURCE ]] && systemctl stop bluealsa-aplay
exit 0
