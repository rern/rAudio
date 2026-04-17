#!/bin/bash

file_last=/dev/shm/mouse
now=$( date +%s%3N )
[[ -e $file_last ]] && last=$( < $file_last ) || last=0
(( $(( now - last )) < 1000 )) && exit # 1s throttle udev.rules events
# --------------------------------------------------------------------
echo $now > $file_last
systemctl is-enabled localbrowser && systemctl restart localbrowser
