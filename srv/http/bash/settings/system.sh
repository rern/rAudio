#!/bin/bash

. /srv/http/bash/common.sh
fileconfig=/boot/config.txt
filemodule=/etc/modules-load.d/raspberrypi.conf

# convert each line to each args
readarray -t args <<< $1

dirPermissions() {
	chmod 755 /srv /srv/http /srv/http/* /mnt /mnt/MPD /mnt/MPD/*/
	chown http:http /srv /srv/http /srv/http/* /mnt /mnt/MPD /mnt/MPD/*/
	chmod -R 755 /srv/http/{assets,bash,data,settings}
	chown -R http:http /srv/http/{assets,bash,data,settings}
	chown mpd:audio $dirmpd $dirmpd/mpd.db $dirplaylists 2> /dev/null
	if [[ -L $dirshareddata ]]; then # server rAudio
		chmod 777 $filesharedip $dirshareddata/system/{display,order}
		readarray -t dirs <<< $( showmount --no-headers -e localhost | awk 'NF{NF-=1};1' )
		for dir in "${dirs[@]}"; do
			chmod 777 "$dir"
		done
	fi
}
pushReboot() {
	pushRefresh
	notify system "${1//\"/\\\"}" 'Reboot required.' 5000
	echo $1 >> $dirshm/reboot
}
I2Cset() {
	# parse finalized settings
	grep -E -q 'waveshare|tft35a' $fileconfig && lcd=1
	[[ -e $dirsystem/lcdchar ]] && grep -q -m1 inf=i2c $dirsystem/lcdchar.conf && I2Clcdchar=1
	if [[ -e $dirsystem/mpdoled ]]; then
		chip=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
		if [[ $chip != 1 && $chip != 7 ]]; then
			I2Cmpdoled=1
			[[ ! $baud ]] && baud=$( grep dtparam=i2c_arm_baudrate $fileconfig | cut -d= -f3 )
		else
			SPImpdoled=1
		fi
	fi

	# reset
	sed -i -E '/dtparam=i2c_arm=on|dtparam=spi=on|dtparam=i2c_arm_baudrate/ d' $fileconfig
	sed -i -E '/i2c-bcm2708|i2c-dev|^\s*$/ d' $filemodule
	[[ ! $( awk NF $filemodule ) ]] && rm $filemodule

	# dtparam=i2c_arm=on
	[[ $lcd || $I2Clcdchar || $I2Cmpdoled ]] && echo dtparam=i2c_arm=on >> $fileconfig
	# dtparam=spi=on
	[[ $lcd || $SPImpdoled ]] && echo dtparam=spi=on >> $fileconfig
	# dtparam=i2c_arm_baudrate=$baud
	[[ $I2Cmpdoled ]] && echo dtparam=i2c_arm_baudrate=$baud >> $fileconfig
	# i2c-dev
	[[ $lcd || $I2Clcdchar || $I2Cmpdoled ]] && echo i2c-dev >> $filemodule
	# i2c-bcm2708
	[[ $lcd || $I2Clcdchar ]] && echo i2c-bcm2708 >> $filemodule
}
sharedDataIPlist() {
	list=$( ipAddress )
	iplist=$( grep -v $list $filesharedip )
	for ip in $iplist; do
		if ping -4 -c 1 -w 1 $ip &> /dev/null; then
			if [[ $1 ]] ; then
				sshCommand $ip $dirsettings/system.sh shareddatarestart & >/dev/null &
			fi
			list+=$'\n'$ip
		fi
	done
	sort -u <<< $list > $filesharedip
}
sharedDataSet() {
	rm -f $dirmpd/{listing,updating}
	mkdir -p $dirbackup
	for dir in audiocd bookmarks lyrics mpd playlists webradio; do
		[[ ! -e $dirshareddata/$dir ]] && cp -r $dirdata/$dir $dirshareddata  # not server rAudio - initial setup
		rm -rf $dirbackup/$dir
		mv -f $dirdata/$dir $dirbackup
		ln -s $dirshareddata/$dir $dirdata
	done
	if [[ ! -e $dirshareddata/system ]]; then # not server rAudio - initial setup
		mkdir $dirshareddata/system
		cp -f $dirsystem/{display,order} $dirshareddata/system
	fi
	touch $filesharedip $dirshareddata/system/order # in case order not exist
	chmod 777 $filesharedip $dirshareddata/system/{display,order}
	for file in display order; do
		mv $dirsystem/$file $dirbackup
		ln -s $dirshareddata/system/$file $dirsystem
	done
	echo data > $dirnas/.mpdignore
	echo "\
SD
USB" > /mnt/MPD/.mpdignore
	mpc -q clear
	systemctl restart mpd
	sharedDataIPlist
	pushRefresh
	pushstream refresh '{"page":"features","shareddata":true}'
	$dirbash/cmd.sh webradiocopybackup &> /dev/null &
}
soundProfile() {
	if [[ $1 == reset ]]; then
		swappiness=60
		mtu=1500
		txqueuelen=1000
		rm -f $dirsystem/soundprofile
	else
		. $dirsystem/soundprofile.conf
		touch $dirsystem/soundprofile
	fi
	sysctl vm.swappiness=$swappiness
	if ifconfig | grep -q -m1 eth0; then
		ip link set eth0 mtu $mtu
		ip link set eth0 txqueuelen $txqueuelen
	fi
}
webradioCopyBackup() {
	if [[ -e $dirbackup/webradio ]]; then
		rm -rf $dirbackup/webradio
		cp -r $dirwebradio $dirbackup
		webradio=$( grep webradio $dirmpd/counts )
		sed -i "s/.*webradio.*/$webradio/" $dirbackup/mpd/counts
	fi
}

