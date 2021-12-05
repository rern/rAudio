#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

#20211210
file=/srv/http/data/mpd/counts
grep -q playlist $file || sed -i '/genre/ a\
  "playlist": '$( ls -1 $dirdata/playlists | wc -l )',
' $file

# 20211203
rm -rf /srv/http/data/embedded
mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}

sed -i '/chromium/ d' /etc/pacman.conf

files=( $( ls /etc/systemd/network/eth* ) )
for file in "${files[@]}"; do
	grep -q RequiredForOnline=no $file || echo "
[Link]
RequiredForOnline=no" >> $file
done

# 20211126
rm -f $dirshm/local/*

file=$dirsystem/lcdchar.conf
if [[ -e $file ]] && ! grep -q inf $file; then
	grep -q chip $file && inf=i2c || inf=gpio
	sed -i -e 's/"//g; s/0x27/39/; s/0x3f/63/; s/\(true\|false\)/\u\1/
' -e "3 a\inf=$inf
" $dirsystem/lcdchar.conf
fi

# 20121122
rm -rf /etc/systemd/system/upmpdcli.service.d
if [[ $( ls /srv/http/data/bookmarks ) ]]; then
	readarray -t files <<< $( ls -d1 /srv/http/data/bookmarks/* )
	if [[ $files ]]; then
		for file in "${files[@]}"; do
			path=$( head -1 "$file" )
			[[ ${path:0:9} == webradios ]] && webradio=1 || webradio=
			[[ $webradio ]] && coverpath="/srv/http/data/$path" || coverpath="/mnt/MPD/$path"
			coverartfile=$( ls -1X "$coverpath"/coverart.* 2> /dev/null \
								| grep -i '.gif$\|.jpg$\|.png$' \
								| head -1 ) # full path
			if [[ $coverartfile ]]; then
				coverartfile=$( echo $coverartfile | sed 's|^/srv/http||' )
			elif [[ -z $webradio ]]; then
				coverfile=$( ls -1X "$coverpath" \
								| grep -i '^cover\.\|^folder\.\|^front\.\|^album\.' \
								| grep -i '.gif$\|.jpg$\|.png$' \
								| head -1 ) # filename only
				if [[ $coverfile ]]; then
					ext=${coverfile: -3}
					coverartfile="$coverpath/coverart.${ext,,}"
					cp "$coverpath/$coverfile" "$coverartfile" 2> /dev/null
					[[ -e $coverartfile ]] || coverartfile=
				fi
			fi
			[[ $coverartfile ]] && path="\
$path
$coverartfile"
			echo "$path" > "$file"
		done
	fi
fi

[[ -e /etc/sudoers.d/http ]] && rm -f /etc/sudoers.d/{http,shairport-sync,upmpdcli}

player=$( ls $dirshm/player-* 2> /dev/null | cut -d- -f2 )
[[ $player ]] && echo $player > $dirshm/player && rm -f $dirshm/player-*
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
systemctl disable --now mpdscribble@mpd 2> /dev/null

file=/etc/systemd/system/bluetooth.service.d/override.conf
grep -q battery $file || sed -i '/ExecStartPost/ i\
ExecStart=\
ExecStart=/usr/lib/bluetooth/bluetoothd -P battery' $file

if ! grep -q bton /etc/udev/rules.d/bluetooth.rules; then
	echo 'ACTION=="add", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh bton"
ACTION=="remove", SUBSYSTEM=="bluetooth", RUN+="/srv/http/bash/mpd-conf.sh btoff"' > /etc/udev/rules.d/bluetooth.rules
	udevadm control --reload-rules && udevadm trigger
fi

installstart "$1"

getinstallzip

[[ $( uname -m ) == armv6l ]] && sed -i -e 's|/usr/bin/taskset -c 3 ||' -e '/upnpnice/ d' /etc/systemd/system/upmpdcli.service

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish
