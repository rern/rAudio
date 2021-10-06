#!/bin/bash

dirbash=/srv/http/bash
dirdata=/srv/http/data
dirsystem=$dirdata/system
dirtmp=$dirdata/shm
filebootlog=$dirdata/tmp/bootlog
filereboot=$dirtmp/reboot
fileconfig=/boot/config.txt
filemodule=/etc/modules-load.d/raspberrypi.conf

# convert each line to each args
readarray -t args <<< "$1"

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}
pushstreamNotify() {
	data='{"title":"'$1'","text":"'$2'","icon":"'$3' blink","delay":-1}'
	pushstream notify "$data"
}
pushRefresh() {
	data=$( $dirbash/system-data.sh )
	pushstream refresh "$data"
}
soundprofile() {
	if [[ $1 == reset ]]; then
		latency=18000000
		swappiness=60
		mtu=1500
		txqueuelen=1000
		rm -f $dirsystem/soundprofile
	else
		. $dirsystem/soundprofile.conf
		touch $dirsystem/soundprofile
	fi

	sysctl kernel.sched_latency_ns=$latency
	sysctl vm.swappiness=$swappiness
	if ifconfig | grep -q eth0; then
		ip link set eth0 mtu $mtu
		ip link set eth0 txqueuelen $txqueuelen
	fi
}

case ${args[0]} in

bluetooth )
	sleep 3
	[[ -e $dirsystem/btdiscoverable ]] && yesno=yes || yesno=no
	bluetoothctl discoverable $yesno &
	bluetoothctl discoverable-timeout 0 &
	bluetoothctl pairable yes &
	;;
bluetoothdisable )
	systemctl disable --now bluetooth
	pushRefresh
	;;
bluetoothset )
	btdiscoverable=${args[1]}
	btformat=${args[2]}
	if [[ $btdiscoverable == true ]]; then
		yesno=yes
		touch $dirsystem/btdiscoverable
	else
		yesno=no
		rm $dirsystem/btdiscoverable
	fi
	if ! systemctl -q is-active bluetooth; then
		systemctl enable --now bluetooth
		sleep 3
	fi
	bluetoothctl discoverable $yesno &
	[[ $btformat == true ]] && touch $dirsystem/btformat || rm $dirsystem/btformat
	pushRefresh
	;;
configtxtget )
	config=$( cat /boot/config.txt )
	file=/etc/modules-load.d/raspberrypi.conf
	raspberrypiconf=$( cat $file )
	if [[ -n $raspberrypiconf ]]; then
		config+="

# $file

$raspberrypiconf"
	fi
	echo "$config"
	;;
databackup )
	dirconfig=$dirdata/config
	backupfile=$dirdata/tmp/backup.gz
	rm -f $backupfile
	alsactl store
	files=(
/boot/cmdline.txt
/boot/config.txt
/etc/conf.d/wireless-regdom
/etc/default/snapclient
/etc/hostapd/hostapd.conf
/etc/samba/smb.conf
/etc/systemd/network/eth0.network
/etc/systemd/timesyncd.conf
/etc/X11/xorg.conf.d/99-calibration.conf
/etc/X11/xorg.conf.d/99-raspi-rotate.conf
/etc/fstab
/etc/mpd.conf
/etc/mpdscribble.conf
/etc/upmpdcli.conf
/var/lib/alsa/asound.state
)
	for file in ${files[@]}; do
		if [[ -e $file ]]; then
			mkdir -p $dirconfig/$( dirname $file )
			cp {,$dirconfig}$file
		fi
	done
	hostname > $dirsystem/hostname
	grep ^Server /etc/pacman.d/mirrorlist \
		| head -1 \
		| sed 's|.*//\(.*\).mirror.*|\1|' > $dirsystem/mirror
	timedatectl | awk '/zone:/ {print $3}' > $dirsystem/timezone
	readarray -t profiles <<< $( ls -p /etc/netctl | grep -v / )
	if [[ -n $profiles ]]; then
		cp -r /etc/netctl $dirconfig/etc
		for profile in "${profiles[@]}"; do
			if [[ $( netctl is-enabled "$profile" ) == enabled ]]; then
				echo $profile > $dirsystem/netctlprofile
				break
			fi
		done
	fi
	mkdir -p $dirconfig/var/lib
	cp -r /var/lib/bluetooth $dirconfig/var/lib &> /dev/null
	
	services='bluetooth hostapd localbrowser mpdscribble@mpd powerbutton shairport-sync smb snapclient snapserver spotifyd upmpdcli'
	for service in $services; do
		systemctl -q is-active $service && enable+=" $service" || disable+=" $service"
	done
	[[ -n $enable ]] && echo $enable > $dirsystem/enable
	[[ -n $disable ]] && echo $disable > $dirsystem/disable
	
	bsdtar \
		--exclude './addons' \
		--exclude './embedded' \
		--exclude './shm' \
		--exclude './system/version' \
		--exclude './tmp' \
		-czf $backupfile \
		-C /srv/http \
		data \
		2> /dev/null && echo 1
	
	rm -rf $dirdata/{config,disable,enable}
	;;
