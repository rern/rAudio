<?php
$post        = ( object ) $_POST;
$CMD         = $post->cmd ?? $argv[ 1 ]; // $argv - sort : from cmd-list.sh
$sudo        = '/usr/bin/sudo ';
$dirbash     = $sudo.'/srv/http/bash/';
$dirsettings = $dirbash.'settings/';
$dirdata     = '/srv/http/data/';
$dirshm      = $dirdata.'shm/';

switch( $CMD ) {

case 'bash':
	$args    = $post->args ?? '';
	if ( is_array( $args ) ) $args = escape( implode( "\n", $args ) );
	$command = $dirbash.$post->filesh.' "'.$args.'"';
	$result  = shell_exec( $command );
	echo rtrim( $result );
	break;
case 'camilla': // formdata from camilla.js
	fileUploadSave( $dirdata.'camilladsp/'.$post->dir.'/'.$_FILES[ 'file' ][ 'name' ] );
	exec( $dirsettings.'camilla-data.sh pushrefresh' );
	break;
case 'countmnt':
	include 'function.php';
	echo json_encode( countMnt() );
	break;
case 'datarestore': // formdata from system.js
	fileUploadSave( $dirshm.'backup.gz' );
	$libraryonly = $post->libraryonly ?? '';
	exec( $dirsettings.'system-datarestore.sh '.$libraryonly, $output, $result );
	if ( $result != 0 ) echo 'Restore failed';
	break;
case 'giftype': // formdata from common.js
	$tmpfile  = $_FILES[ 'file' ][ 'tmp_name' ];
	$animated = exec( $sudo.'/usr/bin/gifsicle -I '.$tmpfile.' | grep -q -m1 "image #1" && echo 1 || echo 0' );
	echo $animated;
	if ( $animated ) move_uploaded_file( $tmpfile, $dirshm.'local/tmp.gif' );
	break;
case 'imagereplace': // $.post from function.js
	if ( ! is_writable( dirname( $post->file ) ) ) exit( '-1' );
//----------------------------------------------------------------------------------
	exec( 'rm -f "'.substr( $post->file, 0, -4 ).'".*' ); // remove existing *.jpg, *.png, *.gif
	if ( substr( $post->file, -4 ) === 'jpg' ) {
		$base64  = preg_replace( '/^.*,/', '', $post->data ); // data:imgae/jpeg;base64,... > ...
		file_put_contents( $post->file, base64_decode( $base64 ) );
	} else {
		copy( $post->data, $post->file );
	}
	$args      = escape( implode( "\n", [ $post->type, $post->file, $post->current, 'CMD TARGET CURRENT' ] ) );
	shell_exec( $dirbash.'cmd-coverart.sh "'.$args.'"' );
	break;
case 'login': // $.post from features.js
	$filelogin   = $dirdata.'system/login';
	$pwd         = $post->pwd;
	if ( file_exists( $filelogin ) ) {
		$password = rtrim( file_get_contents( $filelogin ), "\n" );
		if ( ! password_verify( $pwd, $password ) ) exit( '-1' );
//----------------------------------------------------------------------------------
	}
	$filesetting = $filelogin.'setting';
	if ( isset( $post->disable ) ) {
		unlink( $filelogin );
		unlink( $filesetting );
		exec( $dirsettings.'features.sh login' );
	} else if ( ! isset( $post->loginsetting ) ) {
		session_start();
		$_SESSION[ 'login' ] = 1;
	} else {
		$pwd  = $post->pwdnew ?: $pwd;
		$hash = password_hash( $pwd, PASSWORD_BCRYPT, [ 'cost' => 12 ] );
		file_put_contents( $filelogin, $hash );
		if ( $post->loginsetting === 'true' ) { // no boolean
			touch( $filesetting );
		} else {
			unlink( $filesetting );
		}
		exec( $dirsettings.'features.sh login' );
	}
	break;
case 'logout': // $.post from main.js
	session_start();
	session_destroy();
	break;
case 'sort': // from cmd-list.sh
	include 'function.php';
	$modes = explode( ' ', $argv[ 2 ] );
	foreach( $modes as $mode ) {
		$file = '/srv/http/data/mpd/'.$mode;
		if ( ! file_exists( $file ) ) continue;
		
		$lines = file( $file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
		$data  = [];
		foreach( $lines as $l ) $data[] = stripSort( $l ).'^x^'.$l;
		usort( $data, function( $a, $b ) {
			return strnatcasecmp( $a, $b );
		} );
		$list = '';
		foreach( $data as $d ) $list .= mb_substr( $d, 0, 1, 'UTF-8' ).'^^'.explode( '^x^', $d )[ 1 ]."\n";
		file_put_contents( $file, $list );
	}
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
