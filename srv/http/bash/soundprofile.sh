#!/bin/bash

if [[ $1 == reset ]]; then
	latency=18000000
	swappiness=60
	mtu=1500
	txqueuelen=1000
	rm -f $dirsystem/soundprofile
else
	. /etc/soundprofile.conf
	touch $dirsystem/soundprofile
fi

sysctl kernel.sched_latency_ns=$latency
sysctl vm.swappiness=$swappiness
if ifconfig | grep -q eth0; then
	ip link set eth0 mtu $mtu
	ip link set eth0 txqueuelen $txqueuelen
fi
