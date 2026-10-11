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
	[[ ! -e $FILE_CONFIG ]] && cp /etc/camilladsp/configs/camilladsp.yml "$FILE_CONFIG"
fi

[[ ! $mac ]] && sed -i -E "/playback:/,/device:/ s/(device: hw:).*/\1$card/" "$FILE_CONFIG"

if [[ ! $EXISTING ]]; then
	if [[ $SINK ]]; then
		sed -i -E -e '/playback:/,/format:/ c\
	  playback:\
		type: Alsa\
		channels: 2\
		device: bluealsa\
		format: ~
	' -e '
	s/(samplerate: ).*/\1'$samplerate'/
	' "$FILE_CONFIG"
	elif [[ $SOURCE ]]; then
		sed -i -E -e '/capture:/,/format:/ c\
	  capture:\
		type: Alsa\
		channels: 2\
		device: '$( bluealsa-aplay -L | head -n 1 )'\
		format: ~
	' -e '
	s/(adjust_period:).*/\1 3/
	s/(chunksize:).*/\1 4096/
	s/(enable_rate_adjust:).*/\1 true/
	s/(samplerate: ).*/\1'$samplerate'/
	s/(target_level:).*/\1 8000/
	' "$FILE_CONFIG"
	fi
fi

file_current=$( getVar CONFIG /etc/default/camilladsp )
validate=$( camilladsp -c "$FILE_CONFIG" )
if [[ $validate == 'Config is valid' ]]; then
	dir_current=$( dirname "$file_current" )
	dir_name=$( basename "$dir_current" )
	[[ $dir_name != configs ]] && name=$dir_name # mac
	echo $file_current > "$dircamilladsp/$name"
	[[ "$file_current" != "$FILE_CONFIG" ]] && sed -i -E "s|^(CONFIG=).*|\1\"$FILE_CONFIG\"|" /etc/default/camilladsp
	exit 0
fi

echo "$validate"
rm -f $dirshm/volume $dirsystem/camilladsp
mv "$file_current"{,.failed}
exit 1
