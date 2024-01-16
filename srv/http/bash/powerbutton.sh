#!/bin/bash

if grep -q 'poweroff,gpiopin=22' /boot/config.txt; then # audiophonic
	gpioset -t0 -c0 4=0
	gpioset -t0 -c0 22=1
	gpiomon -b pull-down -e rising -c0 -n1 17
	gpioset -t0 -c0 4=1
	sleep 1
	gpioset -t0 -c0 4=0
else
	. /srv/http/data/system/powerbutton.conf
	gpioset -t0 -c0 $led=1                    # -t time -c chip pin=[1/0]
	gpiomon -b pull-up -e falling -c0 -n1 $sw # -b bias -e edge -c chip -n numberOfEvent pin
fi

/srv/http/bash/power.sh off
