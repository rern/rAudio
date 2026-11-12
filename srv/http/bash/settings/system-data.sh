#!/bin/bash

. /srv/http/bash/common.sh

[[ ! -e /tmp/cmdline.txt ]] && cp /boot/{cmdline,config}.txt /tmp
file_tmp=/tmp/raspberrypi.conf
if [[ ! -e $file_tmp ]]; then
	file_mod=/etc/modules-load.d/raspberrypi.conf
	[[ -e $file_mod ]] && cp $file_mod $file_tmp || touch $file_tmp
fi

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
else
	# soc
	model=$( tr '\0' '\n' < /proc/device-tree/model )
	if [[ $model == Raspberry* ]]; then
		soc=$( tr -d '\0' < /proc/device-tree/compatible | sed -E 's/.*,(.*)/\U\1/' )
		revision=$( awk '/^Revision/ {print $NF}' /proc/cpuinfo )
		case ${revision: -3:2} in # BB
			12 ) soc=RP3A0;;
			0d ) soc+=B0; touch $dirshm/rpi3plus;;
		esac
		soc="Broadcom $soc"
	else
		soc=$( tr '\0' '\n' < /proc/device-tree/compatible )
		if [[ $model == *BeagleBone* ]]; then   # TI AM335x BeagleBone Black 
			model=${model/*Beagle/Beagle}
			soc=$( sed -E 's/,/ /; s/-.*//; s/.*/\U&/' <<< $soc ) # ti,am335x-bone-black > TI AM335X
		elif [[ $model == Cubietech* ]]; then # Cubietech Cubieboard2
			soc=$( sed -E 's/^(.*),.*-(.*)/\u\1 \U\2/' <<< $soc ) # allwinner,sun7i-a20  > Allwinner A20
		fi
	fi
	cpus=$( tr -d '\0' < /proc/device-tree/cpus/cpu@0/compatible | sed -E  's/^arm,cortex-a/ARM Cortex-A/
																			s/^arm,(arm.*)/\U\1/' )
	cores=$( nproc --all )
	(( $cores > 1 )) && cpus+=" x $cores"
	khz=$( < /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq )
	if (( $khz < 1000000 )); then
		speed=$( printf '%d MHz' $(( khz / 1000 )) )
	else
		speed=$( printf '%d.%02d GHz' $(( khz / 1000000 )) $(( khz % 1000000 / 10000 )) )
	fi
	system="\
rAudio $( getContent $diraddons/r1 )<br>\
$( uname -rm | sed -E 's| (.*)| <gr>\1</gr>|' )<br>\
$( pacman -Q linux-firmware-whence | cut -d' ' -f2 )<br>\
$( sed -E 's/ Plus/+/; s|(Rev.*)|<gr>\1</gr>|' <<< $model )<br>\
$soc $dot $( free -h | awk '/^Mem/ {print $2}' | sed -E 's|(.i)| \1B|' )<br>\
$cpus @ $speed"
	echo $system > $dirshm/system
fi
# i2smodule
if [[ -e $dirsystem/audio-aplayname && -e $dirsystem/audio-output ]]; then
	audioaplayname=$( < $dirsystem/audio-aplayname )
	audiooutput=$( < $dirsystem/audio-output )
	i2smodule=$( grep -q "$audiooutput.*$audioaplayname" /srv/http/assets/data/system-i2s.json && echo true )
fi
##########
data+=$( dataActive bluetooth nfs-server rotaryencoder smb )
##########
data+=$( dataEnabled \
			$dirsystem ap lcdchar mpdoled powerbutton relays soundprofile vuled \
			$dirshm relayson )
if pgrep mkfs &> /dev/null; then
	storage=$( getContent $dirshm/system-storage )
	formatting=$( getContent $dirshm/formatting true )
	[[ $formatting != true ]] && formatting='"'$formatting'"'
else
	storage=$( $dirsettings/system-storage.sh )
fi
##########
data+='
, "audio"          : '$( grep -q -m1 ^dtparam=audio=on /boot/config.txt && echo true )'
, "audioaplayname" : "'$audioaplayname'"
, "audiocards"     : '$( aplay -l 2> /dev/null | grep ^card | grep -q -v 'bcm2835\|Loopback' && echo true )'
, "audiooutput"    : "'$audiooutput'"
, "formatting"     : '$formatting'
, "hostname"       : "'$( hostname )'"
, "i2smodule"      : '$i2smodule'
, "ip"             : "'$( ipAddress )'"
, "lan"            : '$( [[ $( netDevice e ) ]] && echo true )'
, "list"           : { "storage": '$storage' }
, "monitor"        : '$( grep -q -m1 -E 'dtoverlay=.*rotate=|dtoverlay=.*ili9881-5inch' /boot/config.txt && echo true )'
, "monitormodel"   : "'$( grep -q -m1 'dtoverlay=.*ili9881-5inch' /boot/config.txt && echo rpidisplay2 )'"
, "online"         : '$( ipOnline 8.8.8.8 && echo true )'
, "rpi3plus"       : '$( exists $dirshm/rpi3plus )'
, "shareddata"     : '$( sharedData )'
, "status"         : "'$status'"
, "statusvf"       : '$statusvf'
, "system"         : "'$system'"
, "templimit"      : '$( grep -q ^temp_soft_limit /boot/config.txt && echo true )'
, "timezone"       : "'$timezone'"
, "timezoneoffset" : "'$( date +%z | sed -E 's/(..)$/:\1/' )'"
, "updating"       : '$( statusUpdating )
if [[ -e $dirshm/onboardwlan ]]; then
##########
	data+='
, "wlan"           : '$( lsmod | grep -q -m1 brcmfmac && echo true )'
, "wlanconnected"  : '$( [[ $( ipAddress w ) ]] && echo true )'
, "btconnected"    : '$( [[ $( bluetoothctl devices Connected ) ]] && echo true )
fi

data2json "$data" $1
