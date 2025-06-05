#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20250606
file=/etc/pacman.conf
grep -q mpd $file && sed -i 's/ mpd//' $file

if ! locale | grep -q ^LANG=.*UTF-8; then
	[[ -e /usr/share/i18n/locales/C ]] && loc=C || loc=en_US
	loc+=.UTF-8
	echo "$loc UTF-8" >> /etc/locale.gen
	locale-gen
	localectl set-locale LANG=$loc
fi

# 20250502
if [[ -e $dirmpd/album && $( uniq -d $dirmpd/album ) ]]; then
	for t in album latest; do
		sort -o $dirmpd/$t{,}
		sort -o $dirmpd/$t'byartist'{,}
	done
fi

file=/etc/systemd/system/cava.service
if ! grep -q ^User $file; then
	sed -i -e '/^ExecStart/ i\User=root' -e 's/cava/vu/' $file
	ln -s /etc/cava.conf /root/.config/cava
	systemctl daemon-reload
	file=$dirsystem/vuled.conf
	if [[ -e $file ]] && grep -q = $file; then
		conf=$( sed 's/.*=//' $file )
		echo $conf > $file 
	fi
	[[ -e $dirsystem/vuled ]] && systemctl start cava
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
