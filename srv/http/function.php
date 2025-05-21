<?php // for library.php, playlist.php
$LAZYLOAD = isset( $_POST[ 'lazyload' ] );
$lazy     = $LAZYLOAD ? ' lazyload" data-src="' :'" loading="lazy" src="';

function countMnt() {
	$lsmnt     = ( object ) [];
	foreach( [ 'NAS', 'SD', 'USB' ] as $dir ) {
		$lsdir = glob( '/mnt/MPD/'.$dir.'/*' );
		$list  = false;
		if ( $lsdir ) {
			$mpdignore = "/mnt/MPD/$dir/.mpdignore";
			if ( file_exists( $mpdignore ) ) {
				$ignore = file( $mpdignore, FILE_IGNORE_NEW_LINES );
				if ( count( $ignore ) < count( $lsdir ) ) $list = true;
			} else {
				$list   = true;
			}
		}
		$dir         = strtolower( $dir );
		$lsmnt->$dir = $list;
	}
	return $lsmnt;
}
function dataIndex( $str ) {
	global $index0, $indexes;
	$index     = strtoupper( mb_substr( $str, 0, 1, 'UTF-8' ) );
	if ( $index === $index0 ) return '';
	
	$indexes[] = $index;
	$index0    = $index;
	return ' data-index="'.$index.'"';
}
function HMS2second( $time ) {
	if ( ! $time ) return 0;
	
	$HMS   = explode( ':', $time );
	$count = count( $HMS );
	switch( $count ) {
		case 1: return $HMS[ 0 ]; break;
		case 2: return $HMS[ 0 ] * 60 + $HMS[ 1 ]; break;
		case 3: return $HMS[ 0 ] * 60 * 60 + $HMS[ 1 ] * 60 + $HMS[ 0 ]; break;
	}
}
function icon(  $icon, $menu = '' ) {
	$htmlmenu = $menu ? ' li-icon" data-menu="'.$menu : '';
	return '<i class="i-'.$icon.$htmlmenu.'"></i>';
}
function iconThumb( $thumbsrc, $menu ) {
	global $lazy;
	return '<img class="iconthumb li-icon'.$lazy.rawurlencode( $thumbsrc ).'^^^" data-menu="'.$menu.'">';
}
function indexBar( $indexes ) {
	$indexbar  = '<a class="indexed">#</a>';
	$indexbar1 = $indexbar;
	$chars     = range( 'A', 'Z' );
	for ( $i = 0; $i < 26; $i++ ) {
		$char = $chars[ $i ];
		if ( in_array( $char, $indexes ) ) {
			$indexbar.= '<a class="indexed">'.$char.'</a>';
		} else {
			$indexbar.= '<a>'.$char.'</a>';
		}
	}
	for ( $i = 0; $i < 26; $i++ ) {
		$char     = $chars[ $i ];
		$char1    = $chars[ $i + 1 ];
		$indexed  = 0;
		$indexed1 = 0;
		if ( in_array( $char, $indexes ) ) {
			$char    = $char;
			$indexed = 1;
		}
		if ( in_array( $char1, $indexes ) ) {
			$char1    = $char1;
			$indexed1 = 1;
		}
		if ( $indexed || $indexed1 ) {
			$indexbar1.= '<a class="indexed">'.$char.$char1.'</a>';
		} else {
			$indexbar1.= '<a>'.$char.$char1.'</a>';
		}
		$i++;
	}
	return '</ul>
<div class="index index0">'.$indexbar.'</div>
<div class="index index1">'.$indexbar1.'</div>';
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
function sortList( &$array ) {
	usort( $array, function( $a, $b ) {
		return strnatcasecmp( $a->sort, $b->sort );
	} );
}
function stripSort( $str ) {
	// usort: <spcae> ! " # $ % & ' ( ) * + , - . / 0 : ; < = > ? @ A [ \ ] ^ _ ` a { | }
	$string = preg_replace(
		  [ '/^The +|^A +|^An +|"|^[^\w\p{L}\p{N}\p{Pd} ~]/ui',
			'/^_/',
			'/\^\^/',
			'/\s+/'
		  ]
		, [ '',  // strip articles | non utf-8 normal alphanumerics | tilde(blank data)
			'/', // sort _  before 0       [ _ to / ]  
			'!', // sort ^^ before <space> [ ^^ to ! ] in album list
			'"'  // sort    after  ^^      [   to " ]  in album list
		  ]
		, $str
	);
	if ( !preg_match( '/[\x80-\xff]/', $string ) ) return $string;
	
	// strip accents: https://stackoverflow.com/a/10790734
	$chars = array(
		// Decompositions for Latin-1 Supplement
		chr(195).chr(128) => 'A', chr(195).chr(129) => 'A',
		chr(195).chr(130) => 'A', chr(195).chr(131) => 'A',
		chr(195).chr(132) => 'A', chr(195).chr(133) => 'A',
		chr(195).chr(135) => 'C', chr(195).chr(136) => 'E',
		chr(195).chr(137) => 'E', chr(195).chr(138) => 'E',
		chr(195).chr(139) => 'E', chr(195).chr(140) => 'I',
		chr(195).chr(141) => 'I', chr(195).chr(142) => 'I',
		chr(195).chr(143) => 'I',
		chr(195).chr(145) => 'N',
		chr(195).chr(146) => 'O', chr(195).chr(147) => 'O',
		chr(195).chr(148) => 'O', chr(195).chr(149) => 'O',
		chr(195).chr(150) => 'O', chr(195).chr(153) => 'U',
		chr(195).chr(154) => 'U', chr(195).chr(155) => 'U',
		chr(195).chr(156) => 'U',
		chr(195).chr(157) => 'Y',
		chr(195).chr(159) => 's',
		chr(195).chr(160) => 'a', chr(195).chr(161) => 'a',
		chr(195).chr(162) => 'a', chr(195).chr(163) => 'a',
		chr(195).chr(164) => 'a', chr(195).chr(165) => 'a',
		chr(195).chr(167) => 'c',
		chr(195).chr(168) => 'e', chr(195).chr(169) => 'e',
		chr(195).chr(170) => 'e', chr(195).chr(171) => 'e',
		chr(195).chr(172) => 'i', chr(195).chr(173) => 'i',
		chr(195).chr(174) => 'i', chr(195).chr(175) => 'i',
		chr(195).chr(177) => 'n',
		chr(195).chr(178) => 'o', chr(195).chr(179) => 'o',
		chr(195).chr(180) => 'o', chr(195).chr(181) => 'o',
		chr(195).chr(182) => 'o', chr(195).chr(182) => 'o',
		chr(195).chr(185) => 'u', chr(195).chr(186) => 'u',
		chr(195).chr(187) => 'u', chr(195).chr(188) => 'u',
		chr(195).chr(189) => 'y', chr(195).chr(191) => 'y',
		// Decompositions for Latin Extended-A
		chr(196).chr(128) => 'A', chr(196).chr(129) => 'a',
		chr(196).chr(130) => 'A', chr(196).chr(131) => 'a',
		chr(196).chr(132) => 'A', chr(196).chr(133) => 'a',
		chr(196).chr(134) => 'C', chr(196).chr(135) => 'c',
		chr(196).chr(136) => 'C', chr(196).chr(137) => 'c',
		chr(196).chr(138) => 'C', chr(196).chr(139) => 'c',
		chr(196).chr(140) => 'C', chr(196).chr(141) => 'c',
		chr(196).chr(142) => 'D', chr(196).chr(143) => 'd',
		chr(196).chr(144) => 'D', chr(196).chr(145) => 'd',
		chr(196).chr(146) => 'E', chr(196).chr(147) => 'e',
		chr(196).chr(148) => 'E', chr(196).chr(149) => 'e',
		chr(196).chr(150) => 'E', chr(196).chr(151) => 'e',
		chr(196).chr(152) => 'E', chr(196).chr(153) => 'e',
		chr(196).chr(154) => 'E', chr(196).chr(155) => 'e',
		chr(196).chr(156) => 'G', chr(196).chr(157) => 'g',
		chr(196).chr(158) => 'G', chr(196).chr(159) => 'g',
		chr(196).chr(160) => 'G', chr(196).chr(161) => 'g',
		chr(196).chr(162) => 'G', chr(196).chr(163) => 'g',
		chr(196).chr(164) => 'H', chr(196).chr(165) => 'h',
		chr(196).chr(166) => 'H', chr(196).chr(167) => 'h',
		chr(196).chr(168) => 'I', chr(196).chr(169) => 'i',
		chr(196).chr(170) => 'I', chr(196).chr(171) => 'i',
		chr(196).chr(172) => 'I', chr(196).chr(173) => 'i',
		chr(196).chr(174) => 'I', chr(196).chr(175) => 'i',
		chr(196).chr(176) => 'I', chr(196).chr(177) => 'i',
		chr(196).chr(178) => 'IJ',chr(196).chr(179) => 'ij',
		chr(196).chr(180) => 'J', chr(196).chr(181) => 'j',
		chr(196).chr(182) => 'K', chr(196).chr(183) => 'k',
		chr(196).chr(184) => 'k', chr(196).chr(185) => 'L',
		chr(196).chr(186) => 'l', chr(196).chr(187) => 'L',
		chr(196).chr(188) => 'l', chr(196).chr(189) => 'L',
		chr(196).chr(190) => 'l', chr(196).chr(191) => 'L',
		chr(197).chr(128) => 'l', chr(197).chr(129) => 'L',
		chr(197).chr(130) => 'l', chr(197).chr(131) => 'N',
		chr(197).chr(132) => 'n', chr(197).chr(133) => 'N',
		chr(197).chr(134) => 'n', chr(197).chr(135) => 'N',
		chr(197).chr(136) => 'n', chr(197).chr(137) => 'N',
		chr(197).chr(138) => 'n', chr(197).chr(139) => 'N',
		chr(197).chr(140) => 'O', chr(197).chr(141) => 'o',
		chr(197).chr(142) => 'O', chr(197).chr(143) => 'o',
		chr(197).chr(144) => 'O', chr(197).chr(145) => 'o',
		chr(197).chr(146) => 'OE',chr(197).chr(147) => 'oe',
		chr(197).chr(148) => 'R', chr(197).chr(149) => 'r',
		chr(197).chr(150) => 'R', chr(197).chr(151) => 'r',
		chr(197).chr(152) => 'R', chr(197).chr(153) => 'r',
		chr(197).chr(154) => 'S', chr(197).chr(155) => 's',
		chr(197).chr(156) => 'S', chr(197).chr(157) => 's',
		chr(197).chr(158) => 'S', chr(197).chr(159) => 's',
		chr(197).chr(160) => 'S', chr(197).chr(161) => 's',
		chr(197).chr(162) => 'T', chr(197).chr(163) => 't',
		chr(197).chr(164) => 'T', chr(197).chr(165) => 't',
		chr(197).chr(166) => 'T', chr(197).chr(167) => 't',
		chr(197).chr(168) => 'U', chr(197).chr(169) => 'u',
		chr(197).chr(170) => 'U', chr(197).chr(171) => 'u',
		chr(197).chr(172) => 'U', chr(197).chr(173) => 'u',
		chr(197).chr(174) => 'U', chr(197).chr(175) => 'u',
		chr(197).chr(176) => 'U', chr(197).chr(177) => 'u',
		chr(197).chr(178) => 'U', chr(197).chr(179) => 'u',
		chr(197).chr(180) => 'W', chr(197).chr(181) => 'w',
		chr(197).chr(182) => 'Y', chr(197).chr(183) => 'y',
		chr(197).chr(184) => 'Y', chr(197).chr(185) => 'Z',
		chr(197).chr(186) => 'z', chr(197).chr(187) => 'Z',
		chr(197).chr(188) => 'z', chr(197).chr(189) => 'Z',
		chr(197).chr(190) => 'z', chr(197).chr(191) => 's'
	);
	$string = strtr($string, $chars);

	return $string;
}
