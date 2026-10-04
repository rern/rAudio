#!/bin/bash

amixer0dB() {
	[[ -e $dirshm/btmixer ]] && amixer -qD bluealsa sset "$( < $dirshm/btmixer )" 0dB
	[[ -e $dirshm/amixercontrol ]] && amixer -q sset "$( getVar mixer $dirshm/output )" 0dB
}
camillaDSPstart() {
	systemctl start camilladsp
	if systemctl -q is-active camilladsp; then
		pushRefresh camilla
	else
		systemctl stop camilladsp
		rm -f $dirsystem/camilladsp
		$dirsettings/player-conf.sh
	fi
}
conf2json() {
	local file json k keys only l lines v
	file=$1
	[[ ${file:0:1} != / ]] && file=$dirsystem/$file
	[[ ! -e $file ]] && echo false && return
#...............................................................................
	# omit lines  blank, comment / group [xxx]
	lines=$( awk 'NF && !/^\s*[#[}]|{$/' "$file" ) # exclude: (blank lines) ^# ^[ ^} ^' #' {$
	[[ ! $lines ]] && echo false && return
#...............................................................................
	if [[ $2 ]]; then # $2 - specific keys
		shift
		keys=$@
		only="^\s*${keys// /|^\\s*}"
		lines=$( grep -E "$only" <<< $lines )
	fi
	[[ ! $lines ]] && echo false && return
#...............................................................................
	[[ $( head -n 1 <<< $lines ) != *=* ]] && lines=$( sed 's/^\s*//; s/ \+"/="/' <<< $lines ) # key "value" > key="value"
	while read line; do
		k=${line/=*}
		v=${line/*=}
		if [[ $v ]]; then
			v=$( sed -E -e "s/^[\"']|[\"']$//g" \
						-e 's/^(True|yes)$/true/
							s/^(False|no|"")$/false/' <<< $v )
			if [[ ${v:0:1} != '[' && ! $v =~ ^true$|^false$ && ! $v =~ ^-*[0-9]*\.*[0-9]+$ ]]; then
				v='"'$( quoteEscape $v )'"' # quote and escape string
			fi
		else
			v=false
		fi
		json+=', "'${k^^}'": '$v
	done <<< $lines
	echo { ${json:1} }
}
data2jsonPatch() {
	sed '
		s/:\s*$/: false/;    # "k": \n    > "k": false
		s/:\s*}$/: false }/; # "k": }\n   > "k": false }
		s/{\s*,/{ /;         # { , ...    > { ...
		s/^,\s*$/, false/;   # , \n       > , false
		s/\[\s*,/[ false,/g; # [ ,        > [ false,
		s/,\s*,/, false,/g;  # ..., , ... > , false,
		s/,\s*]/, false ]/g  # ..., ]     > , false ]
	' <<< $1
}
enableFlagSet() {
	local file
	file=$dirsystem/$CMD
	[[ $ON ]] && touch $file || rm -f $file
}
exists() {
	[[ -e $1 ]] && echo true || echo false
}
fifoToggle() { # MPD_OLED VU_LED VU_METER
	local filefifo vumeter
	filefifo=$dirmpdconf/fifo.conf
	[[ -e $dirsystem/mpdoled ]] && MPD_OLED=1
	[[ -e $dirsystem/vuled ]] && VU_LED=1
	grep -q -m1 vumeter.*true $dirsystem/display.json && VU_METER=1
	[[ $VU_METER ]] && touch $dirsystem/vumeter || rm -f $dirsystem/vumeter
	if [[ $MPD_OLED || $VU_LED || $VU_METER ]]; then
		if [[ ! -e $filefifo ]]; then
			ln -s $dirmpdconf/{conf/,}fifo.conf
			systemctl restart mpd
		fi
		if statePlay; then
			[[ $MPD_OLED ]] && systemctl restart mpd_oled
			[[ $VU_LED || $VU_METER ]] && systemctl start cava
		fi
	else
		if [[ -e $filefifo ]]; then
			[[ $MPD_OLED || $VU_LED || $VU_METER ]] && return
#...............................................................................
			rm $filefifo
			systemctl restart mpd
		fi
		[[ ! $MPD_OLED ]] && systemctl stop mpd_oled
		[[ ! $VU_LED && ! $VU_METER ]] && systemctl stop cava
	fi
}
fstabColumnReload() {
	column -t <<< $1 > /etc/fstab
	systemctl daemon-reload
	mount -a &> /dev/null && return 0
}
fstabSet() {
	local fstab std
	umount -ql "$1"
	mkdir -p "$1"
	chown mpd:audio "$1"
	cp -f /etc/fstab /tmp
	fstab="\
$( < /etc/fstab )
$2"
	fstabColumnReload "$fstab"
	if [[ $? == 0 ]]; then
		for i in {1..10}; do
			sleep 1
			mountpoint -q "$1" && break
		done
	else
		mv -f /tmp/fstab /etc
		rmdir "$1"
		systemctl daemon-reload
		sed 's/$/<br>/' <<< $std
	fi
}
getContent() {
	if [[ -e $1 ]]; then
		cat "$1"
	elif [[ $2 ]]; then
		echo $2
	fi
}
getVar() { # var=value
	[[ ! -e $2 ]] && echo false && return
#...............................................................................
	case ${2: -4} in
		json ) sed -n -E '/'$1'/ {s/.*: "*|"*,*$//g; p}' "$2";;                   # /var: value/ > value
		.yml )
			if [[ $1 != *.* ]]; then
				sed -n '/^\s*'$1':/ {s/^.*: \+//; p}' "$2"                        # /var: value/ > value
			else
				local a b
				a=${1/.*}
				b=${1/*.}
				sed -n '/^\s*'$a':/,/^\s*'$b':/ {/'$b'/! d; s/^.*: \+//; p}' "$2" # /var1:/,/var2: value/ > value
			fi
			;;
		* )
			local data line var
			data=$( < "$2" )
			line=$( grep ^$1= <<< $data )                                    # var=
			[[ ! $line ]] && line=$( grep -E "^${1// /|^}" <<< $data )       # var
			[[ ! $line ]] && line=$( grep -E "^\s*${1// /|^\s*}" <<< $data ) #     var
			[[ $line != *=* ]] && line=$( sed 's/ \+/=/' <<< $line )         # var value > var=value
			var=$( sed -E "s/.* *= *//; s/^[\"']|[\"'];*$//g" <<< $line )    # var=value || var = value || var="value"; > value
			[[ $var ]] && quoteEscape $var || echo $3
			;;
	esac
}
ipOnline() {
	timeout 3 ping -c 1 -w 1 $1 &> /dev/null && return 0
}
iwctlAP() {
	wlanDisable # on-board wlan - force rmmod for ap to start
	wlandev=$( netDevice w )
	if ! rfkill | grep -q wlan; then
		modprobe brcmfmac
	else
		ip link set $wlandev down
	fi
	ip link set $wlandev up
	systemctl restart iwd
	sleep 1
	hostname=$( hostname )
	iwctl device $wlandev set-property Mode ap
	iwctl ap $wlandev start-profile $hostname
	if iwctl ap list | grep -q "$wlandev.*yes"; then
		. <( grep -E '^Pass|^Add' /var/lib/iwd/ap/$hostname.ap )
		echo '{
  "ip"         : "'$Address'"
, "passphrase" : "'$Passphrase'"
, "qr"         : "WIFI:S:'$hostname';T:WPA;P:'$Passphrase';"
, "ssid"       : "'$hostname'"
}' > $dirsystem/ap.conf
		avahi-daemon --kill
		[[ ! -e $dirshm/apstartup ]] && touch $dirsystem/ap
		iw $wlandev set power_save off
	else
		rm -f $dirsystem/{ap,ap.conf}
		systemctl stop iwd
	fi
}
line2array() {
	[[ $1 ]] && tr '\n' , <<< $1 | sed 's/^/[ "/; s/,$/" ]/; s/,/", "/g' || echo false
}
localBrowserOff() {
	systemctl disable --now bootsplash localbrowser
	systemctl enable --now getty@tty1
	sed -i -E 's/tty3.*/tty1/' /boot/cmdline.txt
	[[ -e $dirshm/btmixer ]] && systemctl start bluetoothbutton
}
pushDirCounts() {
	local tf
	[[ $( compgen -G /mnt/MPD/${1^^}/*/ | grep -v $dirshareddata/ ) ]] && tf=true || tf=false
	pushData counts '{ "'$1'": '$tf' }'
}
serviceRestartEnable() {
	systemctl restart $CMD
	systemctl -q is-active $CMD && systemctl enable $CMD
}
settingsActive() {
	local data pkg
	for pkg in $@; do
		data+='
, "'${pkg/-}'" : '$( systemctl -q is-active $pkg && echo true || echo false )
	done
	echo "$data"
}
settingsEnabled() {
	local data dir file
	for file in $@; do
		[[ ${file:0:1} == / ]] && dir=$file && continue

		data+='
, "'${file/.*}'" : '$( [[ -e $dir/$file ]] && echo true || echo false )
	done
	echo "$data"
}
sharedData() {
	[[ ! -e $filesharedip ]] && echo false && return
#...............................................................................
	nfsServerActive && echo false || echo true
}
sharedDataCopy() {
	rm -f $dirmpd/{listing,updating}
	cp -rf $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirshareddata
	file_order=$dirsystem/order.json
	[[ ! -e $file_order ]] && file_order=
	cp -f $dirsystem/display.json $file_order $dirshareddata
	touch $dirshareddata/order.json # if not exist
}
sharedDataLink() {
	local ip_share s
	mkdir -p $dirbackup
	mv -f $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirbackup
	file_order=$dirsystem/order.json
	[[ ! -e $file_order ]] && file_order=
	mv -f $dirsystem/display.json $file_order $dirbackup
	ln -s $dirshareddata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio} $dirdata
	ln -s $dirshareddata/{display,order}.json $dirsystem
	chown -h http:http $dirdata/{audiocd,bookmarks,lyrics,webradio} $dirsystem/{display,order}.json
	chown -h mpd:audio $dirdata/{mpd,playlists} $dirmpd/mpd.db
	echo data > $dirnas/.mpdignore
}
sharedDataReset() {
	rm -rf $dirdata/{audiocd,bookmarks,lyrics,mpd,playlists,webradio}
	rm -f $dirsystem/{display,order}.json $dirnas/.mpdignore
	file_order=$dirbackup/order.json
	[[ ! -s $file_order ]] && file_order=
	mv -f $dirbackup/display.json $file_order $dirsystem
	mv -f $dirbackup/* $dirdata
	rm -rf $dirbackup
}
snapserverList() {
	local name_ip
	name_ip=$( avahi-browse -d local -kprt _snapcast._tcp | awk -F';' '/IPv4.*1704;$/&&!/^=;l/ {print $7, $8}' )
	if [[ $name_ip ]] ; then
		name_ip=$( sed 's/ / @ /g; s/^/, "/; s/$/"/' <<< $name_ip )
		echo '[ '${name_ip:1}' ]'
	else
		echo '[]'
	fi
}
statusUpdating() {
	if mpc | grep -q ^Updating; then
		echo true
	elif [[ ! -e $dirshm/updatedone && ( -e $dirmpd/listing || -e $dirsystem/mpcupdate.conf ) ]]; then
		echo true
	else
		echo false
	fi
}
timezoneAuto() {
	local tz
	tz=$( curl -s -m 2 https://worldtimeapi.org/api/ip | jq -r .timezone )
	[[ ! $tz ]] && tz=$( curl -s -m 2 http://ip-api.com | grep '"timezone"' | cut -d'"' -f4 )
	[[ ! $tz ]] && tz=$( curl -s -m 2 https://ipapi.co/timezone )
	[[ ! $tz ]] && tz=UTC
	timedatectl set-timezone $tz
}
usbMaxCurrent() {
	local BB revision
	revision=$( grep ^Revision /proc/cpuinfo )
	BB=${revision: -3:2}
	if [[ $BB != 17 ]]; then
		sed -i '/usb_max_current/ d' /boot/config.txt
	elif [[ $BB != 03 || $BB = 04 ]]; then
		sed -i '/max_usb_current/ d' /boot/config.txt
	fi
}
volume.alsa() {
	amixer -Mq sset "$CONTROL" $TARGET
	[[ $TARGET == 0dB ]] && volume.get
}
volume.bluealsa() {
	amixer -MqD bluealsa sset "$CONTROL" $TARGET
	[[ $TARGET == 0dB ]] && volume.get
}
volume.get() {
	if [[ $ID == btmixer ]]; then
		val_db=$( amixer -MD bluealsa )
	else
		. $dirshm/output
		val_db=$( amixer -c $card -M sget "$mixer" )
	fi
	read val db < <( awk -F'[][]' '/%/ {print $2, $4}' <<< $val_db | tr -d '%dB' )
	echo '{ "val": '$val', "db": '$db' }'
	rm -f $dirsystem/volumemute
	pushData volume '{ "type": "unmute", "val": '$( volumeGet )' }'
}
volumeLimit() {
	local fn_volume mixer val
	val=$( getVar $1 $dirsystem/volumelimit.conf )
	if [[ -e $dirshm/btmixer ]]; then
		mixer=$( < $dirshm/btmixer )
	elif [[ -e $dirshm/amixercontrol ]]; then
		. $dirshm/output
	fi
	fn_volume=$( volumeFunction )
	$fn_volume $val% "$mixer" $card
}
volumeMaxGet() {
	local max
	if [[ -e  $dirsystem/volumelimit ]]; then
		. <( grep ^max $dirsystem/volumelimit.conf )
	else
		max=100
	fi
	echo $max
}
wlanOnboardDisable() {
	local mod
	lsmod | grep -q brcmfmac_cyw && mod=cyw || mod=wcc
	rmmod brcmfmac_$mod brcmfmac &> /dev/null
}
