#!/bin/bash

! systemctl -q is-active localbrowser && exit
# --------------------------------------------------------------------
[[ $1 ]] && remove=1 || add=1
file=/srv/http/data/system/localbrowser.conf
grep -q ^cursor=true $file && cursor=1
if [[ $remove && $cursor ]]; then # remove
	true=
elif [[ $add && ! $cursor ]]; then # add
	true=true
else
	exit
# --------------------------------------------------------------------
fi
sed -i -E "s/^(cursor=).*/\1$true/" $file
systemctl restart bootsplash localbrowser
