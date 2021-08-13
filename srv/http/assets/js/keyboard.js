$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var current = 'alpha';
var capslock = false;
var numslock = false;
/*var normal = [
	  '1 2 3 4 5 6 7 8 9 0 - ='
	, 'q w e r t y u i o p [ ]'
	, "a s d f g h j k l ; ' \\"
	, 'z x c v b n m , . / {enter}'
	, '{shift} {lock} {space} {bksp}'
];
var shift = [
	  '! @ # $ % ^ & * ( ) _ +'
	, 'Q W E R T Y U I O P { }'
	, 'A S D F G H J K L : " |'
	, 'Z X C V B N M < > ? {enter}'
	, '{shift} {lock} {space} {bksp}'
];*/
var buttontheme = [
	  { class: 'hgrow1',  buttons: '1 !' }
	, { class: 'hgrow2',  buttons: 'q Q' }
	, { class: 'hgrow3',  buttons: 'a A' }
	, { class: 'hgrow4',  buttons: 'z Z' }
]
var narrow = [
	  'q w e r t y u i o p'
	, "a s d f g h j k l '"
	, 'z x c v b n m . {enter}'
	, '{shift} {lock} {num} {space} {bksp}'
];
var narrowshift = [
	  'Q W E R T Y U I O P'
	, 'A S D F G H J K L "'
	, 'Z X C V B N M , {enter}'
	, '{shift} {lock} {num} {space} {bksp}'
];
var narrownum = [
	  '1 2 3 4 5 6 7 8 9 0'
	, '! @ # $ % ? & * ( )'
	, '+ - = / ; : . , {enter}'
	, '{numshift} {numlock} {alpha} {space} {bksp}'
];
var narrownumshift = [
	  '1 2 3 4 5 6 7 8 9 0'
	, '` ~ _ ^ < > [ ] { }'
	, '+ - = / × ÷ | \\ {enter}'
	, '{numshift} {numlock} {alpha} {space} {bksp}'
];
var narrowbuttontheme = [
	  { class: 'hgrow2',  buttons: 'q Q 1 {shift} {numshift}' }
	, { class: 'hgrow3',  buttons: 'a A ! `' }
	, { class: 'hgrow4',  buttons: 'z Z +' }
];

var Keyboard = window.SimpleKeyboard.default;
var keyboard = new Keyboard( {
	  onChange   : value  => onChange( value )
	, onKeyPress : key => onKeyPress( key )
	, layout: {
		  alpha  : narrow
		, shift    : narrowshift
		, num      : narrownum
		, numshift : narrownumshift
	}
	, layoutName : "alpha"
	, display    : {
		  '{alpha}'    : 'Aa'
		, '{bksp}'     : '<i class="fa fa-backspace"></i>'
		, '{enter}'    : 'OK'
		, '{lock}'     : '<i class="fa fa-capslock"></i>'
		, '{numlock}'  : '<i class="fa fa-capslock"></i>'
		, '{num}'      : '1?'
		, '{numshift}' : '<i class="fa fa-shift"></i>'
		, '{shift}'    : '<i class="fa fa-shift"></i>'
		, '{space}'    : '&nbsp;'
	}
	, buttonTheme: narrowbuttontheme
} );
var $kb = $( '#keyboard' );
var inputs = 'input[type=text], input[type=textarea], input[type=passowrd]';
$( 'body' ).on( 'click', inputs, function() {
	$kb.removeClass( 'hide' );
	$( '#infoContent input' ).removeClass( 'active' );
	$( this ).addClass( 'active' );
	keyboard.setInput( $( this ).val() );
} ).on( 'click touchstart', function( e ) {
	if ( !$kb.hasClass( 'hide' ) && !$( e.target ).is( inputs ) )  hideKeyboard();
} );

function hideKeyboard() {
	keyboard.clearInput();
	$kb.addClass( 'hide' );
}
function onChange( value ) {
	$( 'input.active' ).val( value );
	if ( $( 'input.active' ).prop( 'id' ) === 'pl-search-input' ) {
		playlistFilter();
	} else {
		$( '#infoContent input' ).trigger( 'keyup' );
	}
}
function onKeyPress( key ) { // input value not yet changed until onChange
	var id = $( 'input.active' ).prop( 'id' );
	var layout = keyboard.options.layoutName;
	if ( key === '{shift}' ) {
		current = layout !== 'shift' ? 'shift' : 'alpha';
		capslock = false;
	} else if ( key === '{numshift}' ) {
		current = layout !== 'numshift' ? 'numshift' : 'num';
		numslock = false;
	} else if ( key === '{num}' ) {
		current = 'num';
		capslock = false;
	} else if ( key === '{alpha}' ) {
		current = 'alpha';
	} else if ( key === '{lock}' ) {
		if ( layout !== 'shift' ) {
			current = 'shift';
			capslock = true;
		} else {
			current = capslock ? 'alpha' : 'shift';
			capslock = current === 'shift' ? true : false;
		}
	} else if ( key === '{numlock}' ) {
		if ( layout !== 'numshift' ) {
			current = 'numshift';
			numslock = true;
		} else {
			current = numslock ? 'num' : 'numshift';
			numslock = current === 'numshift' ? true : false;
		}
	} else if ( key === '{enter}' ) {
		if ( !$( '#infoOverlay' ).hasClass( 'hide' ) ) {
			$( '#infoOk' ).click();
		} else {
			var button = id === 'lib-search-input' ? '#lib-search-btn' : '#pl-search-btn';
			$( button ).click();
		}
		hideKeyboard();
	} else {
		if ( ( layout === 'shift' && !capslock ) ) {
			current = 'alpha';
		} else if ( layout === 'numshift' && !numslock ) {
			current = 'num';
		}
	}
	keyboard.setOptions( { layoutName: current } );
	$( '.hg-button-lock' ).toggleClass( 'bgbl', capslock );
	$( '.hg-button-numlock' ).toggleClass( 'bgbl', numslock );
}

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
