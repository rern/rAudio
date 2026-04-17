#!/bin/bash

[[ $1 ]] && remove=1 || add=1
file=/srv/http/data/system/localbrowser.conf
grep -q ^cursor=true $file && cursor=1
regex='s/^(cursor=).*/\1true/'
if [[ $remove && $cursor ]]; then # remove
	sed -i -E "${regex/true}" $file
elif [[ $add && ! $cursor ]]; then # add
	sed -i -E "$regex" $file
fi
systemctl is-enabled localbrowser && systemctl restart localbrowser