case ${args[0]} in

bluetooth )
	if [[ ${args[1]} == true ]]; then
		btdiscoverable=${args[2]}
		btformat=${args[3]}
		if [[ $btdiscoverable == true ]]; then
			yesno=yes
			touch $dirsystem/btdiscoverable
		else
			yesno=no
			rm $dirsystem/btdiscoverable
		fi
		sed -i '/dtparam=krnbt=on/ s/^#//' $fileconfig
		if ls -l /sys/class/bluetooth | grep -q -m1 serial; then
			systemctl start bluetooth
			! grep -q -m1 'device.*bluealsa' $dirmpdconf/output.conf && $dirsettings/player-conf.sh
			rfkill | grep -q -m1 bluetooth && pushstream refresh '{"page":"networks","activebt":true}'
		else
			pushReboot Bluetooth
		fi
		bluetoothctl discoverable $yesno &> /dev/null
		[[ -e $dirsystem/btformat  ]] && prevbtformat=true || prevbtformat=false
		[[ $btformat == true ]] && touch $dirsystem/btformat || rm $dirsystem/btformat
		[[ $btformat != $prevbtformat ]] && $dirsettings/player-conf.sh
	else
		sed -i '/^dtparam=krnbt=on/ s/^/#/' $fileconfig
		notify bluetooth 'On-board Bluetooth' 'Disabled after reboot.'
		if ! rfkill | grep -q -m1 bluetooth; then
			systemctl stop bluetooth
			killall bluetooth
			rm -f $dirshm/{btdevice,btreceiver,btsender}
			grep -q -m1 'device.*bluealsa' $dirmpdconf/output.conf && $dirsettings/player-conf.sh
		fi
	fi
	pushRefresh
	;;
bluetoothstart )
	sleep 3
	[[ -e $dirsystem/btdiscoverable ]] && yesno=yes || yesno=no
	bluetoothctl discoverable $yesno &> /dev/null
	bluetoothctl discoverable-timeout 0 &> /dev/null
	bluetoothctl pairable yes &> /dev/null
	;;
bluetoothstatus )
	if rfkill | grep -q -m1 bluetooth; then
		hci=$( ls -l /sys/class/bluetooth | sed -n '/serial/ {s|.*/||; p}' )
		mac=$( cut -d' ' -f1 /sys/kernel/debug/bluetooth/$hci/identity )
	fi
	echo "\
<bll># bluetoothctl show</bll>
$( bluetoothctl show $mac )"
	;;
