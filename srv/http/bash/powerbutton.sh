#!/bin/bash

# output : mode in  > write 0/1
# input  : mode out > mode  up/down
pins=( $( cat /srv/http/data/system/powerpins ) )
off=${pins[0]}
led=${pins[1]}

gpio -1 mode $led out
gpio -1 write $led 1

gpio -1 mode $off in
gpio -1 mode $off up
gpio -1 wfi $off falling

/srv/http/bash/cmd.sh power
