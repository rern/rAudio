#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs

args2var "$1"

case $CMD in

clippedreset )
	echo $CLIPPED > $dirshm/clipped
	pushRefresh
	;;
coefdelete )
	rm -f $dircoeffs/"$NAME"
	pushRefresh
	;;
coefrename )
	mv -f $dircoeffs/{"$NAME","$NEWNAME"}
	pushRefresh
	;;
confcopy )
	[[ $BT == true ]] && dirconfig+=-bt
	cp -f $dirconfigs/{"$NAME","$NEWNAME"}
	pushRefresh
	;;
confdelete )
	[[ $BT == true ]] && dirconfig+=-bt
	rm -f $dirconfigs/"$NAME"
	pushRefresh
	;;
confrename )
	[[ $BT == true ]] && dirconfig+=-bt
	mv -f $dirconfigs/{"$NAME","$NEWNAME"}
	pushRefresh
	;;
confswitch )
	sed -i -E "s|^(CONFIG=).*|\1$PATH|" /etc/default/camilladsp
	pushRefresh
	;;
pushrefresh )
	pushRefresh
	;;
restart )
	systemctl restart camilladsp
	;;
statusconfiguration )
	[[ ! $FILE ]] && FILE=$( getVar CONFIG /etc/default/camilladsp )
	cat "$FILE"
	;;
statusoutput )
	$dirsettings/player.sh statusoutput
	;;
	
esac

