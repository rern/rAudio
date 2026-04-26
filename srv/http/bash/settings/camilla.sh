#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs
[[ $BT == true ]] && dirconfig+=-bt

saveConfig() {
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	config=$( echo '"GetConfig"' | websocat ws://127.0.0.1:1234 )
	echo -e "$config " | sed '1 s/.*/---/; $d; s/\\"/"/g' > "$configfile"
}

args2var "$1"

case $CMD in

clippedreset )
	echo $CLIPPED > $dirshm/clipped
	;;
coefdelete )
	rm -f $dircoeffs/"$NAME"
	;;
coefrename )
	mv -f $dircoeffs/{"$NAME","$NEWNAME"}
	;;
confcopy )
	cp -f $dirconfigs/{"$NAME","$NEWNAME"}
	;;
confdelete )
	rm -f $dirconfigs/"$NAME"
	;;
confrename )
	mv -f $dirconfigs/{"$NAME","$NEWNAME"}
	;;
confswitch )
	saveConfig
	sed -i -E "s|^(CONFIG=).*|\1$CONFIG|" /etc/default/camilladsp
	;;
restart )
	systemctl restart camilladsp
	;;
saveconfig )
	saveConfig
	;;
volume )
	volume
	;;
	
esac
[[ ${CMD:0:1} == c ]] && pushRefresh
