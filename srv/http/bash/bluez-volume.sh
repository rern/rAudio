#!/bin/bash

. /srv/http/bash/common.sh

gdbus monitor --system --dest org.bluez | while read -r line; do
	[[ $line == *Volume* ]] && pushVolume $( volume.BlueAlsa )
done
