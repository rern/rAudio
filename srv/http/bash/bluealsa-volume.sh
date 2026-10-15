#!/bin/bash

. /srv/http/bash/common.sh

bluealsa-cli monitor -p | while read -r line; do
	[[ $line != *Volume* ]] && continue
	
	lines=$( amixer -MD bluealsa )
	val=${lines#*[}
	pushVolume ${val%%\%*}
done
