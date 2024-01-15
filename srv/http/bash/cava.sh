#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == stop ]]; then
	killall vu.sh
	pin_0=$( sed 's/^.*=//; s/$/=0/' $dirsystem/vuled.conf )
	gpioset -t0 -c0 $pin_0 # all off
else
	[[ -e $dirsystem/vuled || -e $dirsystem/vumeter ]] && cava -p /etc/cava.conf | $dirbash/vu.sh
fi
