#!/bin/bash

alias=r1

dirbash=/srv/http/bash
dirshm=/srv/http/data/shm
dirsystem=/srv/http/data/system

. $dirbash/addons.sh

#20211210
revision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
if [[ ${revision: -3:2} == 12 ]]; then
	grep -q dtparam=krnbt=on /boot/config.txt || echo dtparam=krnbt=on >> /boot/config.txt
fi

file=/etc/samba/smb.conf
if [[ -e $file ]] && ! grep -q 'force user' $file; then
	sed -i '/map to guest/ a\
	force user = mpd
' $file
	systemctl try-restart smb
fi

file=/srv/http/data/mpd/counts
grep -q playlists $file || sed -i '/genre/ a\
  "playlists": '$( ls -1 $dirdata/playlists | wc -l )',
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

installstart "$1"

getinstallzip

[[ $( uname -m ) == armv6l ]] && sed -i -e 's|/usr/bin/taskset -c 3 ||' -e '/upnpnice/ d' /etc/systemd/system/upmpdcli.service

systemctl daemon-reload

$dirbash/mpd-conf.sh

installfinish
