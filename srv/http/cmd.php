<?php
$post        = ( object ) $_POST;
$sudo        = '/usr/bin/sudo ';
$dirbash     = $sudo.'/srv/http/bash/';
$dirsettings = $dirbash.'settings/';
$dirdata     = '/srv/http/data/';
$dirshm      = $dirdata.'shm/';

$cmd         = $post->cmd ?? $argv[ 1 ];

switch( $cmd ) {

case 'bash':
	$command = $dirbash.$post->filesh;
	$command.= $post->args ? ' "'.escape( implode( "\n", $post->args ) ).'"' : '';
	$result  = shell_exec( $command );
	echo rtrim( $result );
	break;
case 'camilla': // formdata from camilla.js
	fileUploadSave( $dirdata.'camilladsp/'.$post->dir.'/'.$_FILES[ 'file' ][ 'name' ] );
	exec( $dirsettings.'camilla-data.sh pushrefresh' );
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
	$filesetting = $filelogin.'setting';
	$pwd         = $post->pwd;
	if ( file_exists( $filelogin ) && ! password_verify( $pwd, file_get_contents( $filelogin ) ) ) exit( '-1' );
//----------------------------------------------------------------------------------
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
case 'timezonelist': // $.post from system.js
	$list   = timezone_identifiers_list();
	$option = '<option value="auto">Auto</option>';
	foreach( $list as $key => $zone ) {
		$datetime = new DateTime( 'now', new DateTimeZone( $zone ) );
		$offset   = $datetime->format( 'P' );
		$zonename = preg_replace( [ '/_/', '/\//' ], [ ' ', ' &middot; ' ], $zone );
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