databackup )
	dirconfig=$dirdata/config
	backupfile=$dirtmp/backup.gz
	rm -f $backupfile
	alsactl store
	files=(
/boot/cmdline.txt
/boot/config.txt
/boot/shutdown.sh
/boot/startup.sh
/etc/conf.d/wireless-regdom
/etc/default/snapclient
/etc/hostapd/hostapd.conf
/etc/samba/smb.conf
/etc/systemd/network/eth.network
/etc/systemd/timesyncd.conf
/etc/X11/xorg.conf.d/99-calibration.conf
/etc/X11/xorg.conf.d/99-raspi-rotate.conf
/etc/exports
/etc/fstab
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
	timedatectl | awk '/zone:/ {print $3}' > $dirsystem/timezone
	readarray -t profiles <<< $( ls -p /etc/netctl | grep -v / )
	if [[ $profiles ]]; then
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
	xinitrcfiles=$( ls /etc/X11/xinit/xinitrc.d | grep -v 50-systemd-user.sh )
	if [[ $xinitrcfiles ]]; then
		mkdir -p $dirconfig/etc/X11/xinit
		cp -r /etc/X11/xinit/xinitrc.d $dirconfig/etc/X11/xinit
	fi
	
	services='bluetooth hostapd localbrowser mpdscribble@mpd nfs-server powerbutton shairport-sync smb snapclient snapserver spotifyd upmpdcli'
	for service in $services; do
		systemctl -q is-active $service && enable+=" $service" || disable+=" $service"
	done
	[[ $enable ]] && echo $enable > $dirsystem/enable
	[[ $disable ]] && echo $disable > $dirsystem/disable
	
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
	backupfile=$dirtmp/backup.gz
	dirconfig=$dirdata/config
	systemctl stop mpd
	# remove all flags
	rm -f $dirsystem/{autoplay,login*}                          # features
	rm -f $dirsystem/{crossfade*,custom*,dop*,mixertype*,soxr*} # mpd
	rm -f $dirsystem/{updating,listing}                         # updating_db
	rm -f $dirsystem/{color,relays,soundprofile}                # system
	
	bsdtar -xpf $backupfile -C /srv/http
	dirPermissions
	[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
	uuid1=$( head -1 /etc/fstab | cut -d' ' -f1 )
	uuid2=${uuid1:0:-1}2
	sed -i "s/root=.* rw/root=$uuid2 rw/; s/elevator=noop //" $dirconfig/boot/cmdline.txt
	sed -i "s/^PARTUUID=.*-01  /$uuid1  /; s/^PARTUUID=.*-02  /$uuid2  /" $dirconfig/etc/fstab
	
	cp -rf $dirconfig/* /
	[[ -e $dirsystem/enable ]] && systemctl -q enable $( < $dirsystem/enable )
	[[ -e $dirsystem/disable ]] && systemctl -q disable $( < $dirsystem/disable )
	if systemctl -q is-enabled camilladsp; then
		modprobe snd-aloop
		echo snd-aloop > /etc/modules-load.d/loopback.conf
	fi
	hostnamectl set-hostname $( < $dirsystem/hostname )
	if [[ -e $dirsystem/mirror ]]; then
		mirror=$( < $dirsystem/mirror )
		sed -i "0,/^Server/ s|//.*mirror|//$mirror.mirror|" /etc/pacman.d/mirrorlist
	fi
	[[ -e $dirsystem/netctlprofile ]] && netctl enable "$( < $dirsystem/netctlprofile )"
	timedatectl set-timezone $( < $dirsystem/timezone )
	rm -rf $backupfile $dirconfig $dirsystem/{enable,disable,hostname,netctlprofile,timezone}
	[[ -e $dirsystem/crossfade ]] && mpc crossfade $( < $dirsystem/crossfade.conf )
	readarray -t dirs <<< $( find $dirnas -mindepth 1 -maxdepth 1 -type d )
	for dir in "${dirs[@]}"; do
		umount -l "$dir" &> /dev/null
		rmdir "$dir" &> /dev/null
	done
	ipserver=$( grep $dirshareddata /etc/fstab | cut -d: -f1 )
	if [[ $ipserver ]]; then
		fstab=$( sed "/^$ipserver/ d" /etc/fstab )
		column -t <<< $fstab > /etc/fstab
	fi
	readarray -t mountpoints <<< $( grep $dirnas /etc/fstab | awk '{print $2}' | sed 's/\\040/ /g' )
	if [[ $mountpoints ]]; then
		for mountpoint in $mountpoints; do
			mkdir -p "$mountpoint"
		done
	fi
	grep -q -m1 $dirsd /etc/exports && $dirsettings/features.sh nfsserver$'\n'true
	$dirbash/cmd.sh power$'\n'reboot
	;;
dirpermissions )
	dirPermissions
	;;
hddinfo )
	dev=${args[1]}
	echo -n "\
<bll># hdparm -I $dev</bll>
$( hdparm -I $dev | sed '1,3 d' )
"
	;;
hddsleep )
	if [[ ${args[1]} == true ]]; then
		apm=${args[2]}
		devs=$( mount | grep .*USB/ | cut -d' ' -f1 )
		for dev in $devs; do
			! hdparm -B $dev | grep -q -m1 'APM_level' && notsupport+="$dev"$'\n' && continue

			hdparm -q -B $apm $dev
			hdparm -q -S $apm $dev
			support=1
		done
		[[ $notsupport ]] && echo -e "$notsupport"
		[[ $support ]] && echo $apm > $dirsystem/apm
	else
		devs=$( mount | grep .*USB/ | cut -d' ' -f1 )
		if [[ $devs ]]; then
			for dev in $devs; do
				! hdparm -B $dev | grep -q -m1 'APM_level' && continue
				
				hdparm -q -B 128 $dev &> /dev/null
				hdparm -q -S 0 $dev &> /dev/null
			done
		fi
		rm -f $dirsystem/hddsleep
	fi
	pushRefresh
	;;
hostname )
	hostname=${args[1]}
	hostnamectl set-hostname $hostname
	sed -i -E "s/^(ssid=).*/\1$hostname/" /etc/hostapd/hostapd.conf
	sed -i -E 's/(name = ").*/\1'$hostname'"/' /etc/shairport-sync.conf
	sed -i -E "s/^(friendlyname = ).*/\1$hostname/" /etc/upmpdcli.conf
	rm -f /root/.config/chromium/SingletonLock 	# 7" display might need to rm: SingletonCookie SingletonSocket
	systemctl try-restart avahi-daemon bluetooth hostapd localbrowser mpd smb shairport-sync shairport-meta spotifyd upmpdcli
	pushRefresh
	;;
i2seeprom )
	if [[ ${args[1]} == true ]]; then
		sed -i '$ a\force_eeprom_read=0' $fileconfig
	else
		sed -i '/force_eeprom_read=0/ d' $fileconfig
	fi
	pushRefresh
	;;
i2smodule )
	aplayname=${args[1]}
	output=${args[2]}
	dtoverlay=$( grep -E 'dtoverlay=gpio
						 |dtoverlay=sdtweak,poll_once
						 |dtparam=i2c_arm=on
						 |dtparam=krnbt=on
						 |dtparam=spi=on
						 |hdmi_force_hotplug=1
						 |tft35a
						 |waveshare' $fileconfig )
	if [[ $aplayname != onboard ]]; then
		dtoverlay+="
dtparam=i2s=on
dtoverlay=$aplayname"
		[[ $output == 'Pimoroni Audio DAC SHIM' ]] && dtoverlay+="
gpio=25=op,dh"
		[[ $aplayname == rpi-cirrus-wm5102 ]] && echo softdep arizona-spi pre: arizona-ldo1 > /etc/modprobe.d/cirrus.conf
		! grep -q -m1 gpio-shutdown $fileconfig && systemctl disable --now powerbutton
	else
		dtoverlay+="
dtparam=audio=on"
		cpuInfo
		[[ $BB == 09 || $BB == 0c ]] && output='HDMI 1' || output=Headphones
		aplayname="bcm2835 $output"
		output="On-board $output"
		rm -f $dirsystem/audio-* /etc/modprobe.d/cirrus.conf
	fi
	sed -i -E '/dtparam=|dtoverlay=|force_eeprom_read=0|gpio=25=op,dh|^$/ d' $fileconfig
	echo "$dtoverlay" >> $fileconfig
	sed -i '/^$/ d' $fileconfig
	echo $aplayname > $dirsystem/audio-aplayname
	echo $output > $dirsystem/audio-output
	pushReboot 'Audio I&#178;S module'
	;;
journalctl )
	filebootlog=$dirtmp/bootlog
	[[ -e $filebootlog ]] && cat $filebootlog && exit
	
	journal="\
<bll># journalctl -b</bll>"
	journal+="
