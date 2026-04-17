#!/bin/bash

file_last=/dev/shm/mouse
now=$( date +%s%3N )
[[ -e $file_last ]] && last=$( < $file_last ) || last=0
(( $(( now - last )) < 1000 )) && exit # 1s throttle udev.rules events
# --------------------------------------------------------------------
echo $now > $file_last
[[ $1 ]] && remove=1 || add=1
file=/srv/http/data/system/localbrowser.conf
grep -q ^cursor=true $file && cursor=1
regex='s/^(cursor=).*/\1true/'
if [[ $remove && $cursor ]]; then # remove
	sed -i -E "${regex/true}" $file
elif [[ $add && ! $cursor ]]; then # add
	sed -i -E "$regex" $file
fi
websocat ws://127.0.0.1:8080 <<< '{ "channel": "refresh", "data": { "page": "features" } }'
systemctl is-enabled localbrowser && systemctl restart localbrowser