datarestore )
	backupfile=$dirdata/tmp/backup.gz
	dirconfig=$dirdata/config
	systemctl stop mpd
	# remove all flags
	rm -f $dirsystem/{autoplay,login*}                          # features
	rm -f $dirsystem/{crossfade*,custom*,dop*,mixertype*,soxr*} # mpd
	rm -f $dirsystem/{updating,listing}                         # updating_db
	rm -f $dirsystem/{color,relays,soundprofile}                # system
	
	bsdtar -xpf $backupfile -C /srv/http
	
	uuid1=$( head -1 /etc/fstab | cut -d' ' -f1 )
	uuid2=${uuid1:0:-1}2
	sed -i "s/root=.* rw/root=$uuid2 rw/; s/elevator=noop //" $dirconfig/boot/cmdline.txt
	sed -i "s/^PARTUUID=.*-01  /$uuid1  /; s/^PARTUUID=.*-02  /$uuid2  /" $dirconfig/etc/fstab
	
	rm -f $dirconfig/etc/{shairport-sync,spotifyd}.conf # temp: for ealier version
	cp -rf $dirconfig/* /
	[[ -e $dirsystem/enable ]] && systemctl -q enable $( cat $dirsystem/enable )
	[[ -e $dirsystem/disable ]] && systemctl -q disable $( cat $dirsystem/disable )
	hostnamectl set-hostname $( cat $dirsystem/hostname )
	mirror=$( cat $dirsystem/mirror )
	sed -i "0,/^Server/ s|//sg.mirror|//$mirror.mirror|" /etc/pacman.d/mirrorlist
	[[ -e $dirsystem/netctlprofile ]] && netctl enable "$( cat $dirsystem/netctlprofile )"
	timedatectl set-timezone $( cat $dirsystem/timezone )
	rm -rf $backupfile $dirconfig $dirsystem/{enable,disable,hostname,mirror,netctlprofile,timezone}
	chown -R http:http /srv/http
	chown mpd:audio $dirdata/mpd/mpd* &> /dev/null
	chmod 755 /srv/http/* $dirbash/* /srv/http/settings/*
	[[ -e $dirsystem/crossfade ]] && mpc crossfade $( cat $dirsystem/crossfade.conf )
	rmdir /mnt/MPD/NAS/* &> /dev/null
	readarray -t mountpoints <<< $( grep /mnt/MPD/NAS /etc/fstab | awk '{print $2}' | sed 's/\\040/ /g' )
	if [[ -n $mountpoints ]]; then
		for mountpoint in $mountpoints; do
			mkdir -p "$mountpoint"
		done
	fi
	[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
	$dirbash/cmd.sh power$'\n'reboot
	;;
getjournalctl )
	if grep -q 'Startup finished.*kernel' $filebootlog &> /devnull; then
		cat "$filebootlog"
	else
		pushstreamNotify 'Boot Log' 'Get ...' plus-r
		journalctl -b | sed -n '1,/Startup finished.*kernel/ p' | tee $filebootlog
	fi
	;;
hostname )
	hostname=${args[1]}
	hostnamectl set-hostname $hostname
	sed -i "s/^\(ssid=\).*/\1${args[1]}/" /etc/hostapd/hostapd.conf
	sed -i '/^\tname =/ s/".*"/"'$hostname'"/' /etc/shairport-sync.conf
	sed -i "s/^\(friendlyname = \).*/\1${args[1]}/" /etc/upmpdcli.conf
	rm -f /root/.config/chromium/SingletonLock 	# 7" display might need to rm: SingletonCookie SingletonSocket
	systemctl try-restart avahi-daemon bluetooth hostapd localbrowser mpd smb shairport-sync shairport-meta spotifyd upmpdcli
	pushRefresh
	;;
