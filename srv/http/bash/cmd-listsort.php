#!/usr/bin/php
<?php
include '/srv/http/function.php';

$modes = [ 'album', 'albumartist', 'albumbyartist-year', 'artist', 'composer', 'conductor', 'date', 'genre', 'latest' ];

foreach( $modes as $mode ) {
	$file = '/srv/http/data/mpd/'.$mode;
	if ( ! file_exists( $file ) ) continue;
	
	$lines = file( $file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
	$sort  = [];
	foreach( $lines as $line ) $data[] = stripSort( $line ).'^x^'.$line;
	usort( $data, function( $a, $b ) {
		return strnatcasecmp( $a, $b );
	} );
	$list = '';
	foreach( $data as $line ) $list .= mb_substr( $line, 0, 1, 'UTF-8' ).'^^'.explode( '^x^', $line )[ 1 ]."\n";
	file_put_contents( $file, $list );
}
