#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs
[[ $BT == true ]] && dirconfig+=-bt

saveConfig() {
	. <( grep ^CONFIG /etc/default/camilladsp )
	[[ ! $CONFIG ]] && CONFIG=$dircamilladsp/configs/camilladsp.yml
	config=$( websocat --text ws://127.0.0.1:1234 <<< '"GetConfig"' )
	echo -e "$config " | sed '1 s/.*/---/; $d; s/\\"/"/g' > "$CONFIG"
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
mute )
	file_volumemute=$dirsystem/volumemute
	(( $VOLUME > 0 )) && echo $VOLUME > $file_volumemute || rm -f $file_volumemute
	;;
restart )
	systemctl restart camilladsp
	;;
saveconfig )
	saveConfig
	;;
	
esac
[[ ${CMD:0:1} == c ]] && pushRefresh