i2smodule )
	aplayname=${args[1]}
	output=${args[2]}
	dtoverlay=$( grep 'dtparam=i2c_arm=on\|dtparam=krnbt=on\|dtparam=spi=on\|dtoverlay=gpio\|dtoverlay=sdtweak,poll_once\|waveshare\|tft35a\|hdmi_force_hotplug=1' $fileconfig )
	if [[ $aplayname != onboard ]]; then
		dtoverlay+="
dtparam=i2s=on
dtoverlay=$aplayname"
		[[ $output == 'Pimoroni Audio DAC SHIM' ]] && dtoverlay+="
gpio=25=op,dh"
		[[ $aplayname == rpi-cirrus-wm5102 ]] && echo softdep arizona-spi pre: arizona-ldo1 > /etc/modprobe.d/cirrus.conf
		! grep -q gpio-shutdown $fileconfig && systemctl disable --now powerbutton
	else
		dtoverlay+="
dtparam=audio=on"
		revision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
		revision=${revision: -3:2}
		[[ $revision == 09 || $revision == 0c ]] && output='HDMI 1' || output=Headphones
		aplayname="bcm2835 $output"
		output="On-board - $output"
		rm -f $dirsystem/audio-* /etc/modprobe.d/cirrus.conf
	fi
	sed -i '/dtparam=\|dtoverlay=\|gpio=25=op,dh\|^$/ d' $fileconfig
	echo "$dtoverlay" | sed '/^$/ d' >> $fileconfig
	echo $aplayname > $dirsystem/audio-aplayname
	echo $output > $dirsystem/audio-output
	echo 'Audio I&#178;S module' >> $filereboot
	pushRefresh
	;;
lcdcalibrate )
	degree=$( grep rotate $fileconfig | cut -d= -f3 )
	cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
	systemctl stop localbrowser
	value=$( DISPLAY=:0 xinput_calibrator | grep Calibration | cut -d'"' -f4 )
	if [[ -n $value ]]; then
		sed -i "s/\(Calibration\"  \"\).*/\1$value\"/" /etc/X11/xorg.conf.d/99-calibration.conf
		systemctl start localbrowser
	fi
	;;
lcdchardisable )
	if [[ ! -e $dirsystem/lcd && ! -e $dirsystem/mpdoled ]]; then
		sed -i '/dtparam=i2c_arm=on\|dtparam=spi=on/ d' $fileconfig
		sed -i '/i2c-bcm2708\|i2c-dev/ d' $filemodule
	fi
	[[ -e $dirsystem/mpdoled ]] && sed -i '/i2c-bcm2708/ d' $filemodule
	rm $dirsystem/lcdchar
	pushRefresh
	;;
lcdcharset )
	# 0cols 1charmap 2inf 3i2caddress 4i2cchip 5pin_rs 6pin_rw 7pin_e 8pins_data 9backlight
	sed -i '/dtparam=i2c_arm=on/ d' $fileconfig
	sed -i '/i2c-bcm2708\|i2c-dev/ d' $filemodule
	conf="\
[var]
cols=${args[1]}
charmap=${args[2]}"
	if [[ ${args[3]} == i2c ]]; then
		! grep -q 'dtparam=i2c_arm=on' $fileconfig && echo 'Character LCD' >> $filereboot
		conf+="
address=${args[4]}
chip=${args[5]}"
		echo "\
dtparam=i2c_arm=on" >> $fileconfig
		echo "\
i2c-bcm2708
i2c-dev" >> $filemodule
	else
		conf+="
