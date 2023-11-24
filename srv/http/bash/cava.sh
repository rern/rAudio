#!/bin/bash

. /srv/http/bash/common.sh

pins=$( cut -d= -f2 $dirsystem/vuled.conf )
if [[ $1 == stop ]]; then
	touch $dirshm/cavastop
	for i in $pins; do
		echo 0 > /sys/class/gpio/gpio$i/value
		gpio unexport $i
	done
	rm $dirshm/cavastop
	exit
fi

if [[ -e $dirsystem/vuled ]]; then
	for i in $pins; do
		gpio export $i out
	done
fi

[[ -e $dirsystem/vuled || -e $dirsystem/vumeter ]] && cava -p /etc/cava.conf | $dirbash/vu.sh

