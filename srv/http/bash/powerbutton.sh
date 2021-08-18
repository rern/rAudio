#!/bin/bash

# output : mode in  > write 0/1
# input  : mode out > mode  up/down
led=$( cat /srv/http/data/system/powerledpin )

gpio -1 mode $led out
gpio -1 write $led 1

if ! grep -q gpio-shutdown /boot/config.txt; then
	gpio -1 mode 5 in
	gpio -1 mode 5 up
	gpio -1 wfi 5 falling

	/srv/http/bash/cmd.sh power
fi