pin_rs=${args[6]}
pin_rw=${args[7]}
pin_e=${args[8]}
pins_data=$( echo ${args[@]:9:4} | tr ' ' , )"
		if ! grep -q 'waveshare\|tft35a' $fileconfig && [[ ! -e $dirsystem/mpdoled ]]; then
			sed -i '/dtparam=i2c_arm=on/ d' $fileconfig
		fi
	fi
	conf+="
backlight=${args[13]}"
	echo "$conf" > $dirsystem/lcdchar.conf
	$dirbash/lcdcharinit.py
	touch $dirsystem/lcdchar
	pushRefresh
	;;
lcddisable )
	sed -i 's/ fbcon=map:10 fbcon=font:ProFont6x11//' /boot/cmdline.txt
	sed -i '/hdmi_force_hotplug\|i2c_arm=on\|spi=on\|rotate=/ d' $fileconfig
	sed -i '/i2c-bcm2708\|i2c-dev/ d' $filemodule
	sed -i 's/fb1/fb0/' /etc/X11/xorg.conf.d/99-fbturbo.conf
	pushRefresh
	;;
lcdset )
	model=${args[1]}
	if [[ $model != tft35a ]]; then
		echo $model > /srv/http/data/system/lcdmodel
	else
		rm /srv/http/data/system/lcdmodel
	fi
	sed -i '/hdmi_force_hotplug\|i2c_arm=on\|spi=on\|rotate=/ d' $fileconfig
	sed -i '/i2c-bcm2708\|i2c-dev/ d' $filemodule
	sed -i '1 s/$/ fbcon=map:10 fbcon=font:ProFont6x11/' /boot/cmdline.txt
	echo "\
hdmi_force_hotplug=1
dtparam=spi=on
dtoverlay=$model:rotate=0
dtparam=i2c_arm=on" >> $fileconfig
	echo -n "\
i2c-bcm2708
i2c-dev
" >> $filemodule
	cp -f /etc/X11/{lcd0,xorg.conf.d/99-calibration.conf}
	sed -i 's/fb0/fb1/' /etc/X11/xorg.conf.d/99-fbturbo.conf
	systemctl enable localbrowser
	echo 'TFT 3.5" LCD' >> $filereboot
	pushRefresh
	;;
mirrorlist )
	file=/etc/pacman.d/mirrorlist
	current=$( grep ^Server $file | head -1 | sed 's|.*//\(.*\).mirror.*|\1|' )
	[[ -z $current ]] && current=0
	if ! grep -q '^###' $file; then
		pushstreamNotify 'Mirror List' 'Get ...' globe
		curl -skL https://github.com/archlinuxarm/PKGBUILDs/raw/master/core/pacman-mirrorlist/mirrorlist -o $file
	fi
	readarray -t lines <<< $( grep . $file \
								| sed -n '/### A/,$ p' \
								| sed 's/ (not Austria\!)//' )
	clist='"Auto (by Geo-IP)"'
	url=0
	for line in "${lines[@]}"; do
		if [[ ${line:0:4} == '### ' ]];then
			city=
			country=${line:4}
		elif [[ ${line:0:3} == '## ' ]];then
			city=${line:3}
		else
			[[ -n $city ]] && cc="$country - $city" || cc=$country
			clist+=',"'$cc'"'
			url+=',"'$( sed 's|.*//\(.*\).mirror.*|\1|' <<< $line )'"'
		fi
	done
	echo '{
  "country" : [ '$clist' ]
, "current" : "'$current'"
, "url"     : [ '$url' ]
}'
	;;
