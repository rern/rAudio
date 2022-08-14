<?php
$sudo = '/usr/bin/sudo ';
$sudobin = $sudo.'/usr/bin/';
$dirdata = '/srv/http/data/';
$dirbookmarks = $dirdata.'bookmarks/';
$dirsystem = $dirdata.'system/';
$coverartsize = '200x200';
$thumbsize = '80x80';
$unsharp = '0x.5';

switch( $_POST[ 'cmd' ] ) {

// multiple arguments passing to bash as array
//  - no each argument quote
//  - escape ["`] in mutiline once by php
//    js   -> php  - array
//    php  -> bash - array > multiline string ( escaped ["`] )
//    bash         - multiline string > arguments = array by line
//    bash -> php  - string / json literal
//    php  -> js   - string / array / json literal( response type 'json' )
//
case 'sh': // multiple commands / scripts: no pre-escaped characters - js > php > bash
	$sh = $_POST[ 'sh' ];                                // php array = js array
	$script = '/srv/http/bash/'.array_shift( $sh ).' "'; // script    = 1st element
	$script.= escape( implode( "\n", $sh ) ).'"';        // arguments = array > escaped multiline string
	echo rtrim( shell_exec( $sudo.$script ) );           // bash arguments = multiline string > array by line
	break;
case 'bash': // single / one-line command - return string
	$cmd = $_POST[ 'bash' ];
	if ( $cmd[ 0 ] === '/' ) {
		$cmd = $sudo.$cmd;
	} else if ( $cmd[ 0 ] !== '{' ) {
		$cmd = $sudobin.$cmd;
	}
	echo shell_exec( $cmd );
	break;
case 'exec': // single / one-line command - return array of lines to js
	$cmd = $_POST[ 'exec' ];
	exec( $sudobin.$cmd, $output, $std );
	echo json_encode( $output );
	break;
	
case 'datarestore':
	if ( $_FILES[ 'file' ][ 'error' ] != UPLOAD_ERR_OK ) exit( '-1' );
	
	move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $dirdata.'tmp/backup.gz' );
	exec( $sudo.'/srv/http/bash/settings/system.sh datarestore' );
	break;
case 'imagereplace':
	$imagefile = $_POST[ 'imagefile' ];
	$type = $_POST[ 'type' ];
	$covername = $_POST[ 'covername' ] ?? '';
	$base64 = $_POST[ 'base64' ] ?? '';
	$ext = $base64 ? '.jpg' : '.gif';
	$filenoext = substr( $imagefile, 0, -3 );
	if ( $base64 ) { // jpg/png - path /mnt/... needs sudo
		$tmpfile = $dirdata.'shm/binary';
		file_put_contents( $tmpfile, base64_decode( $base64 ) );
	} else { // gif passed as file
		$tmpfile = $_FILES[ 'file' ][ 'tmp_name' ];
	}
	$sh = [ $base64 ? 'thumbjpg' : 'thumbgif', $type, $tmpfile, $imagefile, $covername ];
	$script = '/usr/bin/sudo /srv/http/bash/cmd.sh "'.escape( implode( "\n", $sh ) ).'"';
	shell_exec( $script );
	if ( $type === 'bookmark' ) {
		$coverfile = preg_replace( '#^/srv/http#', '', $imagefile ); // radio - /srv/http/data/...
		$path = exec( 'head -1 "'.$dirbookmarks.$covername.'"' );
		if ( file_exists( $imagefile ) ) $path.= "\n".$coverfile;
		file_put_contents( $dirbookmarks.$covername, $path );
	}
	$coverfile = $filenoext.time().$ext;
	if ( substr( $coverfile, 0, 4 ) === '/mnt' ) $coverfile = rawurlencode( $coverfile );
	$ch = curl_init( 'http://localhost/pub?id=coverart' );
	curl_setopt( $ch, CURLOPT_HTTPHEADER, array( 'Content-Type:application/json' ) );
	curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( [ 'url' => $coverfile, 'type' => $type ] ) );
	curl_exec( $ch );
	curl_close( $ch );
	break;
case 'login':
	$passwordfile = $dirsystem.'loginset';
	if ( file_exists( $passwordfile ) ) {
		$hash = file_get_contents( $passwordfile );
		if ( !password_verify( $_POST[ 'password' ], $hash ) ) die( -1 );
	}
	
	if ( isset( $_POST[ 'disable' ] ) ) {
		exec( $sudo.'/srv/http/bash/settings/features.sh logindisable' );
		exit();
	}
	
	$pwdnew = $_POST[ 'pwdnew' ] ?? '';
	if ( $pwdnew ) {
		$hash = password_hash( $pwdnew, PASSWORD_BCRYPT, [ 'cost' => 12 ] );
		echo file_put_contents( $passwordfile, $hash );
		exec( $sudo.'/srv/http/bash/settings/features.sh loginset' );
	} else {
		echo 1;
		session_start();
		$_SESSION[ 'login' ] = 1;
	}
	break;
case 'logout':
	session_start();
	session_destroy();
	break;
}

function escape( $string ) {
	return preg_replace( '/(["`])/', '\\\\\1', $string );
}
