#!/bin/bash

file_volumemute=/srv/http/data/system/volumemute

bluealsa-cli monitor -p | while read -r line; do
	[[ $line != *Volume* ]] && continue
	
	lines=$( amixer -MD bluealsa 2> /dev/null )
	val=${lines#*[}
	/srv/http/bash/status -P '{ "channel": "volume", "data": { "type": "unmute", "val": '${val%%\%*}' } }'
	[[ -e $file_volumemute ]] && rm -f $file_volumemute
done