mount )
	protocol=${args[1]}
	mountpoint="/mnt/MPD/NAS/${args[2]}"
	ip=${args[3]}
	directory=${args[4]}
	user=${args[5]}
	password=${args[6]}
	extraoptions=${args[7]}
	update=${args[8]}

	! ping -c 1 -w 1 $ip &> /dev/null && echo "IP <code>$ip</code> not found." && exit

	if [[ -e $mountpoint ]]; then
		find "$mountpoint" -mindepth 1 | read && echo "Mount name <code>$mountpoint</code> not empty." && exit
	else
		mkdir "$mountpoint"
	fi
	chown mpd:audio "$mountpoint"
	if [[ $protocol == cifs ]]; then
		source="//$ip/$directory"
		options=noauto
		if [[ -z $user ]]; then
			options+=,username=guest
		else
			options+=",username=$user,password=$password"
		fi
		options+=,uid=$( id -u mpd ),gid=$( id -g mpd ),iocharset=utf8
	else
		source="$ip:$directory"
		options=defaults,noauto,bg,soft,timeo=5
	fi
	[[ -n $extraoptions ]] && options+=,$extraoptions
	echo "${source// /\\040}  ${mountpoint// /\\040}  $protocol  ${options// /\\040}  0  0" >> /etc/fstab
	mount "$mountpoint" 2> /dev/null
	if [[ $? == 0 ]]; then
		echo 0
		[[ $update == true ]] && $dirbash/cmd.sh mpcupdate$'\n'"${mountpoint:9}"  # /mnt/MPD/NAS/... > NAS/...
		pushRefresh
	else
		echo "Mount <code>$source</code> failed.<br>"$( echo "$std" | head -1 | sed 's/.*: //' )
		sed -i "\|${mountpoint// /\\040}| d" /etc/fstab
		rmdir "$mountpoint"
	fi
	;;
mpdoleddisable )
	if [[ ! -e $dirsystem/lcd && ! -e $dirsystem/lcdchar ]]; then
		sed -i '/dtparam=i2c_arm=on\|dtparam=spi=on/ d' $fileconfig
		sed -i '/i2c-dev/ d' $filemodule
	fi
	sed -i '/dtparam=.*_baudrate/ d' $fileconfig
	rm $dirsystem/mpdoled
	pushRefresh
	;;
mpdoledset )
	type=${args[1]}
	sed -i "s/-o ./-o $type/" /etc/systemd/system/mpd_oled.service
	sed -i '/dtparam=i2c_arm=on\|dtparam=spi=on\|dtparam=.*_baudrate/ d' $fileconfig
	sed -i '/i2c-dev/ d' $filemodule
	if [[ $type != 1 && $type != 7 ]]; then
		echo "\
dtparam=i2c_arm=on
dtparam=i2c_arm_baudrate=1200000" >> $fileconfig
		echo "\
i2c-dev" >> $filemodule
	else
		echo "\
dtparam=spi=on" >> $fileconfig
	fi
	echo 'Spectrum OLED' >> $filereboot
	touch $dirsystem/mpdoled
	pushRefresh
	;;
powerbuttondisable )
	systemctl disable --now powerbutton
	gpio -1 write $( grep led $dirsystem/powerbutton.conf | cut -d= -f2 ) 0
	sed -i '/gpio-shutdown/ d' $fileconfig
	pushRefresh
	;;
powerbuttonset )
	sw=${args[1]}
	led=${args[2]}
	reserved=${args[3]}
	echo "\
sw=$sw
led=$led
reserved=$reserved" > $dirsystem/powerbutton.conf
	prevreserved=$( grep gpio-shutdown $fileconfig | cut -d= -f3 )
	sed -i '/gpio-shutdown/ d' $fileconfig
	if [[ $sw != 5 ]]; then
		sed -i "/disable_overscan/ a\dtoverlay=gpio-shutdown,gpio_pin=$reserved" $fileconfig
		[[ $reserved != $prevreserved ]] && echo 'Power Button' >> $filereboot
	fi
	systemctl restart powerbutton
	systemctl enable powerbutton
	pushRefresh
	;;
relays )
	[[ ${args[1]} == true ]] && touch $dirsystem/relays || rm -f $dirsystem/relays
	pushRefresh
	;;
remount )
	mountpoint=${args[1]}
	source=${args[2]}
	if [[ ${mountpoint:9:3} == NAS ]]; then
		mount "$mountpoint"
	else
		udevil mount "$source"
	fi
	pushRefresh
	;;
remove )
	mountpoint=${args[1]}
	umount -l "$mountpoint"
	rmdir "$mountpoint" &> /dev/null
	sed -i "\|${mountpoint// /\\\\040}| d" /etc/fstab
	$dirbash/cmd.sh mpcupdate$'\n'NAS
	pushRefresh
	;;