$( journalctl -b | sed -n '1,/Startup finished.*kernel/ {s|Failed to start .*|<red>&</red>|; p}' )
"
	startupfinished=$( sed -E -n '/Startup finished/ {s/^.*(Startup)/\1/; p}' <<< $journal )
	if [[ $startupfinished ]]; then
		echo "\
$startupfinished

$journal" | tee $filebootlog
	else
		echo "$journal"
	fi
	;;
killaddon )
	installfile=${args[1]}
	addon=${args[2]}
	killall $installfile wget pacman &> /dev/null
	rm -f /var/lib/pacman/db.lck /srv/http/*.zip /usr/local/bin/uninstall_$addon.sh /srv/http/data/addons/$addon
	;;
lcdcalibrate )
	degree=$( grep rotate $fileconfig | cut -d= -f3 )
	cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
	systemctl stop localbrowser
	value=$( DISPLAY=:0 xinput_calibrator | grep Calibration | cut -d'"' -f4 )
	if [[ $value ]]; then
		sed -i -E 's/(Calibration" +").*/\1'$value'"/' /etc/X11/xorg.conf.d/99-calibration.conf
		systemctl start localbrowser
	fi
	;;
lcdcharset )
	killall lcdchar.py &> /dev/null
	lcdcharinit.py
	lcdchar.py ${args[1]}
	;;
lcdchar )
	if [[ ${args[1]} == true ]]; then
		# 0cols 1charmap 2inf 3i2caddress 4i2cchip 5pin_rs 6pin_rw 7pin_e 8pins_data 9backlight
		conf="\
[var]
cols=${args[2]}
charmap=${args[3]}"
		if [[ ${args[4]} == i2c ]]; then
			conf+="
inf=i2c
address=${args[5]}
chip=${args[6]}"
			! ls /dev/i2c* &> /dev/null && reboot=1
		else
			conf+="
inf=gpio
pin_rs=${args[7]}
pin_rw=${args[8]}
pin_e=${args[9]}
pins_data=[$( tr ' ' , <<< ${args[@]:10:4} )]"
		fi
		conf+="
backlight=${args[14]^}"
		echo "$conf" > $dirsystem/lcdchar.conf
		touch $dirsystem/lcdchar
		I2Cset
		if [[ $reboot ]]; then
			pushReboot 'Character LCD'
		else
			lcdchar.py logo
			pushRefresh
		fi
	else
		rm $dirsystem/lcdchar
		I2Cset
		lcdchar.py clear
		pushRefresh
	fi
	;;
lcd )
	if [[ ${args[1]} == true ]]; then
		model=${args[2]}
		if [[ $model != tft35a ]]; then
			echo $model > $dirsystem/lcdmodel
		else
			rm $dirsystem/lcdmodel
		fi
		sed -i '1 s/$/ fbcon=map:10 fbcon=font:ProFont6x11/' /boot/cmdline.txt
		sed -i -E '/hdmi_force_hotplug|rotate=/ d' $fileconfig
		echo "\
hdmi_force_hotplug=1
dtoverlay=$model:rotate=0" >> $fileconfig
		cp -f /etc/X11/{lcd0,xorg.conf.d/99-calibration.conf}
		sed -i '/disable-software-rasterizer/ d' xinitrc
		sed -i 's/fb0/fb1/' /etc/X11/xorg.conf.d/99-fbturbo.conf
		I2Cset
		if [[ $( uname -m ) == armv7l ]] && ! grep -q -m1 no-xshm /srv/http/bash/xinitrc; then
			sed -i '/^chromium/ a\	--no-xshm \\' /srv/http/bash/xinitrc
		fi
		systemctl enable localbrowser
		pushReboot 'TFT 3.5" LCD'
	else
		sed -i 's/ fbcon=map:10 fbcon=font:ProFont6x11//' /boot/cmdline.txt
		sed -i -E '/hdmi_force_hotplug|rotate=/ d' $fileconfig
		sed -i '/incognito/ i\	--disable-software-rasterizer \\' xinitrc
		sed -i 's/fb1/fb0/' /etc/X11/xorg.conf.d/99-fbturbo.conf
		I2Cset
		pushRefresh
	fi
	;;
mirrorlist )
	file=/etc/pacman.d/mirrorlist
	current=$( grep -m1 ^Server $file | sed 's|\.*mirror.*||; s|.*//||' )
	[[ ! $current ]] && current=0
	if : >/dev/tcp/8.8.8.8/53; then
		notify -blink globe 'Mirror List' 'Get ...'
		curl -sfLO https://github.com/archlinuxarm/PKGBUILDs/raw/master/core/pacman-mirrorlist/mirrorlist
		[[ $? == 0 ]] && mv -f mirrorlist $file || rm mirrorlist
	fi
	readarray -t lines <<< $( awk NF $file | sed -n '/### A/,$ {s/ (not Austria\!)//; s/.mirror.*//; s|.*//||; p}' )
	clist='"Auto (by Geo-IP)"'
	codelist=0
	for line in "${lines[@]}"; do
		if [[ ${line:0:4} == '### ' ]];then
			city=
			country=${line:4}
		elif [[ ${line:0:3} == '## ' ]];then
			city=${line:3}
		else
			[[ $city ]] && cc="$country - $city" || cc=$country
			clist+=',"'$cc'"'
			codelist+=',"'$line'"'
		fi
	done
	echo '{
  "country" : [ '$clist' ]
