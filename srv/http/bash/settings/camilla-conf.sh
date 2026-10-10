#!/bin/bash

. /srv/http/bash/common.sh

. $dirshm/output # $card, $name

if [[ -e $dirshm/btmixer || -e $dirshm/btsource ]]; then
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
[[ ! -e $FILE_CONFIG ]] && cp /etc/camilladsp/configs/camilladsp.yml "$FILE_CONFIG"

! grep -qE 'bluealsa|Bluez' "$FILE_CONFIG" && sed -i -E "/playback:/,/device:/ s/(device:).*/\1 hw:$card/" "$FILE_CONFIG"

file_current=$( getVar CONFIG /etc/default/camilladsp )
[[ "$file_current" == "$FILE_CONFIG" ]] && exit
#-------------------------------------------------------------------------------
dir=$( dirname "$file_current" )
[[ $dir != *configs ]] && name=$( basename "$dir" ) # mac
echo $file_current > "$dircamilladsp/$name"
sed -i -E "s|^(CONFIG=).*|\1\"$FILE_CONFIG\"|" /etc/default/camilladsp
[[ $EXISTING ]] && exit
#-------------------------------------------------------------------------------
if [[ -e $dirshm/btmixer ]]; then
	sed -i -E -e '/playback:/,/format:/ c\
  playback:\
    type: Alsa\
    channels: 2\
    device: bluealsa\
    format: ~
' -e '
s/(samplerate: ).*/\1'$samplerate'/
' "$FILE_CONFIG"
elif [[ -e $dirshm/btsource ]]; then
	sed -i -E -e '
s/(samplerate: ).*/\1'$samplerate'/
s/(chunksize:).*/\1 4096/
s/(enable_rate_adjust:).*/\1 true/
s/(target_level:).*/\1 8000/
s/(adjust_period:).*/\1 3/
' -e '/capture:/,/format:/ c\
  capture:\
    type: Bluez\
    dbus_path: '$dbuspath'\
    channels: 2\
    format: ~\
  playback:
' "$FILE_CONFIG"
fi

camilladsp -c "$FILE_CONFIG"
