#!/bin/bash

. /srv/http/bash/common.sh

throttled=$( vcgencmd get_throttled | cut -d= -f2 2> /dev/null )  # hex - called first to fix slip values
temp=$( vcgencmd measure_temp | tr -dc [:digit:]. )
load=$( cut -d' ' -f1-3 /proc/loadavg | sed 's| | <gr>•</gr> |g' )'&emsp;<c>'$temp'°C</c>'
availmem=$( free -h | awk '/^Mem/ {print $NF}' | sed -E 's|(.i)| \1B|' )
timezone=$( timedatectl | awk '/zone:/ {print $3}' )
date=$( date +'%F <gr>·</gr> %T' )
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
	iv="<ora><i class='i-voltage blink'></i>Under-voltage</ora>"
	declare -A warnings=(
		 [0]=${ito/X/throttling}
		 [1]=${ito/X/temperature limit}
		 [2]=${ito/X/frequency capping}
		 [3]="${iv//ora/yl} $occurred"
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
	# cpu
	revision=$( grep ^Revision /proc/cpuinfo )
	BB=${revision: -3:2}
	C=${revision: -4:1}
	# system
	kernel=$( uname -rm | sed -E 's| (.*)| <gr>\1</gr>|' )
	model=$( tr -d '\000' < /proc/device-tree/model | sed -E 's/ Model //; s/ Plus/+/; s|( Rev.*)|<gr>\1</gr>|' )
	if [[ $model == *BeagleBone* ]]; then
		soc=AM3358
	else
		[[ $C == 2 ]] && C+=$BB
		case $C in
			0 )
				cpu=ARM1176JZF-S
				soc=2835;;
			1 )
				cpu=Cortex-A7
				soc=2836;;
			204 | 208 )
				cpu=Cortex-A53
				soc=2837;;
			20d | 20e )
				cpu=Cortex-A53
				soc=2837B0;;
			212 )
				cpu=Cortex-A53
				soc=2710A1;;
			3 )
				cpu=Cortex-A72
				soc=2711;;
			4 )
				cpu=Cortex-A76
				soc=2712;;
		esac
		[[ $C != 0 ]] && cpu="4 x $cpu"
		[[ $soc == 2837B0 ]] && rpi3plus=true && touch $dirshm/rpi3plus
		soc=BCM$soc
		free=$( free -h | awk '/^Mem/ {print $2}' | sed -E 's|(.i)| \1B|' )
	fi
	speed=$( lscpu | awk '/CPU max/ {print $NF}' | cut -d. -f1 )
	(( $speed < 1000 )) && speed+=' MHz' || speed=$( calc 2 $speed/1000 )' GHz'
	system="\
rAudio $( getContent $diraddons/r1 )<br>\
$kernel<br>\
$model<br>\
$soc <gr>•</gr> $free<br>\
$cpu @ $speed"
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
, "shareddata"     : '$( [[ -L $dirmpd ]] && grep -q nfsserver.*false <<< $data && echo true )'
, "status"         : "'$status'"
, "statusvf"       : '$statusvf'
, "system"         : "'$system'"
, "templimit"      : '$( grep -q ^temp_soft_limit /boot/config.txt && echo true )'
, "tft"            : '$( grep -q -m1 'dtoverlay=.*rotate=' /boot/config.txt && echo true )'
, "timezone"       : "'$timezone'"
, "timezoneoffset" : "'$( date +%z | sed -E 's/(..)$/:\1/' )'"'
if [[ -e $dirshm/onboardwlan ]]; then
##########
	data+='
, "wlan"           : '$( lsmod | grep -q -m1 brcmfmac && echo true )'
, "wlanconnected"  : '$( ip route | grep -q -m1 wlan0 && echo true )
##########
	data+='
, "btconnected"    : '$( exists $dirshm/btconnected )
fi

data2json "$data" $1