, "current" : "'$current'"
, "code"    : [ '$codelist' ]
}'
	;;
mount )
	protocol=${args[1]}
	mountpoint="$dirnas/${args[2]}"
	ip=${args[3]}
	directory=${args[4]}
	user=${args[5]}
	password=${args[6]}
	extraoptions=${args[7]}
	shareddata=${args[8]}

	! ping -c 1 -w 1 $ip &> /dev/null && echo "IP address not found: <wh>$ip</wh>" && exit

	[[ $( ls "$mountpoint" ) ]] && echo "Mount name <code>$mountpoint</code> not empty." && exit
	
	umount -ql "$mountpoint"
	mkdir -p "$mountpoint"
	chown mpd:audio "$mountpoint"
	if [[ $protocol == cifs ]]; then
		source="//$ip/$directory"
		options=noauto
		if [[ ! $user ]]; then
			options+=,username=guest
		else
			options+=",username=$user,password=$password"
		fi
		options+=,uid=$( id -u mpd ),gid=$( id -g mpd ),iocharset=utf8
	else
		source="$ip:$directory"
		options=defaults,noauto,bg,soft,timeo=5
	fi
	[[ $extraoptions ]] && options+=,$extraoptions
	fstab="\
$( < /etc/fstab )
${source// /\\040}  ${mountpoint// /\\040}  $protocol  ${options// /\\040}  0  0"
	mv /etc/fstab{,.backup}
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	std=$( mount "$mountpoint" 2>&1 )
	if [[ $? != 0 ]]; then
		mv -f /etc/fstab{.backup,}
		rmdir "$mountpoint"
		systemctl daemon-reload
		echo "\
Mount failed:
<br><code>$source</code>
<br>$( sed -n '1 {s/.*: //; p}' <<< $std )"
		exit
		
	else
		rm /etc/fstab.backup
	fi
	
	[[ $update == true ]] && $dirbash/cmd.sh mpcupdate$'\n'"${mountpoint:9}"  # /mnt/MPD/NAS/... > NAS/...
	for i in {1..5}; do
		sleep 1
		mount | grep -q -m1 "$mountpoint" && break
	done
	[[ $shareddata == true ]] && sharedDataSet || pushRefresh
	;;
mountforget )
	mountpoint=${args[1]}
	umount -l "$mountpoint"
	rmdir "$mountpoint" &> /dev/null
	fstab=$( grep -v ${mountpoint// /\\\\040} /etc/fstab )
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	$dirbash/cmd.sh mpcupdate$'\n'NAS
	pushRefresh
	;;
mountremount )
	mountpoint=${args[1]}
	source=${args[2]}
	if [[ ${mountpoint:9:3} == NAS ]]; then
		mount "$mountpoint"
	else
		udevil mount "$source"
	fi
	pushRefresh
	;;
mountunmount )
	mountpoint=${args[1]}
	if [[ ${mountpoint:9:3} == NAS ]]; then
		umount -l "$mountpoint"
	else
		udevil umount -l "$mountpoint"
	fi
	pushRefresh
	;;
mpdoledlogo )
	systemctl stop mpd_oled
	type=$( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 )
	mpd_oled -o $type -L
	;;
mpdoled )
	if [[ ${args[1]} == true ]]; then
		chip=${args[2]}
		baud=${args[3]}
		if [[ $( grep mpd_oled /etc/systemd/system/mpd_oled.service | cut -d' ' -f3 ) != $chip ]]; then
			sed -i "s/-o ./-o $chip/" /etc/systemd/system/mpd_oled.service
			systemctl daemon-reload
		fi
		if [[ $chip != 1 && $chip != 7 ]]; then
			[[ $( grep dtparam=i2c_arm_baudrate $fileconfig | cut -d= -f3 ) != $baud ]] && reboot=1
			! ls /dev/i2c* &> /dev/null && reboot=1
		else
			! grep -q -m1 dtparam=spi=on $fileconfig && reboot=1
		fi
		touch $dirsystem/mpdoled
		I2Cset
		if [[ $reboot ]]; then
			pushReboot 'Spectrum OLED'
		else
			[[ ! -e $dirmpdconf/fifo.conf ]] && $dirsettings/player-conf.sh
			pushRefresh
		fi
	else
		rm $dirsystem/mpdoled
		I2Cset
		$dirsettings/player-conf.sh
		pushRefresh
	fi
	;;
packagelist )
	filepackages=$dirtmp/packages
	if [[ ! -e $filepackages ]]; then
		notify system Backend 'Package list ...'
		pacmanqi=$( pacman -Qi | grep -E '^Name|^Vers|^Desc|^URL' )
		while read line; do
			case ${line:0:3} in
			Nam ) name=$line;;
			Ver ) version=$line;;
			Des ) description=$line;;
			URL ) url=$line
				  lines+="\
$url
$name
$version
$description
"
;;
			esac
		done <<< $pacmanqi
		sed -E 's|^URL.*: (.*)|<a href="\1" target="_blank">|
				s|^Name.*: (.*)|\1</a> |
				s|^Vers.*: (.*)|\1|
				s|^Desc.*: (.*)|<p>\1</p>|' <<< $lines \
				> $dirtmp/packages
	fi
	grep -B1 -A2 --no-group-separator "^${args[1],}" $filepackages
	;;
