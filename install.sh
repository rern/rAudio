#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

#20121120
if [[ $( ls /srv/http/data/bookmarks ) ]] && ! grep -q 'cp "\$path' $dirbash/cmd.sh; then
	readarray -t files <<< $( ls -d1 /srv/http/data/bookmarks/* )
	if [[ -n $files ]]; then
		for file in "${files[@]}"; do
			(( $( wc -l < "$file" ) > 1 )) && continue
			
			path=$( cat "$file" )
			[[ ${path:0:9} == webradios ]] && webradio=1
			[[ -n $webradio ]] && coverpath="/srv/http/data/$path" || coverpath="/mnt/MPD/$path"
			coverartfile=$( ls -1X "$coverpath"/coverart.* 2> /dev/null \
								| grep -i '.gif$\|.jpg$\|.png$' \
								| head -1 ) # full path
			if [[ -n $coverartfile ]]; then
				coverartfile=$( echo $coverartfile | sed 's|^/srv/http||' )
			elif [[ -z $webradio ]]; then
				coverfile=$( ls -1X "$coverpath" \
								| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
								| grep -i '.gif$\|.jpg$\|.png$' \
								| head -1 ) # filename only
				if [[ -n $coverfile ]]; then
					ext=${coverfile: -3}
					coverartfile="$coverpath/coverart.${ext,,}"
					cp "$coverpath/$coverfile" "$coverartfile" 2> /dev/null
					[[ -e $coverartfile ]] || coverartfile=
				fi
			fi
			[[ -n $coverartfile ]] && echo "\
$path
$coverartfile" > "$file"
		done
	fi
fi

if ! grep -q xf86-video-vesa /etc/pacman.conf; then
	sed -i -e '/^IgnorePkg/ d
' -e '/^#IgnorePkg/ a\
IgnorePkg   = chromium' /etc/pacman.conf
fi

file=/etc/systemd/system/shairport-sync.service.d/override.conf
if ! grep -q root $file; then
	echo "\
User=root
Group=root" >> $file
fi
[[ -e /etc/sudoers.d/http ]] && rm -f /etc/sudoers.d/{http,shairport-sync,upmpdcli}

mkdir -p $dirshm/{airplay,spotify,local,online,webradio}
player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
[[ -n $player ]] && echo $player > $dirshm/player && rm -f $dirshm/player-*
chmod -R 777 $dirshm
systemctl try-restart shairport-sync

file=$dirsystem/localbrowser.conf
if [[ ! -e $file ]]; then
	echo "\
rotate=NORMAL
zoom=100
screenoff=1
onwhileplay=true
cursor=false" > $file
elif ! grep -q onwhileplay $file; then
	. $file
	cat << EOF > $file
rotate=$rotate
zoom=$( echo "print $zoom * 100" | perl )
screenoff=$(( $screenoff / 60 ))
onwhileplay=false
cursor=$cursor
EOF
	rm -rf /root/.config/chromium
	systemctl try-restart localbrowser
fi

#2021112
[[ ! -e $dirsystem/spotify ]] && systemctl stop spotifyd
systemctl disable --now mpdscribble@mpd

file=/etc/systemd/system/bluetooth.service.d/override.conf
grep -q battery $file || sed -i '/ExecStartPost/ i\
ExecStart=\
ExecStart=/usr/lib/bluetooth/bluetoothd -P battery' $file

if ! grep -q bton /etc/udev/rules.d/bluetooth.rules; then
	echo 'ACTION=="add", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh bton"
ACTION=="remove", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh btoff"' > /etc/udev/rules.d/bluetooth.rules
	udevadm control --reload-rules && udevadm trigger
fi

# 20211019
mv $dirsystem/equalizer.{conf,presets} &> /dev/null
if [[ ! -e /usr/bin/chromium ]] && grep -q console=tty3 /boot/cmdline.txt; then
	echo -e "$bar Switch from Firefox to Chromium ..."
	echo This may take a couple minutes to download in some regions.
	pacman -R --noconfirm firefox
	pacman -Sy --noconfirm chromium
fi

installstart "$1"

getinstallzip

[[ $( uname -m ) == armv6l ]] && sed -i -e 's|/usr/bin/taskset -c 3 ||' -e '/upnpnice/ d' /etc/systemd/system/upmpdcli.service

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish

# 20211022
file=/srv/http/data/mpd/mpdignorelist
[[ ! -e $file ]] && find /mnt/MPD -name .mpdignore | sort -V > $file &> /dev/null &
