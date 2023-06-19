<?php
include '/srv/http/function.php';

$file  = $argv[ 1 ];
$lines = file( $file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
$sort  = [];
if ( $file === '/srv/http/data/mpd/albumbyartist-year' ) {
	$byalbumsort  = [];
	$byartistsort = [];
	foreach( $lines as $line ) {
		if ( substr( $line, -4 ) === '.cue' ) $line = dirname( $line );
		$sort[]         = stripSort( $line ).'^x^'.$line;
		$data           = explode( '^^', $line ); // artist date album file
		$byalbumline    = $data[ 2 ].'^^'.$data[ 0 ].'^^'.$data[ 3 ];
		$byalbumsort[]  = stripSort( $byalbumline ).'^x^'.$byalbumline;
		$byartistline   = $data[ 0 ].'^^'.$data[ 2 ].'^^'.$data[ 3 ];
		$byartistsort[] = stripSort( $byartistline ).'^x^'.$byartistline;
	}
	$byalbumsort = array_unique( $byalbumsort );
	$byartistsort = array_unique( $byartistsort );
	usort( $byalbumsort, function( $a, $b ) {
		return strnatcasecmp( $a, $b );
	} );
	$byalbum      = '';
	foreach( $byalbumsort as $line ) {
		$index   = mb_substr( $line, 0, 1, 'UTF-8' );
		$byalbum.= $index.'^^'.explode( '^x^', $line )[ 1 ]."\n";
	}
	file_put_contents( '/srv/http/data/mpd/album', $byalbum );
	usort( $byartistsort, function( $a, $b ) {
		return strnatcasecmp( $a, $b );
	} );
	$byartist     = '';
	foreach( $byartistsort as $line ) {
		$index    = mb_substr( $line, 0, 1, 'UTF-8' );
		$byartist.= $index.'^^'.explode( '^x^', $line )[ 1 ]."\n";
	}
	file_put_contents( '/srv/http/data/mpd/albumbyartist', $byartist );
} else {
	foreach( $lines as $line ) $sort[] = stripSort( $line ).'^x^'.$line;
}
usort( $sort, function( $a, $b ) {
	return strnatcasecmp( $a, $b );
} );
$array = '';
foreach( $sort as $line ) {
	$index = mb_substr( $line, 0, 1, 'UTF-8' );
	$array.= $index.'^^'.explode( '^x^', $line )[ 1 ]."\n";
}
file_put_contents( $file, $array );
