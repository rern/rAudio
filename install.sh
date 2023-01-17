#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

# 20230117
file=/etc/systemd/system/spotifyd.service
! grep -q ^User $file && sed -i '/CPUAffinity/ a\User=root' $file
systemctl daemon-reload
systemctl try-restart spotifyd

# 20221229
files=$( ls /etc/systemd/network/e* )
for file in $files; do
	! grep -q RequiredForOnline=no $file && echo '
[Link]
RequiredForOnline=no' >> $file
done

# 20221218
[[ -L $dirdata/playlists ]] && chown -h mpd:audio $dirdata/playlists

# 20221208
if [[ -e /srv/http/assets/css/desktop.css ]]; then
	rm -f /srv/http/main.php
	rm -f /srv/http/assets/css/{desktop,keyboard,roundslider,selectric,simple-}*
	rm -f /srv/http/assets/js/keyboard.js
	rm -f /srv/http/assets/js/plugin/{jquery.selectric,simple-}*
fi

readarray -t bookmarks <<< $( ls -1 /srv/http/data/bookmarks/* 2> /dev/null )
if [[ $bookmarks ]]; then
	for file in "${bookmarks[@]}"; do
		if [[ $( sed -n 2p "$file" ) ]]; then
			path=$( head -1 "$file" )
			echo $path > "$file"
		fi
 	done
fi

rm -rf /srv/http/data/tmp

sed -i 's/5000/5005/' /srv/http/settings/camillagui/config/camillagui.yml

if [[ -e "$dirwebradio/https:||stream.radioparadise.com|world-etc-flac" ]]; then
	echo -e "$bar Update Radio Paradise station arts ..."
	rm $dirwebradio/*world-etc-flac $dirwebradio/img/*world-etc-flac*
	curl -L https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xf - -C $dirwebradio
fi

if grep -q shairport.sh /etc/shairport-sync.conf; then
	sed -i 's/shairport.sh/cmd.sh shairport/; s/ stop/stop/' /etc/shairport-sync.conf
	mv /etc/systemd/system/shairport{-meta,}.service
	sed -i 's/-meta\|redis.target //' /etc/systemd/system/shairport.service
	systemctl daemon-reload
	systemctl try-restart shairport-sync
fi

# 20221123
grep -q calc $dirbash/xinitrc && restartbrowser=1

mv /etc/udev/rules.d/ntfs{3,}.rules &> /dev/null
file=/etc/udev/rules.d/ntfs.rules
if [[ ! -e $file ]]; then
	cat << 'EOF' > $file
ACTION=="add", \
SUBSYSTEM=="block", \
ENV{ID_FS_TYPE}=="ntfs", \
ENV{ID_FS_TYPE}="ntfs3", \
RUN+="/srv/http/bash/settings/system.sh usbconnect"

ACTION=="remove", \
SUBSYSTEM=="block", \
ENV{ID_FS_TYPE}=="ntfs", \
ENV{ID_FS_TYPE}="ntfs3", \
RUN+="/srv/http/bash/settings/system.sh usbremove"
EOF
	udevadm control --reload-rules
	udevadm trigger
fi

# 20221122
sed -i '/shairport-sync/ d' /etc/pacman.conf
veropenssl=$( pacman -Q openssl | cut -d' ' -f2 | cut -c 1 )
vershairport=$( pacman -Q shairport-sync | cut -d' ' -f2 | cut -c 1 )
[[ $veropenssl == 3 && $vershairport != 4 ]]  && pacman -Sy --noconfirm shairport-sync

[[ -e $dirsystem/loginset ]] && mv -f $dirsystem/login{set,}

[[ ! -e $dirdata/mpdconf ]] && backup=1

sed -i '/interfaces/ d' /etc/samba/smb.conf
systemctl try-restart smb 

file=/etc/systemd/system/bluetooth.service.d/override.conf
if grep -q bluetooth$ $file; then
	sed -i 's/bluetooth$/&start/' $file
	systemctl daemon-reload
fi

if [[ -L $dirmpd  && ! -e /mnt/MPD/.mpdignore ]]; then
	echo "\
SD
USB" > /mnt/MPD/.mpdignore
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,fonts,js}
[[ -e $dirmpdconf ]] && mv $dirmpdconf /tmp

getinstallzip

if [[ -e /tmp/mpdconf ]]; then
	rm -rf $dirmpdconf
	mv /tmp/mpdconf $dirdata
fi
chmod +x $dirsettings/system.sh
$dirsettings/system.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

#installfinish
#-------------------------------------------------------------------------------

# 20221123
[[ $restartbrowser ]] && systemctl try-restart localbrowser
