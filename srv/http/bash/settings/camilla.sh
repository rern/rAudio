#!/bin/bash

. /srv/http/bash/common.sh

dircoeffs=$dircamilladsp/coeffs
dirconfigs=$dircamilladsp/configs

saveConfig() {
	data=$( echo '"GetConfigJson"' \
				| websocat ws://127.0.0.1:1234 \
				| jq -r .GetConfigJson.value \
				| sed 's|^{|{"page":"camilla",|' )
	pushData refresh "$data"
	configfile=$( getVar CONFIG /etc/default/camilladsp )
	config=$( echo '"GetConfig"' | websocat ws://127.0.0.1:1234 )
	echo -e "$config " | sed 's/.*GetConfig.*/---/; $d; s/\\"/"/g' > "$configfile"
}

args2var "$1"

case $CMD in

camilla )
	pushData camilla $( conf2json camilla.conf )
	;;
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
	sed -i -E "s|^(CONFIG=).*|\1$PATH|" /etc/default/camilladsp
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
statuslog )
	cat /var/log/camilladsp.log
	;;
	
esac