pkgstatus )
	id=${args[1]}
	pkg=$id
	service=$id
	case $id in
		camilladsp )
			fileconf=$dircamilladsp/configs/camilladsp.yml
			;;
		hostapd )
			conf="\
<bll># cat /etc/hostapd/hostapd.conf</bll>
$( < /etc/hostapd/hostapd.conf )

<bll># cat /etc/dnsmasq.conf</bll>
$( < /etc/dnsmasq.conf )"
			;;
		localbrowser )
			pkg=chromium
			fileconf=$dirsystem/localbrowser.conf
			;;
		mpd )
			conf=$( grep -v ^i $mpdconf )
			for file in autoupdate buffer outputbuffer replaygain normalization; do
				fileconf=$dirmpdconf/$file.conf
				[[ -e $fileconf ]] && conf+=$'\n'$( < $fileconf )
			done
			conf=$( sort <<< $conf | sed 's/  *"/^"/' | column -t -s^ )
			for file in cdio curl ffmpeg fifo httpd snapserver soxr-custom soxr output; do
				fileconf=$dirmpdconf/$file.conf
				[[ -e $fileconf ]] && conf+=$'\n'$( < $fileconf )
			done
			conf="\
<bll># $mpdconf</bll>
$conf"
			;;
		nfs-server )
			pkg=nfs-utils
			systemctl -q is-active nfs-server && fileconf=/etc/exports
			;;
		rtsp-simple-server )
			conf="\
<bll># rtl_test -t</bll>
$( script -c "timeout 1 rtl_test -t" | grep -v ^Script )"
			;;
		smb )
			pkg=samba
			fileconf=/etc/samba/smb.conf
			;;
		snapclient|snapserver )
			pkg=snapcast
			[[ $id == snapclient ]] && fileconf=/etc/default/snapclient
			;;
		* )
			fileconf=/etc/$id.conf
			;;
	esac
	config="<code>$( pacman -Q $pkg )</code>"
	if [[ $conf ]]; then
		config+="
$conf"
	elif [[ -e $fileconf ]]; then
		config+="
<bll># cat $fileconf</bll>
$( grep -v ^# $fileconf )"
	fi
	status=$( systemctl status $service \
					| sed -E  -e '1 s|^.* (.*service) |<code>\1</code>|
							' -e '/^\s*Active:/ {s|( active \(.*\))|<grn>\1</grn>|
												 s|( inactive \(.*\))|<red>\1</red>|
												 s|(failed)|<red>\1</red>|ig}' )
	if [[ $pkg == chromium ]]; then
		status=$( grep -E -v 'Could not resolve keysym|Address family not supported by protocol|ERROR:chrome_browser_main_extra_parts_metrics' <<< $status )
	elif [[ $pkg == nfs-utils ]]; then
		status=$( grep -v 'Protocol not supported' <<< $status )
	fi
	echo "\
$config

$status"
	;;
powerbutton )
	if [[ ${args[1]} == true ]]; then
		if [[ ${args[6]} == true ]]; then # audiophonics
			sed -i '/disable_overscan/ a\
dtoverlay=gpio-poweroff,gpiopin=22\
dtoverlay=gpio-shutdown,gpio_pin=17,active_low=0,gpio_pull=down
' $fileconfig
			touch $dirsystem/audiophonics
			pushReboot 'Power Button'
			exit
		fi
		
		on=${args[2]} # always = 5
		sw=${args[3]}
		led=${args[4]}
		reserved=${args[5]}
		echo "\
on=5
sw=$sw
led=$led
reserved=$reserved
" > $dirsystem/powerbutton.conf
		prevreserved=$( grep gpio-shutdown $fileconfig | cut -d= -f3 )
		sed -i '/gpio-shutdown/ d' $fileconfig
		systemctl restart powerbutton
		systemctl enable powerbutton
		if [[ $sw == 5 ]]; then
			pushRefresh
		else
			sed -i "/disable_overscan/ a\dtoverlay=gpio-shutdown,gpio_pin=$reserved" $fileconfig
			[[ $reserved != $prevreserved ]] && pushReboot 'Power Button'
		fi
	else
		if [[ -e $dirsystem/audiophonics ]]; then
			rm $dirsystem/audiophonics
		else
			systemctl disable --now powerbutton
			gpio -1 write $( grep led $dirsystem/powerbutton.conf | cut -d= -f2 ) 0
		fi
		sed -i -E '/gpio-poweroff|gpio-shutdown/ d' $fileconfig
		pushRefresh
	fi
	;;
rebootlist )
	killall networks-scan.sh &> /dev/null
	[[ -e $dirshm/reboot ]] && sort -u $dirshm/reboot
	;;
relays )
	rm -f $dirsystem/relays
	pushRefresh
	pushstream display '{"submenu":"relays","value":false}'
	;;
rfkilllist )
	echo "\
<bll># rfkill</bll>
$( rfkill )"
	;;
rotaryencoder )
	if [[ ${args[1]} == true ]]; then
		echo "\
pina=${args[2]}
pinb=${args[3]}
pins=${args[4]}
step=${args[5]}
" > $dirsystem/rotaryencoder.conf
		systemctl restart rotaryencoder
		systemctl enable rotaryencoder
	else
		systemctl disable --now rotaryencoder
	fi
	pushRefresh
	;;
