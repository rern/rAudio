#!/bin/bash

dirsystem=/srv/http/data/system
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

echo {$data} | sed 's/:\s*,/: false,/g' # sed - null > false
