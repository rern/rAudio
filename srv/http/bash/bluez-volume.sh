#!/bin/bash

. /srv/http/bash/common.sh

bluealsa-cli monitor -p | while read -r line; do
	[[ $line == *Volume* ]] && pushVolume $( volume.BlueAlsa )
done
