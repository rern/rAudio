#!/bin/bash

. /srv/http/bash/common.sh

type=$1

filemac=$dircamilladsp/$2
if [[ -e $filemac ]]; then
	filedevice=$( < $filemac )
else
	filedevice=$dircamilladsp/configs-bt/camilladsp.yml
	echo $filedevice > $filemac
fi
filedefault=/etc/default/camilladsp
. <( grep ^CONFIG $filedefault | tee $dircamilladsp/file_config )
[[ ! $CONFIG ]] && CONFIG=$dircamilladsp/configs/camilladsp.yml
sed -i "s|^CONFIG.*|CONFIG=$filedevice|" $filedefault
[[ -e $filedevice ]] && camillaDSPstart && exit
# --------------------------------------------------------------------
read format channels samplerate < <( bluealsa-aplay -L | awk '/channel.*Hz/ {print $3, $4, $6}' )
case $format in
	S24_3LE ) format=S24_3_LE;;
	S24_LE )  format=S24_4_LE;;
esac
if [[ $type == btreceiver ]]; then
	sed -E -e '/playback:$/,/format:/ {
s/(device: ).*/\1bluealsa/
s/(channels: ).*/\1'$channels'/
s/(format: ).*/\1'$format'/
}' "$CONFIG" > "$filedevice"
else # btsender
	dbuspath=$( bluealsa-cli list-pcms | head -n 1 ) # /org/bluealsa/hci0/dev_A0_B1_C2_D3_E4_F5/a2dpsnk/source
	sed -E -e 's/(samplerate: ).*/\1'$samplerate'/
s/(chunksize: ).*/\14096/
s/(enable_rate_adjust: )/\1true/
s/(target_level: )/\18000/
s/(adjust_period: )/\13/
s/(enable_resampling: )/\1true/
' -e '/capture:$/,/format:/ {
/device: .*/ d
/format:/ a\
	dbus_path: '$dbuspath'
s/(type: ).*/\1Bluez/
s/(channels: ).*/\1'$channels'/
s/(format: ).*/\1'$format'/
}' "$CONFIG" > "$filedevice"
fi

camillaDSPstart
