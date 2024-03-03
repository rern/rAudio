#!/bin/bash

. /srv/http/bash/common.sh
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
	echo "$bar Get files ..."
	installfile=$branch.tar.gz
	fileurl=$( jq -r .$alias.installurl $addonsjson | sed "s|raw/main/install.sh|archive/$installfile|" )
	curl -sfLO $fileurl
	[[ $? != 0 ]] && echo -e "$warn Get files failed." && exit
	
	echo
	echo "$bar Install new files ..."
	filelist=$( bsdtar tf $installfile \
					| grep /srv/ \
					| sed -e '/\/$/ d' -e 's|^.*/srv/|/srv/|' ) # stdout as a block to avoid blank lines
	echo "$filelist"
	uninstallfile=$( grep uninstall_.*sh <<< $filelist )
	if [[ $uninstallfile ]]; then
		bsdtar xf $installfile --strip 1 -C /usr/local/bin $uninstallfile
		chmod 755 /usr/local/bin/$uninstallfile
	fi
	tmpdir=/tmp/install
	rm -rf $tmpdir
	mkdir -p $tmpdir
	bsdtar xf $installfile --strip 1 -C $tmpdir
	rm $installfile $tmpdir/{.*,*} &> /dev/null
	cp -r $tmpdir/* /
	rm -rf $tmpdir
}
installstart() { # $1-'u'=update
	rm $0
	readarray -t args <<< $1 # lines to array: alias label branch opt1 opt2 ...
	alias=${args[0]}
	label=${args[1]}
	branch=${args[2]}
	args=( "${args[@]:3}" ) # 'opt' for script start at ${args[0]}
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
	[[ -e $dirmpd/updating ]] && $dirbash/cmd.sh mpcupdate
}
uninstallstart() {
	title="<a class='cc'>$( jq -r .$alias.title $addonsjson )</a>"
	if [[ ! -e /usr/local/bin/uninstall_$alias.sh ]]; then
	  echo $info $title not found.
	  rm $diraddons/$alias &> /dev/null
	  exit 1
	fi
	
	rm $0
	[[ $label != Update ]] && title "$bar Uninstall $title ..."
}
uninstallfinish() {
	rm $diraddons/$alias &> /dev/null
	[[ $label != Update ]] && title "$bar Done."
}
