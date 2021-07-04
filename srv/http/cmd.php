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
	
case 'bookmark':
	$path = $_POST[ 'path' ];
	$fileorder = $dirsystem.'order';
	$order = json_decode( file_get_contents( $fileorder ) );
	$order[] = $path;
	if ( isset( $_POST[ 'name' ] ) ) {
		$name = $_POST[ 'name' ];
		file_put_contents( $dirbookmarks.str_replace( '/', '|', $name ), $path );
		$icon ='<i class="fa fa-bookmark"></i><div class="divbklabel"><span class="bklabel label" style="">'.$name.'</span></div>';
	} else {
		$basename = basename( $path );
		file_put_contents( $dirbookmarks.$basename, $path );
		$coverartfile = '/mnt/MPD/'.$path.'/coverart.';
		$src = $coverartfile.time();
		if ( file_exists( $coverartfile.'gif' ) ) {
			$icon = '<img class="bkcoverart" src="'.rawurlencode( $src ).'.gif">';
		} else if ( file_exists( $coverartfile.'jpg' ) ) {
			$icon = '<img class="bkcoverart" src="'.rawurlencode( $src ).'.jpg">';
		} else {
			$icon ='<i class="fa fa-bookmark"></i><div class="divbklabel"><span class="bklabel label" style="">'.$basename.'</span></div>';
		}
	}
	$dataalbum = substr( $icon, 1, 3 ) === 'img' ? 'data-album="1"' : '';
	$data = [
		  'path' => $path
		, 'html' => '
			<div class="lib-mode bookmark">
				<div class="mode mode-bookmark" '.$dataalbum.'>
				<a class="lipath">'.$path.'</a>
				'.$icon.'
			</div></div>'
		, 'order' => $order
	];
	file_put_contents( $fileorder, json_encode( $order, JSON_PRETTY_PRINT ) );
	pushstream( 'bookmark', $data );
	break;
case 'bookmarkremove':
	$path = $_POST[ 'path' ];
	$fileorder = $dirsystem.'order';
	$order = json_decode( file_get_contents( $fileorder ) );
	$name = str_replace( '/', '|', $_POST[ 'delete' ] );
	exec( 'rm "'.$dirbookmarks.escape( $name ).'"' );
	$index = array_search( $path, $order );
	array_splice( $order, $index, 1 ); // remove + reindex for json_encode
	file_put_contents( $fileorder, json_encode( $order, JSON_PRETTY_PRINT ) );
	pushstream( 'bookmark', [ 'type' => 'delete', 'path' => $path, 'order' => $order ] );
	break;
case 'bookmarkrename':
	$name = $_POST[ 'name' ];
	$rename = $_POST[ 'rename' ];
	rename( $dirbookmarks.str_replace( '/', '|', $name ), $dirbookmarks.str_replace( '/', '|', $rename ) );
	pushstream( 'bookmark', [ 'type' => 'rename', 'path' => $_POST[ 'path' ], 'name' => $rename ] );
	break;
case 'datarestore':
	if ( $_FILES[ 'file' ][ 'error' ] != UPLOAD_ERR_OK ) exit( '-1' );
	
	move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $dirdata.'tmp/backup.gz' );
	exec( $sudo.'/srv/http/bash/system.sh datarestore' );
	break;
case 'displayset':
	$data = json_decode( $_POST[ 'displayset' ] );
	$remove = [ 'update', 'updating_db' ];
	foreach( $remove as $key ) unset( $data->$key );
	pushstream( 'display', $data );
	$remove = [ 'color', 'order', 'volumenone' ];
	foreach( $remove as $key ) unset( $data->$key );
	file_put_contents( $dirsystem.'display', json_encode( $data, JSON_PRETTY_PRINT ) );
	break;
case 'imagereplace':
	$imagefile = $_POST[ 'imagefile' ];
	$type = $_POST[ 'type' ];
	$base64 = isset( $_POST[ 'base64' ] );
	$ext = $base64 ? '.jpg' : '.gif';
	if ( $type === 'audiocd' ) {
		$filenoext = substr( $imagefile, 0, -3 );
		exec( 'rm -f '.$filenoext.'*' );
		$content = $base64 ? base64_decode( $_POST[ 'base64' ] ) : $_FILES[ 'file' ][ 'tmp_name' ];
		file_put_contents( $imagefile, $content );
		$coverfile = substr( $filenoext, 9 ).time().$ext; // remove /srv/http
		pushstream( 'coverart', json_decode( '{"url":"'.$coverfile.'","type":"coverart"}' ) );
	} else if ( $base64 ) { // jpg/png - album coverart(path /mnt/...) needs sudo
		$tmpfile = $dirdata.'shm/binary';
		file_put_contents( $tmpfile, base64_decode( $_POST[ 'base64' ] ) );
		cmdsh( [ 'thumbjpg', $type, $tmpfile, $imagefile ] );
	} else { // gif passed as file
		$tmpfile = $_FILES[ 'file' ][ 'tmp_name' ];
		cmdsh( [ 'thumbgif', $type, $tmpfile, $imagefile ] );
	}
	break;
case 'login':
	$passwordfile = $dirsystem.'loginset';
	if ( file_exists( $passwordfile ) ) {
		$hash = file_get_contents( $passwordfile );
		if ( !password_verify( $_POST[ 'password' ], $hash ) ) die();
	}
	
	if ( isset( $_POST[ 'pwdnew' ] ) ) {
		$hash = password_hash( $_POST[ 'pwdnew' ], PASSWORD_BCRYPT, [ 'cost' => 12 ] );
		echo file_put_contents( $passwordfile, $hash );
		exec( $sudo.'/srv/http/bash/features.sh loginset' );
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
case 'order':
	$order = $_POST[ 'order' ]; 
	file_put_contents( $dirsystem.'order', json_encode( $order, JSON_PRETTY_PRINT ) );
	pushstream( 'order', $order );
	break;
}

function cmdsh( $sh ) {
	$script = '/usr/bin/sudo /srv/http/bash/cmd.sh "';
	$script.= escape( implode( "\n", $sh ) ).'"';
	return shell_exec( $script );
}
function escape( $string ) {
	return preg_replace( '/(["`])/', '\\\\\1', $string );
}
function pushstream( $channel, $data ) {
	$ch = curl_init( 'http://localhost/pub?id='.$channel );
	curl_setopt( $ch, CURLOPT_HTTPHEADER, array( 'Content-Type:application/json' ) );
	curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $data, JSON_NUMERIC_CHECK ) );
	curl_exec( $ch );
	curl_close( $ch );
}
