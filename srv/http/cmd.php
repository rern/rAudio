<?php
$post        = ( object ) $_POST;
$CMD         = $post->cmd ?? $argv[ 1 ]; // $argv - sort : from cmd-list.sh
$sudo        = '/bin/sudo ';
$dirbash     = $sudo.'/srv/http/bash/';
$dirsettings = $dirbash.'settings/';
$dirdata     = '/srv/http/data/';
$dirshm      = $dirdata.'shm/';

switch( $CMD ) {

case 'bin':
	echo shell_exec( $dirbash.$post->bin );
	break;
case 'bash':
	$command = $dirbash.$post->filesh;
	if ( isset( $post->args ) ) {
		if ( is_array( $post->args ) ) {
			$args = escape( implode( "\n", $post->args ) );
		} else {
			$args = $post->args;
		}
		$command.= ' "'.$args.'"';
	}
	$result  = shell_exec( $command );
	echo rtrim( $result );
	break;
case 'camilla': // SETTING.upload() from camilla.js
	fileUploadSave( $dirdata.'camilladsp/'.$post->dir.'/'.$_FILES[ 'file' ][ 'name' ] );
	exec( $dirsettings.'camilla-data.sh pushrefresh' );
	break;
case 'datarestore': // CONFIG.restore() from system.js
	fileUploadSave( $dirshm.'backup.gz' );
	$libraryonly = $post->libraryonly ?? '';
	exec( $dirsettings.'system-datarestore.sh '.$libraryonly, $output, $result );
	if ( $result != 0 ) echo 'Restore failed';
	break;
case 'giftype': // FILEIMAGE.get() from function.js
	$tmpfile  = $_FILES[ 'file' ][ 'tmp_name' ];
	$animated = exec( $sudo.'/bin/gifsicle -I '.$tmpfile.' | grep -q -m1 "image #1" && echo 1 || echo 0' );
	echo $animated;
	if ( $animated ) move_uploaded_file( $tmpfile, '/tmp/img.gif' );
	break;
case 'imagereplace': // UTIL.imageReplace() from function.js
	if ( $post->file[ 0 ] === '/' ) {
		$dir = $post->file;
	} else {
		if ( str_starts_with( $post->file, 'cdda' ) ) {
			$discid = file( $dirshm.'audiocd', FILE_IGNORE_NEW_LINES )[ 0 ];
			$dir    = $dirdata.'audiocd/'.$discid;
		} else if ( in_array( $post->file[ 0 ], [ 'N', 'S', 'U' ] ) ) {
			$dir    = '/mnt/MPD/'.$post->file;
			if ( ! is_dir( $dir ) ) $dir = dirname( $dir );
		} else { // radio - http... or rtsp...
			$dir    = exec( 'grep ^'.$post->file.' /srv/http/data/mpd/radio | cut -d^ -f3' );
		}
	}
	if ( ! is_writable( $dir ) ) exit( 'No write permission:<br><c>'.$dir.'</c>' );
//----------------------------------------------------------------------------------
	$file = $dir.'/'.$post->name;
	exec( 'rm -f "'.$file.'".*' ); // remove existing *.jpg, *.png, *.gif
	$file.= '.'.$post->ext;
	if ( $post->ext === 'jpg' ) {
		$base64 = preg_replace( '/^.*,/', '', $post->data ); // data:imgae/jpeg;base64,... > ...
		file_put_contents( $file, base64_decode( $base64 ) );
	} else {
		rename( $post->data, $file );
	}
	$args = escape( implode( "\n", [ $post->name, $file, 'CMD FILE' ] ) );
	exec( $dirbash.'cmd-coverart.sh "'.$args.'"' );
	break;
case 'login': // CONFIG.login() from features.js
	$filelogin   = $dirdata.'system/login';
	$pwd         = $post->pwd;
	if ( file_exists( $filelogin ) ) {
		$password = rtrim( file_get_contents( $filelogin ), "\n" );
		if ( ! password_verify( $pwd, $password ) ) exit( '-1' ); // login failed
//----------------------------------------------------------------------------------
	}
	$filesetting = $filelogin.'setting';
	if ( isset( $post->disable ) ) {                              // disable
		unlink( $filelogin );
		unlink( $filesetting );
		exec( $dirsettings.'features.sh login' );
	} else if ( ! isset( $post->loginsetting ) ) {                // login ok
		session_start();
		$_SESSION[ 'login' ] = true;
	} else {                                                      // enable / change
		sessionStop();
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
case 'logout': // click .submenu lock from main.js
	sessionStop();
	break;
case 'sort': // from cmd-list.sh
	include 'function.php';
	$modes = explode( ' ', $argv[ 2 ] );
	foreach( $modes as $mode ) {
		$file = $dirdata.'mpd/'.$mode;
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
function sessionStop() {
	global $_SESSION;
	session_start();
	$_SESSION = [];
	session_destroy();
}
