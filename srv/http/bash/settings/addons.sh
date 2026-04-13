#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == kill ]]; then
	script=$( getContent $dirshm/script )
	[[ $script ]] && pkill $script && exit
# --------------------------------------------------------------------
fi

file_addons=$diraddons/addonslist.json
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
	user_repo=$( jq -r .$alias.installurl $file_addons | cut -d/ -f4,5 )
	curl -sL https://github.com/$user_repo/archive/$branch.tar.gz | bsdtar xvf - --strip-components=1 -C /
	file_uninstall=$( ls /uninstall_*.sh 2> /dev/null ) && chmod +x $file_uninstall && mv $file_uninstall /usr/local/bin
	find / -maxdepth 1 -type f -delete
}
installstart() { # $1-'u'=update
	rm $0
	read alias label branch < <( echo $1 )
	title="<a class='cc'>$( jq -r .$alias.title $file_addons )</a>"
	[[ $label != Rank || $label != Import ]] && title "$bar $label $title ..." || title "$bar $title ..."
}
installfinish() {
	version=$( jq -r .$alias.version $file_addons )
	[[ $version != null ]] && echo $version > $diraddons/$alias
	echo "
$bar Done.
<hr>
"
}
uninstallstart() {
	title="<a class='cc'>$( jq -r .$alias.title $file_addons )</a>"
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
