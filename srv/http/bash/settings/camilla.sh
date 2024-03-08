#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs

saveConfig() {
	data=$( echo '"GetConfigJson"' \
				| websocat ws://127.0.0.1:1234 \
				| jq -r .GetConfigJson.value \
				| sed 's|^{|{"page":"camilla",|' )
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	config=$( echo '"GetConfig"' | websocat ws://127.0.0.1:1234 )
	echo -e "$config " | sed 's/.*GetConfig.*/---/; $d; s/\\"/"/g' > "$configfile"
	pushRefresh
}

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
	saveConfig
	sed -i -E "s|^(CONFIG=).*|\1$CONFIG|" /etc/default/camilladsp
	;;
restart )
	systemctl restart camilladsp
	;;
saveconfig )
	saveConfig
	;;
statusconfiguration )
	[[ ! $FILE ]] && FILE=$( getVar CONFIG /etc/default/camilladsp )
	cat "$FILE"
	;;
statusoutput )
	$dirsettings/player.sh statusoutput
	;;
	
esac

