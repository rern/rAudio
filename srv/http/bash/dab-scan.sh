#!/bin/bash

. /srv/http/bash/common.sh

basename $0 .sh > $dirshm/script

echo
dabscan=$( tty2std 'dab-scanner-rtlsdr -C 5A' ) # capture /dev/tty
if ! grep -q ^audioservice <<< $dabscan; then
	echo '
<a class="cbr cw"> ! </a> No stations found.
'
	exit
# --------------------------------------------------------------------
fi

dirdabradio=$dirdata/dabradio
mv $dirdabradio/img $dirshm &> /dev/null
rm -rf $dirdabradio
mkdir -p $dirdabradio/img
mv $dirshm/img $dirdabradio &> /dev/null

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
	echo "\
$name
48 kHz 160 kbit/s
" > "$dirdabradio/$ensemble/rtsp:||$host:8554|$channel_id"
	list+="\
  $channel_id:
    runOnDemand: /srv/http/bash/dab-start.sh $id $channel \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
"
done <<< $services

fileyml=/etc/mediamtx/mediamtx.yml
sed -i '1,/^paths:/ !d' $fileyml
echo "$list" >> $fileyml

chown -R http:http $dirdabradio
dabradio=$( find -L $dirdabradio -type f ! -path '*/img/*' | wc -l )
sed -i -E 's/("dabradio": ).*/\1'$dabradio',/' $dirmpd/counts
pushData mpdupdate '{ "dabradio": '$dabradio' }'