servers )
	ntp=${args[1]}
	mirror=${args[2]}
	file=/etc/systemd/timesyncd.conf
	prevntp=$( grep ^NTP $file | cut -d= -f2 )
	if [[ $ntp != $prevntp ]]; then
		sed -i -E "s/^(NTP=).*/\1$ntp/" $file
		ntpdate $ntp
	fi
	if [[ $mirror ]]; then
		file=/etc/pacman.d/mirrorlist
		prevmirror=$( grep -m1 ^Server $file | sed 's|\.*mirror.*||; s|.*//||' )
		if [[ $mirror != $prevmirror ]]; then
			if [[ $mirror == 0 ]]; then
				mirror=
				rm $dirsystem/mirror
			else
				echo $mirror > $dirsystem/mirror
				mirror+=.
			fi
			sed -i "0,/^Server/ s|//.*mirror|//${mirror}mirror|" $file
		fi
	fi
	pushRefresh
	;;
shareddataconnect )
	ip=${args[1]}
	if [[ ! $ip && -e $dirsystem/sharedipserver ]]; then # sshpass from server to reconnect
		ip=$( < $dirsystem/sharedipserver )
		! ping -c 1 -w 1 $ip &> /dev/null && exit
		
		reconnect=1
	fi
	
	readarray -t paths <<< $( timeout 3 showmount --no-headers -e $ip 2> /dev/null | awk 'NF{NF-=1};1' )
	for path in "${paths[@]}"; do
		dir="$dirnas/$( basename "$path" )"
		[[ $( ls "$dir" ) ]] && echo "Directory not empty: <code>$dir</code>" && exit
		
		umount -ql "$dir"
	done
	options="nfs  defaults,noauto,bg,soft,timeo=5  0  0"
	fstab=$( < /etc/fstab )
	for path in "${paths[@]}"; do
		name=$( basename "$path" )
		[[ $path == $dirusb/SD || $path == $dirusb/data ]] && name=usb$name
		dir="$dirnas/$name"
		mkdir -p "$dir"
		mountpoints+=( "$dir" )
		fstab+="
$ip:${path// /\\040}  ${dir// /\\040}  $options"
	done
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	for dir in "${mountpoints[@]}"; do
		mount "$dir"
	done
	sharedDataSet
	if [[ $reconnect ]]; then
		rm $dirsystem/sharedipserver
		notify rserver 'Server rAudio' 'Online ...'
	fi
	;;
shareddatadisconnect )
	disable=${args[1]} # null - sshpass from server rAudio to disconnect
	! grep -q -m1 $dirshareddata /etc/fstab && echo -1 && exit
	
	for dir in audiocd bookmarks lyrics mpd playlists webradio; do
		if [[ -L $dirdata/$dir ]]; then
			rm -rf $dirdata/$dir
			[[ -e $dirbackup/$dir ]] && mv $dirbackup/$dir $dirdata || mkdir $dirdata/$dir
		fi
	done
	rm $dirsystem/{display,order}
	mv -f $dirbackup/{display,order} $dirsystem
	rmdir $dirbackup &> /dev/null
	rm -f $dirshareddata $dirnas/.mpdignore /mnt/MPD/.mpdignore
	sed -i "/$( ipAddress )/ d" $filesharedip
	mpc -q clear
	if grep -q -m1 ":$dirsd " /etc/fstab; then # client of server rAudio
		ipserver=$( grep $dirshareddata /etc/fstab | cut -d: -f1 )
		fstab=$( grep -v ^$ipserver /etc/fstab )
		readarray -t paths <<< $( timeout 3 showmount --no-headers -e $ipserver 2> /dev/null | awk 'NF{NF-=1};1' )
		for path in "${paths[@]}"; do
			name=$( basename "$path" )
			[[ $path == $dirusb/SD || $path == $dirusb/data ]] && name=usb$name
			dir="$dirnas/$name"
			umount -l "$dir"
			rmdir "$dir" &> /dev/null
		done
	else # other servers
		fstab=$( grep -v $dirshareddata /etc/fstab )
		umount -l $dirshareddata
		rmdir $dirshareddata
	fi
	column -t <<< $fstab > /etc/fstab
	systemctl daemon-reload
	systemctl restart mpd
	pushRefresh
	pushstream refresh '{"page":"features","shareddata":false}'
	if [[ ! $disable ]]; then
		echo $ipserver > $dirsystem/sharedipserver # for sshpass reconnect
		notify rserver 'Server rAudio' 'Offline ...'
	fi
	;;
shareddataiplist )
	sharedDataIPlist ${args[1]}
	;;
shareddatarestart )
	systemctl restart mpd
	pushstream mpdupdate $( < $dirmpd/counts )
	;;
sharelist )
	ip=${args[1]}
	! ping -c 1 -w 1 $ip &> /dev/null && echo "IP address not found: <wh>$ip</wh>" && exit
	
	if [[ ${args[2]} == smb ]]; then
		script -c "timeout 10 smbclient -NL $ip" $dirshm/smblist &> /dev/null # capture /dev/tty to file
		paths=$( sed -e '/Disk/! d' -e '/\$/d' -e 's/^\s*//; s/\s\+Disk\s*$//' $dirshm/smblist )
	else
		paths=$( timeout 5 showmount --no-headers -e $ip 2> /dev/null | awk 'NF{NF-=1};1' | sort )
	fi
	if [[ $paths ]]; then
		echo "\
Server rAudio @<wh>$ip</wh> :

