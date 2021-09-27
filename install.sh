#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

[[ ! -e /lib/alsa-lib/libasound_module_ctl_equal.so ]] && pacman -Sy --noconfirm alsaequal

[[ ! -e /usr/bin/ntpdate ]] && pacman -Sy --noconfirm ntp

! grep -q noswipe $dirsystem/display && sed -i '/radioelapsed/ i\  "noswipe": false,' $dirsystem/display

[[ ! -e /usr/bin/mpd_oled ]] && pacman -Sy --noconfirm audio_spectrum_oled

for name in lcdchar localbrowser powerbutton; do
	mv -f /etc/$name.conf $dirsystem &> /dev/null
done

for name in bufferset bufferoutputset crossfadeset lcdcharval localbrowserval powerbuttonpins relayspins replaygainset soundprofileval soxr vuledpins; do
	newname=$( echo $name | sed 's/pins\|set\|val//' )
	mv -f $dirsystem/{$name,$newname.conf} &> /dev/null
done

if [[ -e $dirsystem/relays && -e /etc/relays.conf ]]; then
	names=$( jq .name /etc/relays.conf )
	pin=$( jq -r 'keys[]' <<< $names )
	pin="pin='[ "$( echo $pin | tr ' ' , )" ]'"
	name=$( jq .[] <<< $names )
	name="name='[ "$( echo $name | tr ' ' , )" ]'"
	echo "\
$pin
$name
$( sed -n '/^onorder/,/^timer/ p' $dirsystem/relays )" > $dirsystem/relays.conf
	> $dirsystem/relays
	rm /etc/relays.conf
elif [[ ! -e $dirsystem/relays.conf ]]; then
	cat << EOF > $dirsystem/relays.conf
pin='[ 11,13,15,16 ]'
name='[ "DAC","PreAmp","Amp","Subwoofer" ]'
onorder='[ "DAC","PreAmp","Amp","Subwoofer" ]'
offorder='[ "Subwoofer","Amp","PreAmp", "DAC" ]'
on=( 11 13 15 16 )
ond=( 2 2 2 )
off=( 16 15 13 11 )
offd=( 2 2 2 )
timer=5
EOF
fi

[[ -e $dirsystem/lcdchar.conf ]] && sed -i 's/True/true/; s/False/false/' $dirsystem/lcdchar.conf
[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdcharinit.py && $dirbash/lcdchar.py

[[ -e /usr/bin/chromium ]] && systemctl try-restart localbrowser

[[ -e $dirsystem/custom ]] && sed -i '/#custom$/ d' /etc/mpd.conf

rm -f /srv/http/data/shm/status

if [[ -e '/srv/http/data/webradios/https:||stream.radioparadise.com|flacm' ]]; then
	rm -f "/srv/http/data/webradios/http:||stream.radioparadise.com"*
	rm -f "/srv/http/data/webradiosimg/http:||stream.radioparadise.com"*
	curl -L https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xvf - -C /
fi

file=$dirsystem/display
! grep -q vumeter $file && sed -i '/novu/ i\    "vumeter": false,' $file

installstart "$1"

getinstallzip

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish
