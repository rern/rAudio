<?php
include '/srv/http/function.php';

$mode  = $argv[ 1 ];
$lines = file( '/srv/http/data/mpd/'.$mode, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
$sort  = [];
foreach( $lines as $line ) $data[] = stripSort( $line ).'^x^'.$line;
usort( $data, function( $a, $b ) {
	return strnatcasecmp( $a, $b );
} );
$list = '';
foreach( $data as $line ) {
	$index = mb_substr( $line, 0, 1, 'UTF-8' );
	$list .= $index.'^^'.explode( '^x^', $line )[ 1 ]."\n";
}
file_put_contents( '/srv/http/data/mpd/'.$mode, $list );
