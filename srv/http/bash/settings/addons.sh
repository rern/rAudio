#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == kill ]]; then
	script=$( getContent $dirshm/script )
	[[ $script ]] && pkill $script && exit
# --------------------------------------------------------------------
fi

addonsjson=$diraddons/addonslist.json
bar='<a class="cbm">  </a>'
info='<a class="cby ck"> i </a>'
warn='<a class="cbr cw"> ! </a>'

title() {
	echo "\
<hr>
$1
<hr>"
}
getinstallzip() {
	echo
	echo "$bar Install new files ..."
	tarurl=$( jq -r .$alias.tarurl $addonsjson )
	curl -sL ${tarurl/BRANCH/$branch} \
		| bsdtar xvf - --strip-components=1 -C / 2>&1 \
		| grep '/.*/'
	find / -maxdepth 1 -type f -delete
}
installstart() { # $1-'u'=update
	rm $0
	read alias label branch < <( echo $1 )
	title="<a class='cc'>$( jq -r .$alias.title $addonsjson )</a>"
	[[ $label != Rank || $label != Import ]] && title "$bar $label $title ..." || title "$bar $title ..."
}
installfinish() {
	version=$( jq -r .$alias.version $addonsjson )
	[[ $version != null ]] && echo $version > $diraddons/$alias
	echo "
$bar Done.
<hr>
"
}
uninstallstart() {
	title="<a class='cc'>$( jq -r .$alias.title $addonsjson )</a>"
	if [[ ! -e /usr/local/bin/uninstall_$alias.sh ]]; then
	  echo $info $title not found.
	  rm $diraddons/$alias &> /dev/null
	  exit 1
# --------------------------------------------------------------------
	fi
	rm $0
	[[ $label != Update ]] && title "$bar Uninstall $title ..."
}
uninstallfinish() {
	rm $diraddons/$alias &> /dev/null
	[[ $label != Update ]] && title "$bar Done."
}
