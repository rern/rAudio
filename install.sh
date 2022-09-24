#!/bin/bash

alias=r1

# 20220923
dir=/srv/http/assets/img/guide
if [[ ! -e $dir/1.jpg ]]; then
	mkdir -p $dir
	if [[ -e /srv/http/assets/img/1.jpg ]]; then
		find /srv/http/assets/img -maxdepth 1 -type f -name '[0-9]*' -exec mv {} $dir \;
	else
		curl -skL https://github.com/rern/_assets/raw/master/guide/guide.tar.xz | bsdtar xf - -C $dir
	fi
fi

file=/etc/systemd/system/dab.service
if [[ ! -e $file ]]; then
	echo "\
[Unit]
Description=DAB Radio metadata

[Service]
Type=simple
ExecStart=/srv/http/bash/status-dab.sh
" > $file
	systemctl daemon-reload
fi

# 20220916
dirmpd=/srv/http/data/mpd
if (( $( cat $dirmpd/counts | wc -l ) == 1 )); then
	echo '{
  "playlists" : '$( ls -1 /srv/http/data/playlists | wc -l )'
, "webradio"  : '$( find -L /srv/http/data/webradio -type f ! -path '*/img/*' | wc -l )'
}' > $dirmpd/counts
fi

# 20220907
[[ $( pacman -Q bluez ) < 'bluez 5.65-3' ]] && pacman -Sy --noconfirm bluez bluez-utils

# 20220826
rm /srv/http/bash/{camilladsp*,features*,networks*,player*,relays*,system*} &> /dev/null

# 20220814
sed -i '/bluez-utils/ d' /etc/pacman.conf

# 20220808
dirdata=/srv/http/data

dab=$( pacman -Q dab-scanner 2> /dev/null )
if [[ $dab && $dab != 'dab-scanner 0.8-3' ]]; then
	rm -f /etc/rtsp-simple-server.yml $dirdata/webradiosimg/{dablogo*,rtsp*8554*}
	rm -rf /srv/http/bash/dab $dirdata/webradios/DAB
	pacman -Sy --noconfirm dab-scanner
fi

if [[ -e $dirdata/webradios ]]; then
	mv $dirdata/webradio{s,}
	mv $dirdata/{webradiosimg,webradio/img}
fi

grep -A1 'plugin.*ffmpeg' /etc/mpd.conf | grep -q no && sed -i '/decoder/,+4 d' /etc/mpd.conf

if [[ $(  uname -m ) == armv6l && $( uname -r ) != 5.10.92-2-rpi-legacy-ARCH ]]; then
	echo Downgrade kernel to 5.10.92 ...
	pkgfile=linux-rpi-legacy-5.10.92-2-armv6h.pkg.tar.xz
	curl -skLO https://github.com/rern/_assets/raw/master/$pkgfile
	pacman -U --noconfirm $pkgfile
	rm $pkgfile
fi

grep -q gpio-poweroff /boot/config.txt && sed -i '/gpio-poweroff\|gpio-shutdown/ d' /boot/config.txt

#-------------------------------------------------------------------------------
. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

chmod +x $dirbash/cmd.sh
$dirbash/cmd.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
#-------------------------------------------------------------------------------

# 20220808
if [[ -e /srv/http/shareddata/webradios ]]; then
	echo -e "\
$info Shared data:
    • Disable
    • On server
      - Rename: $( tcolor webradios 1 ) > $( tcolor webradio 2 )
      - Move:   $( tcolor webradiosimg 1 ) > $( tcolor webradio/img 2 )
    • Re-enable again.
"
fi
