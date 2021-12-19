#!/bin/bash

sleep 3 # wait for eventX added to /dev/input/
dirbash=/srv/http/bash
devinput=$( ls -1d /dev/input/event* 2> /dev/null | tail -1 ) # latest connected

evtest $devinput | while read line; do
	if [[ $line =~ .*EV_KEY.*KEY_NEXT.*1 ]]; then
		$dirbash/cmd.sh mpcprevnext$'\n'next
	elif [[ $line =~ .*EV_KEY.*KEY_PREVIOUS.*1 ]]; then
		$dirbash/cmd.sh mpcprevnext$'\n'prev
	elif [[ $line =~ .*EV_KEY.*KEY_STOP.*1 ]]; then
		$dirbash/cmd.sh mpcplayback$'\n'stop
	elif [[ $line =~ .*EV_KEY.*KEY_PLAY.*1 || $line =~ .*EV_KEY.*KEY_PAUSE.*1 ]]; then
		$dirbash/cmd.sh mpcplayback
	fi
done
