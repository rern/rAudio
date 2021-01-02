#!/bin/bash

data='
	  "cpuload"         : "'$( cat /proc/loadavg | cut -d' ' -f1-3 )'"
	, "cputemp"         : '$( /opt/vc/bin/vcgencmd measure_temp | sed 's/[^0-9.]//g' )'
	, "startup"         : "'$( systemd-analyze | head -1 | cut -d' ' -f4,7 )'"
	, "throttled"       : "'$( /opt/vc/bin/vcgencmd get_throttled | cut -d= -f2 )'"
	, "time"            : "'$( date +'%T %F' )'"
	, "timezone"        : "'$( timedatectl | awk '/zone:/ {print $3}' )'"
	, "uptime"          : "'$( uptime -p | tr -d 's,' | sed 's/up //; s/ day/d/; s/ hour/h/; s/ minute/m/' )'"
	, "uptimesince"     : "'$( uptime -s | cut -d: -f1-2 )'"'

# for interval refresh
(( $# > 0 )) && echo {$data} && exit

hwcode=$( awk '/Revision/ {print $NF}' <<< "$( cat /proc/cpuinfo )" )
case ${hwcode: -4:1} in
	0 ) soc=BCM2835;;
	1 ) soc=BCM2836;;
	2 ) [[ ${hwcode: -3:2} > 08 ]] && soc=BCM2837B0 || soc=BCM2837;;
	3 ) soc=BCM2711;;
esac
case ${hwcode: -6:1} in
	9 ) socram+='512KB';;
	a ) socram+='1GB';;
	b ) socram+='2GB';;
	c ) socram+='4GB';;
esac

lines=$( /srv/http/bash/networks.sh ifconfig )
readarray -t lines <<<"$lines"
for line in "${lines[@]}"; do
    items=( $line )
    iplist+=",${items[0]} ${items[1]} ${items[2]}"
done

dirsystem=/srv/http/data/system
version=$( cat $dirsystem/version )
snaplatency=$( grep OPTS= /etc/default/snapclient | sed 's/.*latency=\(.*\)"/\1/' )
[[ -z $snaplatency ]] && snaplatency=0
i2c=$( grep -q dtparam=i2c_arm=on /boot/config.txt && echo true || echo false )
lcd=$( grep -q dtoverlay=tft35a /boot/config.txt && echo true || echo false )
lcdcharconf=$( cat /etc/lcdchar.conf 2> /dev/null | sed '1d' | cut -d= -f2 )
if [[ $i2c == true ]]; then
	dev=$( ls /dev/i2c* 2> /dev/null | tail -c 2 )
	[[ -n $dev ]] && lcdcharaddr=$( i2cdetect -y $dev \
									| grep -v '^\s' \
									| cut -d' ' -f2- \
									| tr -d ' \-' \
									| grep -v UU \
									| grep . \
									| sort -u )
fi

if [[ -e /srv/http/data/shm/nosound ]]; then
	data+='
	, "audioaplayname"  : ""
	, "audiooutput"     : "( not available )"'
else
	data+='
	, "audioaplayname"  : "'$( cat $dirsystem/audio-aplayname 2> /dev/null )'"
	, "audiooutput"     : "'$( cat $dirsystem/audio-output 2> /dev/null )'"'
fi

data+='
	, "hostname"        : "'$( hostname )'"
	, "ip"              : "'${iplist:1}'"
	, "kernel"          : "'$( uname -r )'"
	, "lcd"             : '$lcd'
	, "lcdchar"         : '$( [[ -e $dirsystem/lcdchar ]] && echo true || echo false )'
	, "lcdcharaddr"     : "'$lcdcharaddr'"
	, "lcdcharconf"     : "'$lcdcharconf'"
	, "mpd"             : "'$( pacman -Q mpd 2> /dev/null |  cut -d' ' -f2 )'"
	, "mpdstats"        : "'$( jq '.song, .album, .artist' /srv/http/data/mpd/counts 2> /dev/null )'"
	, "ntp"             : "'$( grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2 )'"
	, "reboot"          : "'$( cat /srv/http/data/shm/reboot 2> /dev/null )'"
	, "regdom"          : "'$( cat /etc/conf.d/wireless-regdom | cut -d'"' -f2 )'"
	, "relays"          : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )'
	, "rpi01"           : '$( [[ $soc == BCM2835 ]] && echo true || echo false )'
	, "rpimodel"        : "'$( cat /proc/device-tree/model | tr -d '\0' )'"
	, "soc"             : "'$soc'"
	, "soccpu"          : "'$( lscpu | awk '/Model name/ {print $NF}' )'"
	, "socram"          : "'$socram'"
	, "socspeed"        : "'$( lscpu | awk '/CPU max/ {print $NF}' | cut -d. -f1 )'"
	, "soundprofile"    : '$( [[ -e $dirsystem/soundprofile ]] && echo true || echo false )'
	, "sources"         : '$( /srv/http/bash/sources-data.sh )'
	, "version"         : "'$version'"
	, "versionui"       : '$( cat /srv/http/data/addons/r$version 2> /dev/null || echo 0 )
if [[ -e /etc/soundprofile.conf ]]; then
	data+='
	, "soundprofileval" : "'$( cat /etc/soundprofile.conf | cut -d= -f2 )'"'
else
	val=$( sysctl kernel.sched_latency_ns | awk '{print $NF}' | tr -d '\0' )
	val+=' '$( sysctl vm.swappiness | awk '{print $NF}'  )
	if ifconfig | grep -q ^eth0; then
		val+=' '$( ifconfig eth0 | awk '/mtu/ {print $NF}' )
		val+=' '$( ifconfig eth0 | awk '/txqueuelen/ {print $4}' )
	fi
	data+='
	, "soundprofileval" : "'$val'"'
fi
if [[ -e /usr/bin/bluetoothctl  ]]; then
	bluetooth=$( systemctl -q is-active bluetooth && echo true || echo false )
	if [[ $bluetoothon == true ]]; then
		btdiscoverable=$( bluetoothctl show | grep -q 'Discoverable: yes' && echo true || echo false )
	else
		btdiscoverable=false
	fi
	data+='
	, "bluetooth"       : '$bluetooth'
	, "btdiscoverable"  : '$btdiscoverable
fi
[[ ${hwcode: -3:2} =~ ^(08|0c|0d|0e|11)$ ]] && data+='
	, "onboardwlan"     : '$( lsmod | grep -q ^brcmfmac && echo true || echo false )

echo {$data}
