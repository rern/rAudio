#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

# 20211021
rm -rf /root/.config/chromium
systemctl -q is-active localbrowser && systemctl restart localbrowser

# 20211019
mv $dirsystem/equalizer.{conf,presets} &> /dev/null
if [[ ! -e /usr/bin/chromium ]] && grep -q 'dtoverlay=.*rotate=' /boot/config.txt; then
	echo -e "$bar Switch from Firefox to Chromium ..."
	echo This may take a couple minutes to download in some regions.
	pkg+=' chromium'
	pacman -R --noconfirm firefox
fi
# 20211011
novu=$( grep novu $dirsystem/display | cut -d: -f2 | tr -d ' ,' )
if [[ -n $novu ]]; then
	[[ $novu == true ]] && covervu=false || covervu=true
	sed -i '/novu/ s/.*/  "covervu": '$covervu',/' $dirsystem/display
fi
# 20210927
grep -q '^mpd.*bash$' /etc/passwd || chsh -s /bin/bash mpd
[[ ! -e /lib/alsa-lib/libasound_module_ctl_equal.so ]] && pkg+=' alsaequal'
# 20210924
[[ ! -e /usr/bin/ntpdate ]] && pkg+=' ntp'
# 20200921
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
for name in lcdchar localbrowser powerbutton; do
	mv -f /etc/$name.conf $dirsystem &> /dev/null
done

for name in bufferset bufferoutputset crossfadeset lcdcharval localbrowserval powerbuttonpins relayspins replaygainset soundprofileval soxr vuledpins; do
	newname=$( echo $name | sed 's/pins\|set\|val//' )
	mv -f $dirsystem/{$name,$newname.conf} &> /dev/null
done
# 20210911
! grep -q noswipe $dirsystem/display && sed -i '/radioelapsed/ i\  "noswipe": false,' $dirsystem/display

[[ -n $pkg ]] && pacman -Sy --noconfirm $pkg

installstart "$1"

getinstallzip

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish

# 20211022
file=/srv/http/data/mpd/mpdignorelist
[[ ! -e $file ]] && find /mnt/MPD -name .mpdignore | sort -V > $file &> /dev/null &
