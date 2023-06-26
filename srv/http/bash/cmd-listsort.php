<?php
include '/srv/http/function.php';

$mode  = $argv[ 1 ];
$lines = file( '/srv/http/data/mpd/'.$mode, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES );
$sort  = [];
if ( $mode === 'album' ) {
	$dataalbum      = [];
	$dataartist     = [];
	$dataartistyear = [];
	foreach( $lines as $line ) {
		if ( substr( $line, -4 ) === '.cue' ) $line = dirname( $line );
		$data             = explode( '^^', $line ); // album artist date file
		$album            = $data[ 0 ];
		if ( ! $album ) continue;
		
		$artist           = $data[ 1 ];
		$date             = $data[ 2 ];
		$file             = $data[ 3 ];
		$line             = $album.'^^'.$artist.'^^'.$file;
		$dataalbum[]      = stripSort( $line ).'^x^'.$line;
		$line             = $artist.'^^'.$album.'^^'.$file;
		$dataartist[]     = stripSort( $line ).'^x^'.$line;
		$line             = $artist.'^^'.$date.'^^'.$album.'^^'.$file;
		$dataartistyear[] = stripSort( $line ).'^x^'.$line;
	}
	listSort( $dataalbum,      'album' );
	listSort( $dataartist,     'albumdataartistt' );
	listSort( $dataartistyear, 'albumdataartistt-year' );
} else {
	foreach( $lines as $line ) $data[] = stripSort( $line ).'^x^'.$line;
	listSort( $data, $mode );
}

function listSort( $data, $mode ) {
	$data = array_unique( $data );
	usort( $data, function( $a, $b ) {
		return strnatcasecmp( $a, $b );
	} );
	$list = '';
	foreach( $data as $line ) {
		$index = mb_substr( $line, 0, 1, 'UTF-8' );
		$list .= $index.'^^'.explode( '^x^', $line )[ 1 ]."\n";
	}
	file_put_contents( '/srv/http/data/mpd/'.$mode, $list );
}
