#!/bin/bash

. /srv/http/bash/common.sh

basename $0 .sh > $dirshm/script

echo
dabscan=$( script /dev/null -qc 'dab-scanner-rtlsdr -C 5A' ) # force capture all std
if ! grep -q ^audioservice <<< $dabscan; then
	echo '
<a class="cbr cw"> ! </a> No stations found.
'
	rm -f $dirshm/script
	exit
# --------------------------------------------------------------------
fi

if [[ $dirdabradio ]]; then
	mv -f $dirdabradio /tmp
else
	dirdabradio=$dirdata/dabradio
fi
mkdir -p $dirdabradio

host=$( hostname -f )
services=$( sed -E -n '/^Ensemble|^audioservice/ {s/ *;/;/g; p}' <<< $dabscan )
while read service; do
	if [[ ${service:0:8} == Ensemble ]]; then
		ensemble=$( cut -d' ' -f2- <<< ${service/;*} | sed 's/\s*$//' )
		mkdir "$dirdabradio/$ensemble"
		continue
	fi

	readarray -d';' -n4 -t field <<< $service
	name=${field[1]}
	channel=${field[2]}
	id=${field[3]}
	channel_id=${channel,,}_${id,,}
	dir="$dirdabradio/$ensemble/$name"
	mkdir -p "$dir"
	echo "\
rtsp://$host:8554/$channel_id
48 kHz 160 kbit/s
" > "$dir/data"
	list+="\
  $channel_id:
    runOnDemand: /srv/http/bash/dab-start.sh $id $channel \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
"
	dir_tmp="/tmp/dabradio/$ensemble/$name"
	! compgen -G "$dir_tmp"/coverart.* > /dev/null && continue

	for img in coverart thumb; do
		cp "$dir_tmp"/$img.* "$dir"
	done
done <<< $services

fileyml=/etc/mediamtx/mediamtx.yml
sed -i '1,/^paths:/ !d' $fileyml
echo "$list" >> $fileyml

countRadio
rm -f $dirshm/script /tmp/dabradio
