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
if [[ -e /usr/bin/rtl_sdr && ! -e $file ]]; then
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

#-------------------------------------------------------------------------------
. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

chmod +x $dirbash/cmd.sh
$dirbash/cmd.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
#-------------------------------------------------------------------------------
