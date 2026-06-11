#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260616
file=$dirsystem/localbrowser.conf
grep -q -m1 ^rotate $file && sed -i 's/.*/\U&/' $file

# 20260529
if [[ $( pacman -Q mpd_oled ) < 'mpd_oled 0.03-2' ]]; then
	pacman -Sy --noconfirm mpd_oled
	file=/etc/default/mpd_oled
	if grep ' -X' $file; then
		sed -i 's/ -X//' $file
	else
		sed -i 's/fifo"/fifo -X"/' $file
	fi
fi

# 20260509
file=$dirshareddata/source
if [[ -e $file && $( awk '{print $6}' $file ) ]]; then
	mp=$( awk '{print $2}' $file | sed 's/\\040/ /g' )
	echo "$mp" > $file
fi

if [[ -e /boot/kernel.img ]] && grep -q '^\[core' /etc/pacman.conf; then
	sed -i '/^\[core]/,$ d' /etc/pacman.conf
fi

file=/etc/udevil/udevil.conf
if ! grep -q /mnt/MPD/NAS/USB $file; then
	sed -i -e 's/, utf8//
' -e '/allowed_media_dirs/ s|$|,/mnt/MPD/NAS/USB|
' $file
	systemctl restart devmon@http
	systemctl -q is-active nfs-server && $dirsettings/features.sh nfsserver
fi
file=/mnt/MPD/.mpdignore
if [[ -e $file ]]; then
	rm $file
	mv /mnt/MPD/{NVME,SATA,SD,USB} /mnt &> /dev/null
fi

if [[ -e /bin/camilladsp && $( pacman -Q camilladsp ) < 'camilladsp 4.1.3-1' ]]; then
	systemctl -q is-active camilladsp && active=1
	[[ $active ]] && systemctl stop camilladsp
	rm -f $dirshm/hwparams
	pacman -Sy --noconfirm camilladsp
	while read f; do
		sed -i -E -e 's/FLOAT/F/; s/S24LE3/S24_3_LE/' -e 's/([246])LE/\1_LE/' $f
	done < <( grep -rl '[246]\+LE' $dircamilladsp )
	[[ $active ]] && systemctl start camilladsp
fi

if [[ -e /bin/firefox ]]; then
	file=/etc/udev/rules.d/mouse.rules
	if [[ ! -e $file ]]; then
		echo 'ACTION=="add|remove", SUBSYSTEM=="input", ENV{ID_INPUT_MOUSE}=="1", RUN+="/srv/http/bash/settings/features.sh mouse"' > $file
		udevadm control --reload-rules
		udevadm trigger
	fi

	file=$dirsystem/localbrowser.conf
	grep -q ^cursor $file && sed -i '/^cursor/ d' $file
fi

rm -f /root/.bashrc

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}
# 20260616
rm $dirbash/*

getinstallzip

. $dirbash/common.sh
cacheBust
chmod -R +x $dirbash
[[ -e /boot/kernel.img ]] && rm -f $dirbash/{dab*,status-dab.sh}
if [[ ! -e /bin/camilladsp ]]; then
	rm -rf $dircamilladsp
	find /srv/http -type f -name camilla* -delete
fi
if [[ -e /bin/firefox ]]; then
	splashRotate
else
	rm -f $dirbash/startx.sh $dirsettings/features-localbrowser.sh
fi
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
rm -f $dirshm/system

installfinish
