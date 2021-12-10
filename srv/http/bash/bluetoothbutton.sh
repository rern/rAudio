#!/bin/bash

set -e

sleep 3 # wait for eventX added to /dev/input/
devinput=$( ls -1d /dev/input/event* 2> /dev/null | tail -1 ) # latest connected

    pause='*EV_KEY*KEY_PAUSE*1*'
  pausecd='*EV_KEY*KEY_PAUSECD*1*'
     play='*EV_KEY*KEY_PLAY*1*'
   playcd='*EV_KEY*KEY_PLAYCD*1*'
playpause='*EV_KEY*KEY_PLAYPAUSE*1*'
     stop='*EV_KEY*KEY_STOP*1*'
   stopcd='*EV_KEY*KEY_STOPCD*1*'

     next='*EV_KEY*KEY_NEXTSONG*1*'
     prev='*EV_KEY*KEY_PREVIOUSSONG*1*'

evtest $devinput | while read line; do
	case $line in
		$next )
			mpc -q next
			exec $0
			;;
		$prev )
			mpc -q prev
			exec $0
			;;
		$stop|$stopcd )
			mpc -q stop
			exec $0
			;;
		$pause|$pausecd|$play|$playcd )
			mpc -q toggle
			exec $0
			;;
	esac
done
