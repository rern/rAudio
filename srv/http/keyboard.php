<?php
$css[]   = 'keyboard';
$js[]    = 'keyboard';
$keys    = ( object ) [
	  'A' => [ '!@#$%^&*()_+', 'QWERTYUIOP{}', 'ASDFGHJKL:"', '~ZXCVBNM<>?|' ]
	, 'a' => [ '1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", '`zxcvbnm,./\\' ]
	, 's' => [
		  'shift'     => icon( 'shift' )
		, 'space'     => ' '
		, 'backspace' => icon( 'backspace' )
		, 'enter'     => 'OK'
	]
];
$kb      = ( object ) [ 'A' => '', 'a' => '', 's' => '' ];
foreach( $keys->A as $i => $key ) {
	$kb->A.= '<div class="row kr'.$i.'">';
	$kb->a.= '<div class="row kr'.$i.'">';
	$key   = ( object ) [ 'A' => str_split( $key ), 'a' => str_split( $keys->a[ $i ] ) ];
	foreach( $key->A as $j => $k ) {
		$kb->A.= '<a>'.$k.'</a>';
		$kb->a.= '<a>'.$key->a[ $j ].'</a>';
	}
	$kb->A.= '</div>';
	$kb->a.= '</div>';
}
foreach( $keys->s as $c => $k ) $kb->s.= '<a class="'.$c.'">'.$k.'</a>';
$keyboard = '
<div id="keyboard" class="hide">
	<div>
		<div id="kA" class="hide">'.$kb->A.'</div>
		<div id="ka">'.$kb->a.'</div>
		<div id="ks">'.$kb->s.'</div>
	</div>
</div>
';
