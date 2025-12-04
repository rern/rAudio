#!/bin/bash

. /srv/http/bash/common.sh

mhz2ghz() {
	(( $1 < 1000 )) && echo $1 MHz || echo $( calc 2 $1/1000 ) GHz
}

dot='<gr>·</gr>'
throttled=$( vcgencmd get_throttled | cut -d= -f2 2> /dev/null )  # hex - called first to fix slip values
temp=$( vcgencmd measure_temp | tr -dc [:digit:]. )
load=$( cut -d' ' -f1-3 /proc/loadavg | sed 's| | '$dot' |g' )'&emsp;<c>'$temp'°C</c>'
#khz=$( < /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq )
#load+=" @ $( mhz2ghz ${khz:0:-3} )"
availmem=$( free -h | awk '/^Mem/ {print $NF}' | sed -E 's|(.i)| \1B|' )
timezone=$( timedatectl | awk '/zone:/ {print $3}' )
date=$( date +"%F $dot %T" )
date+="<wide class='gr'>&ensp;${timezone/\// · }</wide>"
since=$( uptime -s | cut -d: -f1-2 | sed 's/ / · /' )
uptime=$( uptime -p | sed -E 's/[ s]|up|ay|our|inute//g; s/,/ /g' )
uptime+="<wide class='gr'>&ensp;since $since</wide>"
for v in load availmem date uptime; do
	status+="${!v}<br>"
done
if [[ $throttled && $throttled != 0x0 ]]; then
	binary=$( perl -e "printf '%020b', $throttled" ) # hex > bin
	# 20 bits: occurred > 11110000000000001111 < current
	occurred='<gr>occurred</gr>'
	it="<i class='i-templimit yl'></i>CPU X"
	ito="${it/yl/gr} $occurred"
	iv="<ora><i class='i-voltage blink local'></i>Under-voltage</ora>"
	ivy="${iv//ora/yl} $occurred"
	declare -A warnings=(
		 [0]=${ito/X/throttling}
		 [1]=${ito/X/temperature limit}
		 [2]=${ito/X/frequency capping}
		 [3]=${ivy/ blink local}
		[16]=${it/X/throttled}
		[17]=${it/X/temperature limit}
		[18]=${it/X/frequency capped}
		[19]=$iv
	)
	for i in 19 18 17 16; do
		if [[ ${binary:$i:1} == 1 ]]; then
			status+="${warnings[$i]}<br>"
		else
			j=$(( i - 16 ))
			[[ ${binary:$j:1} == 1 ]] && status+="${warnings[$j]}<br>"
		fi
	done
fi
# for interval refresh
[[ $1 == status ]] && echo $status && exit
# --------------------------------------------------------------------
if [[ -e $dirshm/system ]]; then
	system=$( < $dirshm/system )
	[[ -e $dirshm/rpi3plus ]] && rpi3plus=true
else
	# soc
	. <( sed -E -n '/^Revision|^Model/ {s/\s*: /="/; s/$/"/; p}' /proc/cpuinfo )
	if [[ ${Model/ *} == Raspberry ]]; then
		case ${Revision: -4:1} in         # C
			4 ) soc=2712;;
			3 ) soc=2711;;
			2 ) case ${Revision: -3:2} in # BB
					12 ) soc=RP3A0;;
					0d ) soc=2837B0
						 rpi3plus=true
						 touch $dirshm/rpi3plus
						 ;;
					04 ) soc=2837;;
				esac
				;;
			1 ) soc=2836;;
			0 ) soc=2835;;
		esac
		soc="Broadcom BCM$soc"
	elif [[ $Model == *BeagleBone* ]]; then
		soc='TI AM3358'
	elif [[ $Model == *Cubieboard2* ]]; then
		soc='Allwinner A20'
	fi
	# cpu
	readarray -t lscpu <<< $( lscpu | awk '/^CPU\(s\):|^Vendor|^Model name|^CPU max/ {print $NF}' )
	cores=${lscpu[0]}
	cpus=${lscpu[@]:1:2}
	(( $cores > 1 )) && cpus+=" x $cores"
	system="\
rAudio $( getContent $diraddons/r1 )<br>\
$( uname -rm | sed -E 's| (.*)| <gr>\1</gr>|' )<br>\
$( pacman -Q linux-firmware-whence | cut -d' ' -f2 )<br>\
$( sed -E 's/ Plus/+/; s|(Rev.*)|<gr>\1</gr>|' <<< $Model )<br>\
$soc $dot $( free -h | awk '/^Mem/ {print $2}' | sed -E 's|(.i)| \1B|' )<br>\
$cpus @ $( mhz2ghz ${lscpu[3]/.*} )"
	echo $system > $dirshm/system
fi
# i2smodule
if [[ -e $dirsystem/audio-aplayname && -e $dirsystem/audio-output ]]; then
	audioaplayname=$( < $dirsystem/audio-aplayname )
	audiooutput=$( < $dirsystem/audio-output )
	i2smodule=$( grep -q "$audiooutput.*$audioaplayname" /srv/http/assets/data/system-i2s.json && echo true )
fi
data+=$( settingsActive bluetooth nfs-server rotaryencoder smb )
data+=$( settingsEnabled \
			$dirsystem ap lcdchar mpdoled powerbutton relays soundprofile vuled \
			$dirshm relayson )
##########
data+='
, "audio"          : '$( grep -q -m1 ^dtparam=audio=on /boot/config.txt && echo true )'
, "audioaplayname" : "'$audioaplayname'"
, "audiocards"     : '$( aplay -l 2> /dev/null | grep ^card | grep -q -v 'bcm2835\|Loopback' && echo true )'
, "audiooutput"    : "'$audiooutput'"
, "hostname"       : "'$( hostname )'"
, "i2smodule"      : '$i2smodule'
, "ip"             : "'$( ipAddress )'"
, "lan"            : '$( [[ $( lanDevice ) ]] && echo true )'
, "list"           : { "storage": '$( $dirsettings/system-storage.sh )' }
, "rpi3plus"       : '$rpi3plus'
, "shareddata"     : '$( sharedDataEnabled )'
, "status"         : "'$status'"
, "statusvf"       : '$statusvf'
, "system"         : "'$system'"
, "templimit"      : '$( grep -q ^temp_soft_limit /boot/config.txt && echo true )'
, "tft"            : '$( grep -q -m1 'dtoverlay=.*rotate=' /boot/config.txt && echo true )'
, "timezone"       : "'$timezone'"
, "timezoneoffset" : "'$( date +%z | sed -E 's/(..)$/:\1/' )'"'
if [[ -e $dirshm/onboardwlan ]]; then
	ifwlan0=
##########
	data+='
, "wlan"           : '$( lsmod | grep -q -m1 brcmfmac && echo true )'
, "wlanconnected"  : '$( [[ $( ifconfig wlan0 2> /dev/null | grep inet ) ]] && echo true )
##########
	data+='
, "btconnected"    : '$( exists $dirshm/btconnected )
fi

data2json "$data" $1
