#!/bin/bash

alias=r1

# 20221005
[[ -e /srv/http/data/system/hddspindown ]] && mv /srv/http/data/system/{hddspindown,apm}

if [[ ! -e /boot/kernel.img ]]; then
	dir=/etc/systemd/system
	for file in $dir/spotifyd.service $dir/upmpdcli.service; do
		! grep -q CPUAffinity $file && sed -i -e '/Service/ a\CPUAffinity=3' -e '/ExecStartPost/ d' -e 's|/usr/bin/taskset -c 3 ||' $file
	done
	for file in $dir/mpd.service.d/override.conf $dir/shairport-sync.service.d/override.conf; do
		! grep -q CPUAffinity $file && sed -i -e '/Service/ a\CPUAffinity=3' -e '/ExecStart/ d' $file
	done
	for file in $dir/bluealsa.service.d/override.conf $dir/bluetooth.service.d/override.conf; do
		! grep -q CPUAffinity $file && sed -i -e '/Service/ a\CPUAffinity=3' $file
	done
fi

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
fi

systemctl daemon-reload

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
