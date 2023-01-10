<?php
function i( $class, $target = '' ) {
	$icon = '<i class="fa fa-'.$class;
	$icon.= $target ? ' li-icon" data-target="#menu-'.$target.'"></i>' : '"></i>';
	return $icon;
}
function iconImg( $src, $target ) {
	return '<img class="lazyload iconthumb li-icon" data-src="'.$src.'^^^" data-target="#menu-'.$target.'">';
}
function indexbar( $indexes ) {
	$indexbar = '<a class="indexed"><wh>#</wh></a>';
	$chars    = range( 'A', 'Z' );
	for ( $i = 0; $i < 26; $i++ ) {
		$char = $chars[ $i ];
		if ( in_array( $char, $indexes ) ) {
			$indexbar.= '<a class="indexed"><wh>'.$char.'</wh></a>';
		} else {
			$indexbar.= '<a>'.$char.'</a>';
		}
	}
	$indexbar1 = '<a><wh>#</wh></a>';
	for ( $i = 0; $i < 26; $i++ ) {
		$char     = $chars[ $i ];
		$char1    = $chars[ $i + 1 ];
		$indexed  = 0;
		$indexed1 = 0;
		if ( in_array( $char, $indexes ) ) {
			$char    = '<wh>'.$char.'</wh>';
			$indexed = 1;
		}
		if ( in_array( $char1, $indexes ) ) {
			$char1    = '<wh>'.$char1.'</wh>';
			$indexed1 = 1;
		}
		if ( $indexed || $indexed1 ) {
			$indexbar1.= '<a class="indexed">'.$char.$char1.'</a>';
		} else {
			$indexbar1.= '<a>'.$char.$char1.'</a>';
		}
		$i++;
	}
	return [ $indexbar, $indexbar1 ];
}
function HMS2second( $time ) {
	$HMS   = explode( ':', $time );
	$count = count( $HMS );
	switch( $count ) {
		case 1: return $HMS[ 0 ]; break;
		case 2: return $HMS[ 0 ] * 60 + $HMS[ 1 ]; break;
		case 3: return $HMS[ 0 ] * 60 * 60 + $HMS[ 1 ] * 60 + $HMS[ 0 ]; break;
	}
}
function second2HMS( $second ) {
	$hh = floor( $second / 3600 );
	$mm = floor( ( $second % 3600 ) / 60 );
	$ss = $second % 60;
	
	$hh = $hh ? $hh.':' : '';
	$mm = $hh ? ( $mm > 9 ? $mm.':' : '0'.$mm.':' ) : ( $mm ? $mm.':' : '' );
	$ss = $mm ? ( $ss > 9 ? $ss : '0'.$ss ) : $ss;
	return $hh.$mm.$ss;
}
