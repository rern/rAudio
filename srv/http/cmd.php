<?php
$sudo        = '/usr/bin/sudo ';
$dirsettings = '/srv/http/bash/settings/';
$dirshm      = '/srv/http/data/shm/';

switch( $_POST[ 'cmd' ] ) {

case 'bash':
	$filesh    = $_POST[ 'filesh' ];
	$args      = $_POST[ 'args' ] ?? '';
	$cmd       = $sudo.'/srv/http/bash/'.$filesh;
	if ( $args ) $cmd .= ' "'.escape( implode( "\n", $args ) ).'"';
	$result    = shell_exec( $cmd );
	echo rtrim( $result );
	break;
case 'camilla': // formdata from camilla.js
	fileUploadSave( '/srv/http/data/camilladsp/'.$_POST[ 'dir' ].'/'.$_FILES[ 'file' ][ 'name' ] );
	exec( $sudo.$dirsettings.'camilla-data.sh pushrefresh', $output, $result );
	break;
case 'datarestore': // formdata from system.js
	fileUploadSave( $dirshm.'backup.gz' );
	$libraryonly = $_POST[ 'libraryonly' ] ?? '';
	exec( $sudo.$dirsettings.'system-datarestore.sh '.$libraryonly, $output, $result );
	if ( $result != 0 ) echo 'Restore failed';
	break;
case 'giftype': // formdata from common.js
	$tmpfile  = $_FILES[ 'file' ][ 'tmp_name' ];
	$animated = exec( $sudo.'/usr/bin/gifsicle -I '.$tmpfile.' | grep -q -m1 "image #1" && echo 1 || echo 0' );
	echo $animated;
	if ( $animated ) move_uploaded_file( $tmpfile, $dirshm.'local/tmp.gif' );
	break;
case 'imagereplace': // $.post from function.js
	$imagefile = $_POST[ 'imagefile' ];
	$type      = $_POST[ 'type' ];
	if ( $type === 'coverart' && ! is_writable( dirname( $imagefile ) ) ) exit( '-1' );
//----------------------------------------------------------------------------------
	$bookmarkname = $_POST[ 'bookmarkname' ] ?? '';
	$imagedata    = $_POST[ 'imagedata' ];
	$jpg          = substr( $imagedata, 0, 4 ) === 'data'; // animated gif passed as already uploaded tmp/file
	if ( $jpg ) {
		$tmpfile = $dirshm.'local/binary';
		$base64  = preg_replace( '/^.*,/', '', $imagedata ); // data:imgae/jpeg;base64,... > ...
		file_put_contents( $tmpfile, base64_decode( $base64 ) );
	} else {
		$tmpfile = $imagedata;
	}
	$sh           = [ $type, $tmpfile, $imagefile, $bookmarkname ];
	$multiline    = implode( "\n", $sh );
	$multiline    = escape( $multiline );
	shell_exec( $sudo.'/srv/http/bash/cmd-coverartsave.sh "'.$multiline.'"' );
	break;
case 'login': // $.post from features.js
	$file = '/srv/http/data/system/login';
	if ( file_exists( $file )  && ! password_verify( $_POST[ 'password' ], file_get_contents( $file ) ) ) exit( '-1' );
//----------------------------------------------------------------------------------
	if ( isset( $_POST[ 'disable' ] ) ) {
		unlink( $file );
		exec( $sudo.$dirsettings.'features.sh logindisable' );
		exit;
//----------------------------------------------------------------------------------
	}
	$pwdnew = $_POST[ 'pwdnew' ] ?? '';
	if ( $pwdnew ) {
		$hash = password_hash( $pwdnew, PASSWORD_BCRYPT, [ 'cost' => 12 ] );
		file_put_contents( $file, $hash );
		exec( $sudo.$dirsettings.'features.sh login' );
	} else {
		session_start();
		$_SESSION[ 'login' ] = 1;
	}
	break;
case 'logout': // $.post from main.js
	session_start();
	session_destroy();
	break;
case 'startupready':
	if ( file_exists( '/srv/http/data/shm/startup' ) ) echo 1;
	break;
case 'timezonelist': // $.post from system.js
	$list   = timezone_identifiers_list();
	$option = '<option value="auto">Auto</option>';
	foreach( $list as $key => $zone ) {
		$datetime = new DateTime( 'now', new DateTimeZone( $zone ) );
		$offset   = $datetime->format( 'P' );
		$zonename = preg_replace( [ '/_/', '/\//' ], [ ' ', ' <gr>&middot;</gr> ' ], $zone );
		$option  .= '<option value="'.$zone.'">'.$zonename.'&ensp;'.$offset.'</option>';
	}
	echo $option;
	break;
	
}

function escape( $string ) {
	return preg_replace( '/(["`])/', '\\\\\1', $string ); // \1 inside function - $1 normal 
}
function fileUploadSave( $filepath ) {
	if ( $_FILES[ 'file' ][ 'error' ] != UPLOAD_ERR_OK ) exit( '-1' );
//----------------------------------------------------------------------------------
	move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $filepath );
}