servers )
	ntp=${args[1]}
	mirror=${args[2]}
	prevntp=$( grep ^NTP /etc/systemd/timesyncd.conf | cut -d= -f2 )
	prevmirror=$( grep ^Server /etc/pacman.d/mirrorlist \
					| head -1 \
					| sed 's|.*//\(.*\).mirror.*|\1|' )
	if [[ $ntp != $pevntp ]]; then
		sed -i "s/^\(NTP=\).*/\1$ntp/" /etc/systemd/timesyncd.conf
		ntpdate $ntp
	fi
	[[ $mirror != $prevmirror ]] && sed -i "0,/^Server/ s|//sg.mirror|//$mirror.mirror|" /etc/pacman.d/mirrorlist
	pushRefresh
	;;
soundprofile )
	soundprofile
	;;
soundprofiledisable )
	soundprofile reset
	pushRefresh
	;;
soundprofileget )
	val+=$( sysctl kernel.sched_latency_ns )$'\n'
	val+=$( sysctl vm.swappiness )$'\n'
	ifconfig | grep -q eth0 && val+=$( ifconfig eth0 \
										| grep 'mtu\|txq' \
										| sed 's/.*\(mtu.*\)/\1/; s/.*\(txq.*\) (.*/\1/; s/ / = /' )
	echo "${val:0:-1}"
	;;
soundprofileset )
	if [[ ${args[@]:1:4} == '18000000 60 1500 1000' ]]; then
		rm -f $dirsystem/soundprofile.conf
		soundprofile reset
	else
		echo -n "\
latency=${args[1]}
swappiness=${args[2]}
mtu=${args[3]}
txqueuelen=${args[4]}
" > $dirsystem/soundprofile.conf
		soundprofile
	fi
	pushRefresh
	;;
statusonboard )
	ifconfig
	if systemctl -q is-active bluetooth; then
		echo '<hr>'
		bluetoothctl show | sed 's/^\(Controller.*\)/bluetooth: \1/'
	fi
	;;
timezone )
	timezone=${args[1]}
	timedatectl set-timezone $timezone
	pushRefresh
	;;
unmount )
	mountpoint=${args[1]}
	if [[ ${mountpoint:9:3} == NAS ]]; then
		umount -l "$mountpoint"
	else
		udevil umount -l "$mountpoint"
	fi
	pushRefresh
	;;
usbconnect ) # for /etc/conf.d/devmon - devmon@http.service
	pushstreamNotify 'USB Drive' Connected. usbdrive
	update
	;;
usbremove ) # for /etc/conf.d/devmon - devmon@http.service
	pushstreamNotify 'USB Drive' Removed usbdrive
	update
	;;
vuleddisable )
	rm -f $dirsystem/vuled
	killall cava &> /dev/null
	p=$( cat /srv/http/data/system/vuled.conf )
	for i in $p; do
		echo 0 > /sys/class/gpio/gpio$i/value
	done
	if [[ -e $dirsystem/vumeter ]]; then
		cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
	else
		$dirbash/mpd-conf.sh
	fi
	pushRefresh
	;;
vuledset )
	echo ${args[@]:1} > $dirsystem/vuled.conf
	touch $dirsystem/vuled
	! grep -q mpd.fifo /etc/mpd.conf && $dirbash/mpd-conf.sh
	killall cava &> /dev/null
	cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
	pushRefresh
	;;
wlandisable )
	systemctl -q is-active hostapd && $dirbash/features.sh hostapddisable
	rmmod brcmfmac &> /dev/null
	pushRefresh
	;;
wlanset )
	regdom=${args[1]}
	apauto=${args[2]}
	rfkill | grep -q wlan || modprobe brcmfmac
	iw wlan0 set power_save off
	if [[ $apauto == false ]]; then
		touch $dirsystem/wlannoap
	else
		rm -f $dirsystem/wlannoap
	fi
	if ! grep -q $regdom /etc/conf.d/wireless-regdom; then
		sed -i 's/".*"/"'$regdom'"/' /etc/conf.d/wireless-regdom
		iw reg set $regdom
	fi
	pushRefresh
	;;
	
esac