<pre><wh>$paths</wh></pre>"
	else
		echo "No NFS shares found @<wh>$ip</wh>"
	fi
	;;
sharelistsmb )
	timeout 10 smbclient -NL ${args[1]} | sed -e '/Disk/! d' -e '/\$/d' -e 's/^\s*//; s/\s\+Disk\s*$//'
	;;
soundprofileset )
	soundProfile
	;;
soundprofileget )
	echo "\
<bll># sysctl vm.swappiness
# ifconfig eth0 | grep -E 'mtu|txq'</bll>

$( sysctl vm.swappiness )
$( ifconfig eth0 | sed -E -n '/mtu|txq/ {s/.*(mtu.*)/\1/; s/.*(txq.*) \(.*/\1/; s/ /=/; p}' )"
	;;
soundprofile )
	if [[ ${args[1]} == true ]]; then
		if [[ ${args[@]:2:3} == '60 1500 1000' ]]; then
			rm -f $dirsystem/soundprofile.conf
			soundProfile reset
		else
			echo -n "\
swappiness=${args[2]}
mtu=${args[3]}
txqueuelen=${args[4]}
" > $dirsystem/soundprofile.conf
			soundProfile
		fi
	else
		soundProfile reset
	fi
	pushRefresh
	;;
statusonboard )
	ifconfig
	if systemctl -q is-active bluetooth; then
		echo '<hr>'
		bluetoothctl show | sed -E 's/^(Controller.*)/bluetooth: \1/'
	fi
	;;
storage )
	echo -n "\
<bll># cat /etc/fstab</bll>
$( < /etc/fstab )

<bll># mount | grep ^/dev</bll>
$( mount | grep ^/dev | sort | column -t )
"
	;;
systemconfig )
	config="\
<bll># cat /boot/cmdline.txt</bll>
$( < /boot/cmdline.txt )

<bll># cat /boot/config.txt</bll>
$( grep -v ^# /boot/config.txt )

<bll># bootloader and firmware</bll>
$( pacman -Q firmware-raspberrypi linux-firmware raspberrypi-bootloader raspberrypi-firmware )"
	file=/etc/modules-load.d/raspberrypi.conf
	raspberrypiconf=$( < $file )
	if [[ $raspberrypiconf ]]; then
		config+="

<bll># $file</bll>
$raspberrypiconf"
		dev=$( ls /dev/i2c* 2> /dev/null | cut -d- -f2 )
		[[ $dev ]] && config+="
		
<bll># i2cdetect -y $dev</bll>
$(  i2cdetect -y $dev )"
	fi
	echo "$config"
	;;
timedate )
	echo '<bll># timedatectl</bll>'
	timedatectl
	;;
timezone )
	timezone=${args[1]}
	timedatectl set-timezone $timezone
	pushRefresh
	;;
usbconnect|usbremove ) # for /etc/conf.d/devmon - devmon@http.service
	[[ ! -e $dirshm/startup ]] && exit # suppress on startup
	[[ -e $dirshm/audiocd ]] && exit
	
	if [[ ${args[0]} == usbconnect ]]; then
		action=Ready
		name=$( lsblk -p -S -n -o VENDOR,MODEL | tail -1 )
		[[ ! $name ]] && name='USB Drive'
	else
		action=Removed
		name='USB Drive'
	fi
	notify usbdrive "$name" $action
	pushRefresh
	[[ -e $dirsystem/usbautoupdate && ! -e $filesharedip ]] && $dirbash/cmd.sh mpcupdate$'\n'USB
	;;
usbautoupdate )
	[[ ${args[1]} == true ]] && touch $dirsystem/usbautoupdate || rm $dirsystem/usbautoupdate
	pushRefresh
	;;
vuled )
	if [[ ${args[1]} == true ]]; then
		echo ${args[@]:2} > $dirsystem/vuled.conf
		touch $dirsystem/vuled
		[[ ! -e $dirmpdconf/fifo.conf ]] && $dirsettings/player-conf.sh
		killall cava &> /dev/null
		cava -p /etc/cava.conf | $dirbash/vu.sh &> /dev/null &
	else
		rm -f $dirsystem/vuled
		killall cava &> /dev/null
		p=$( < $dirsystem/vuled.conf )
		for i in $p; do
			echo 0 > /sys/class/gpio/gpio$i/value
		done
		if [[ -e $dirsystem/vumeter ]]; then
			cava -p /etc/cava.conf | $dirsettings/vu.sh &> /dev/null &
		else
			$dirsettings/player-conf.sh
		fi
	fi
	pushRefresh
	;;
wlan )
	if [[ ${args[1]} == true ]]; then
		regdom=${args[2]}
		apauto=${args[3]}
		! lsmod | grep -q -m1 brcmfmac && modprobe brcmfmac
		ifconfig wlan0 up
		echo wlan0 > $dirshm/wlan
		iw wlan0 set power_save off
		[[ $apauto == false ]] && touch $dirsystem/wlannoap || rm -f $dirsystem/wlannoap
		if ! grep -q -m1 $regdom /etc/conf.d/wireless-regdom; then
			sed -i 's/".*"/"'$regdom'"/' /etc/conf.d/wireless-regdom
			iw reg set $regdom
		fi
	else
		systemctl -q is-active hostapd && $dirsettings/features.sh hostapddisable
		ifconfig wlan0 down
	fi
	pushRefresh
	ifconfig wlan0 | grep -q -m1 wlan0.*UP && active=true || active=false
	pushstream refresh '{"page":"networks","activewlan":'$active'}'
	;;
	
esac
