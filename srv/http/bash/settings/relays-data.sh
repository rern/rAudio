#!/bin/bash

. /srv/http/bash/common.sh
file=$dirsystem/relays.conf
. $file
data='
  "page"    : "relays"
, "pin"     : '$pin'
, "name"    : '$name'
, "on"      : [ '$( echo ${on[@]} | tr ' ' , )' ]
, "ond"     : [ '$( echo ${ond[@]} | tr ' ' , )' ]
, "off"     : [ '$( echo ${off[@]} | tr ' ' , )' ]
, "offd"    : [ '$( echo ${offd[@]} | tr ' ' , )' ]
, "timer"   : '$timer'
, "enabled" : '$( [[ -e $dirsystem/relays ]] && echo true || echo false )

data2json "$data" $1
