#!/bin/bash

bluealsa-cli monitor -p | while read -r line; do
	[[ $line != *Volume* ]] && continue
	
	lines=$( amixer -MD bluealsa 2> /dev/null )
	val=${lines#*[}
	/srv/http/bash/status -P '{ "channel": "volume", "data": { "val": '${val%%\%*}' } }'
done
