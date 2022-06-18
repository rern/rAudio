<?php
header( 'Access-Control-Allow-Origin: *' );

switch( $_POST[ 'cmd' ] ) {

case 'applyauto':
	$file = '/srv/http/settings/camillagui/config/gui-config.yml';
	$tf = exec( 'grep "apply_config_automatically: true" '.$file.' && echo false || echo true' );
	exec( 'sed -i "s/\(apply_config_automatically: \).*/\1'.$tf.'/" '.$file );
	break;
case 'close':
	exec( '/usr/bin/sudo /usr/bin/systemctl stop camillagui' );
	break;

}
