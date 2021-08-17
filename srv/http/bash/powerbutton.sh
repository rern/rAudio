#!/bin/bash

# output: mode in  > write 0/1
# input:  mode out > mode up/down
led=$( cat /srv/http/data/system/powerledpin )            # J8 pin       : -1
sw=$( grep gpio-shutdown /boot/config.txt | cut -d= -f3 ) # BCM_GPIO pin : -g
[[ -z $sw ]] && sw=3                                      # J8=5

gpio -1 mode $led out
gpio -1 write $led 1

gpio -g mode $sw in
gpio -g mode $sw up
gpio -g wfi $sw falling

/srv/http/bash/cmd.sh power$'\n'$off
