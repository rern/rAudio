<?php
function indexbar( $indexes ) {
	$indexbar = '<a class="indexed"><wh>#</wh></a>';
	$chars = range( 'A', 'Z' );
	for ( $i =0; $i < 26; $i++ ) {
		$char = $chars[ $i ];
		if ( in_array( $char, $indexes ) ) {
			$indexbar.= '<a class="indexed"><wh>'.$char.'</wh></a>';
		} else {
			$indexbar.= '<a>'.$char.'</a>';
		}
	}
	$indexbar1 = '<a><wh>#</wh></a>';
	for ( $i =0; $i < 26; $i++ ) {
		$char = $chars[ $i ];
		$char1 = $chars[ $i + 1 ];
		$indexed = 0;
		$indexed1 = 0;
		if ( in_array( $char, $indexes ) ) {
			$char = '<wh>'.$char.'</wh>';
			$indexed = 1;
		}
		if ( in_array( $char1, $indexes ) ) {
			$char1 = '<wh>'.$char1.'</wh>';
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
