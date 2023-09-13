#!/bin/bash

# output : mode in  > write 0/1
# input  : mode out > mode  up/down

if grep -q 'poweroff,gpiopin=22' /boot/config.txt; then
	gpio -1 mode 7 out  # atx
	gpio -1 write 7 0
	
	gpio -1 mode 15 out # led
	gpio -1 write 15 1
	
	gpio -1 mode 11 in  # sw
	gpio -1 write 11 down
	gpio -1 wfi 11 rising
	
	gpio -1 write 7 1
	sleep 1
	gpio -1 write 7 0
else
	. /srv/http/data/system/powerbutton.conf
	gpio -1 mode $led out
	gpio -1 write $led 1
	
	gpio -1 mode $sw in
	gpio -1 mode $sw up
	gpio -1 wfi $sw falling
fi

/srv/http/bash/power.sh
