/* 
pushstream
banner()
$.fn.press()
loader
info()
*/

var iconwarning = '<i class="fa fa-warning fa-lg yl"></i>&ensp;';
// pushstream
var page        = location.href.replace( /.*p=/, '' ).split( '&' )[ 0 ];
if ( ! [ 'addons', 'addons-progress', 'guide' ].includes( page )  ) {
	var pushstream  = new PushStream( {
		  modes                                 : 'websocket'
		, timeout                               : 20000
		, reconnectOnChannelUnavailableInterval : 3000
	} );
	var pushstreamChannel = ( channels ) => {
		channels.forEach( function( channel ) {
			pushstream.addChannel( channel );
		} );
		pushstream.connect();
	}
	var pushstreamPower = ( message ) => {
		if ( message === 'Off ...' ) {
			$( '#loader' ).css( 'background', '#000000' );
			setTimeout( function() {
				$( '#loader .logo' ).css( 'animation', 'none' );
			}, 10000 );
			pushstream.disconnect();
			G.poweroff = 1;
		} else {
			G.reboot = 1;
		}
		loader();
	}
	// active / inactive window
	var active      = 1;
	var connect     = () => {
		if ( ! active && ! G.poweroff ) {
			active = 1;
			pushstream.connect();
		}
	}
	var disconnect  = () => {
		if ( active ) {
			active = 0;
			pushstream.disconnect();
		}
	}
	document.addEventListener( 'visibilitychange', () => document.hidden ? disconnect() : connect() ); // invisible
	window.onpagehide = window.onblur = disconnect; // invisible + visible but not active
	window.onpageshow = window.onfocus = connect;
}
// $.fn.press() ----------------------------------------------------------------------
/*
$( ELEMENT ).press( DELEGATE, function( e ) {
	// ELEMENT: '#id' or '.class'
	// DELEGATE: optional
	// $( e.currentTarget ) = $( this );
	// cannot be attached with on
} );
events:
	- always : mouseenter > mousemove > mouseleave > mouseout
	- click  : mousedown > mouseup > click
	- touch  : touchstart > touchmove > touchend
*/
$.fn.press = function( arg1, arg2 ) {
	var callback, delegate, timeout;
	if ( ! arg2 ) {
		delegate = '';
		callback = arg1;
	} else {
		delegate = arg1;
		callback = arg2;
	}
	this.on( 'touchstart mousedown', delegate, function( e ) {
		timeout = setTimeout( function() {
			G.press = 1;
			callback( e );
		}, 1000 );
	} ).on( 'touchend mouseup mouseleave', delegate, function( e ) {
		clearTimeout( timeout );
		setTimeout( function() { G.press = 0 }, 300 ); // needed for mouse events
	} );
	return this // allow chain
}
// loader
function loader() {
	$( '#loader' ).removeClass( 'hide' );
}
function loaderHide() {
	$( '#loader' ).addClass( 'hide' );
}
$( 'body' ).prepend( `
<div id="infoOverlay" class="hide"></div>
<div id="banner" class="hide"></div>
<div id="loader">
	<svg class="logo" viewBox="0 0 180 180">
		<rect width="180" height="180" rx="9"/>
		<path d="M108.24,95.51A49.5,49.5,0,0,0,90,0V81H54V45H36V81H0V99H36v36H54V99H90v81h18V120.73L167.27,180H171a9,9,0,0,0,9-9v-3.72ZM108,23.67a31.46,31.46,0,0,1,0,51.66Z"/>
	</svg>
</div>
` );

$( '#banner' ).click( bannerHide );

$( '#infoOverlay' ).keyup( function( e ) {
/*
all:      [Tab]       - focus / next input
		  [Shift+Tab] - previous input
radio:    [L] [R]     - check
checkbox: [space]     - check
select:   [U] [D]     - check
*/
	var key = e.key;
	switch ( key ) {
		case 'Enter':
			if ( ! $( 'textarea' ).is( ':focus' ) ) $( '#infoOk' ).click();
			break;
		case 'Escape':
			G.local = 1; // prevent toggle setting menu
			setTimeout( function() { G.local = 0 }, 300 );
			$( '#infoX' ).click();
			break;
		case 'ArrowLeft':
		case 'ArrowRight':
			var rl = key === 'ArrowLeft' ? 'left' : 'right';
			$( '#infoArrow .fa-arrow-'+ rl ).click();
			break;
	}
} );
$( '#infoContent' ).click( function() {
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} );

function banner( icon, title, message, delay ) {
	clearTimeout( G.timeoutbanner );
	var iconhtml = icon && icon.slice( 0, 1 ) === '<' 
					? icon 
					: icon ? '<i class="fa fa-'+ ( icon ) +'"></i>' : '';
	$( '#banner' ).html( `
<div id="bannerIcon">${ iconhtml }</div>
<div id="bannerTitle">${ title }</div>
<div id="bannerMessage">${ message }</div>
` ).removeClass( 'hide' );
	if ( delay !== -1 ) G.timeoutbanner = setTimeout( bannerHide, delay || 3000 );
}
function bannerHide() {
	if ( $( '#banner' ).hasClass( 'hide' ) ) return
	if ( G.bannerhold ) {
		setTimeout( function() {
			G.bannerhold = 0;
			bannerHide();
		}, G.bannerhold );
		return
	}
	
	clearTimeout( G.timeoutbanner );
	$( '#banner' )
		.addClass( 'hide' )
		.empty();
}
// ------------------------------------------------------------------------------------
function infoUsage() {
	console.log( `
===============================
| icon | title                |
|      |----------------------|
|      | message              |
===============================

banner( 'icon', 'title', 'message', delayms )


===============================
| icon - title              X |
|-----------------------------|
| <-                       -> |
|           message           |
|         input/select        |
|            footer           |
|                             |
| file - button - cancel - ok |
===============================

Simple usage: info( 'message' )

info( {                                       // default
	icon          : 'NAME'                    // 'question'     (top icon)
	title         : 'TITLE'                   // 'Information'  (top title)
	width         : N                         // 400            (info width)
	
	tab           : [ 'LABEL', ... ]          // (none)         (tabs for switch between multiple infos)
	tabfunction   : [ FUNCTION, ... ]         // (none)         (info() functions)
	tabactive     : N                         // (none)         (active tab)
	
	content       : 'HTML'                    // ***            (custom html <table> input content)
	height        : N                         // (fit)          (infocontent height)
	
	message       : 'MESSAGE'                 // (blank)        (message under title)
	messagealign  : 'CSS'                     // 'center'
	footer        : 'FOOTER'                  // (blank)        (footer above buttons)
	footeralign   : 'CSS'                     // (blank)
	
	textlabel     : [ 'LABEL', ... ]          // ***            (label array input label)
	textalign     : 'CSS'                     // 'left'         (input text alignment)
	focus         : N                         // (none)         (focused input)
	
	passwordlabel : 'LABEL'                   // (blank)        (password input label)
	
	textarea      : 1                         // ***
	
	boxwidth      : N                         // 200            (input text/password width - 'max' to fit)
	
	radio         : { LABEL: 'VALUE', ... }   // ***
	
	checkbox      : [ 'LABEL', ... ]          // ***
	
	select        : { LABEL: 'VALUE', ... }   // ***
	selectlabel   : 'LABEL'                   // (blank)        (select input label)
	
	order         : [ TYPE, ... ]             // (sequence)     (order of *** inputs)
	
	values        : [ 'VALUE', ... ]          // (none)         (default values - in layout order)
	checkchanged  : 1                         // (none)         (check values changed)
	checkblank    : 1 or [ i, ... ]           // (none)         (check values not blank /  [ partial ] )
	checklength   : { i: N, . }               // (none)         (required N characters in i)
	checklength   : { i: [ N, 'COND' ], ... } // (none)         (required N: characters; COND: min, max; in i)
	
	beforeshow    : FUNCTION                  // (none)         (function after values set)
	noreload      : 1                         // (none)         (do not reset content - for update value)
	
	filelabel     : 'LABEL'                   // ***            (browse button label)
	fileoklabel   : 'LABEL'                   // 'OK'           (upload button label)
	filetype      : '.EXT, ...'               // (none)         (filter and verify filetype (with 'dot' - 'image/*' for all image types)
	
	buttonlabel   : [ 'LABEL', ... ]          // ***            (extra buttons - label array)
	button        : [ FUNCTION, ... ]         // (none)         (function array)
	buttoncolor   : [ 'COLOR', ... ]          // 'var( --cm )'  (color array)
	buttonfit     : 1                         // (none)         (fit buttons width to label)
	buttonnoreset : 1                         // (none)         (do not hide/reset content on button clicked) - player.js
	
	cancellabel   : 'LABEL'                   // ***            (cancel button label)
	cancelcolor   : 'COLOR'                   // var( --cg )    (cancel button color)
	cancelshow    : 1                         // (hide)         (show cancel button)
	cancel        : FUNCTION                  // (reset)        (cancel click function)

	okno          : 1                         // (show)         (no ok button)
	oklabel       : 'LABEL'                   // ('OK')         (ok button label)
	okcolor       : 'COLOR'                   // var( --cm )    (ok button color)
	ok            : FUNCTION                  // (reset)        (ok click function)
} );

Get values: infoVal()
Show usage: infoUsage()

Note:
- Require fa-font, Selectric.js
- Single value/function - no need to be array
` );
}
function infoReset( fn ) {
	if ( O.infoscroll ) $( 'html, body' ).scrollTop( O.infoscroll );
	setTimeout( function() {
		if ( typeof fn === 'function' ) fn();
		if ( ! O.buttonnoreset ) {
			$( '#infoOverlay' ).addClass( 'hide' );
			$( '#infoOverlay' ).empty();
		}
		delete O.infofile;
		delete O.infofilegif;
	}, 0 );
}

O = {}
function info( json ) {
	O = json;
	if ( ! O.noreload ) $( '#infoOverlay' ).html(`
<div id="infoBox">
	<div id="infoTopBg">
		<div id="infoTop"><i id="infoIcon"></i><a id="infoTitle"></a></div><i id="infoX" class="fa fa-times"></i>
	</div>
	<div id="infoContent"></div>
	<div id="infoButtons"></div>
</div>
` );
	O.infoscroll = $( window ).scrollTop();
	
/*	$( '#infoOverlay' ).on( 'mousedown touchstart', function( e ) {
		if ( e.target.id === 'infoOverlay' ) $( '#infoX' ).click();
	} );*/
	
	$( '#infoX' ).click( function() {
		delete O.buttonnoreset;
		infoReset( O.cancel );
	} );
	if ( typeof O !== 'object' ) {
		$( '#infoIcon' ).addClass( 'fa fa-info-circle' );
		$( '#infoTitle' ).text( 'Info' );
		$( '#infoContent' ).prepend( '<p class="message">'+ O +'</p>' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		$( 'html, body' ).scrollTop( 0 );
		return;
	}
	
	// title
	if ( O.width ) $( '#infoBox' ).css( 'width', O.width );
	if ( O.height ) $( '#infoContent' ).css( 'height', O.height );
	if ( O.icon ) {
		if ( O.icon.charAt( 0 ) !== '<' ) {
			$( '#infoIcon' ).addClass( 'fa fa-'+ O.icon );
		} else {
			$( '#infoIcon' ).html( O.icon );
		}
	} else {
		$( '#infoIcon' ).addClass( 'fa fa-help' );
	}
	var title = O.title || 'Information';
	$( '#infoTitle' ).html( title );
	
	// buttons
	var htmlbutton = '';
	if ( O.button ) {
		if ( typeof O.button !== 'object' ) O.button = [ O.button ];
		if ( typeof O.buttonlabel !== 'object' ) O.buttonlabel = [ O.buttonlabel ];
		if ( 'buttoncolor' in O && typeof O.buttoncolor !== 'object' ) O.buttoncolor = [ O.buttoncolor ];
		var iL = O.button.length;
		for ( i = 0; i < iL; i++ ) {
			htmlbutton += O.buttoncolor ? '<a style="background-color:'+ O.buttoncolor[ i ] +'"' : '<a';
			htmlbutton += ' class="infobtn extrabtn infobtn-primary">'+ O.buttonlabel[ i ] +'</a>';
		}
	}
	if ( O.cancelshow || O.cancellabel || O.cancelcolor ) {
		var color   = O.cancelcolor ? ' style="background-color:'+ O.cancelcolor +'"' : '';
		htmlbutton += '<a id="infoCancel"'+ color +' class="infobtn infobtn-default">'+ ( O.cancellabel || 'Cancel' ) +'</a>';
	}
	if ( ! O.okno ) {
		var color = O.okcolor ? ' style="background-color:'+ O.okcolor +'"' : '';
		htmlbutton += '<a id="infoOk"'+ color +' class="infobtn infobtn-primary">'+ ( O.oklabel || 'OK' ) +'</a>';
	}
	if ( htmlbutton ) {
		$( '#infoButtons' )
			.html( htmlbutton )
			.removeClass( 'hide' );
	} else {
		$( '#infoButtons' ).remove();
	}
	if ( O.button ) {
		if ( typeof O.button !== 'object' ) O.button = [ O.button ];
		$( '#infoButtons' ).on( 'click', '.extrabtn', function() {
			infoReset( O.button[ $( this ).index( '.extrabtn' ) ] );
		} );
	}
	$( '#infoCancel' ).one( 'click', function() {
		infoReset( O.cancel );
	} );
	$( '#infoOk' ).one( 'click', function() {
		infoReset( O.ok );
	} );
	if ( O.fileoklabel ) {
		var htmlfile = '<div id="infoFile">'
					  +'<code id="infoFilename" class="hide"></code>'
					  +'<input type="file" class="hide" id="infoFileBox"'
					  + ( O.filetype ? ' accept="'+ O.filetype +'">' : '>' )
					  +'</div>'
					  +'<a id="infoFileLabel" class="infobtn file infobtn-primary">'
					  + ( O.filelabel || '<i class="fa fa-folder-open"></i>File' ) +'</a>';
		$( '#infoButtons' ).prepend( htmlfile )
		$( '#infoOk' )
			.html( O.fileoklabel )
			.addClass( 'hide' );
		$( '#infoFileLabel' ).click( function() {
			$( '#infoFileBox' ).click();
		} );
		$( '#infoFileBox' ).change( function() {
			if ( ! this.files.length ) return
			
			O.infofile    = this.files[ 0 ];
			var filename  = O.infofile.name;
			var typeimage = O.infofile.type.slice( 0, 5 ) === 'image';
			O.filechecked = 1;
			if ( O.filetype ) {
				if ( O.filetype === 'image/*' ) {
					O.filechecked = typeimage;
				} else {
					var ext = filename.includes( '.' ) ? filename.split( '.' ).pop() : 'none';
					O.filechecked = O.filetype.includes( ext );
				}
			}
			if ( ! O.filechecked ) {
				var htmlprev = $( '#infoContent' ).html();
				$( '#infoFilename, #infoFileLabel' ).addClass( 'hide' );
				$( '#infoContent' ).html( '<table><tr><td>Selected file :</td><td><code>'+ filename +'</code></td></tr>'
										 +'<tr><td>File not :</td><td><code>'+ O.filetype +'</code></td></tr></table>' );
				$( '#infoOk' ).addClass( 'hide' );
				$( '.infobtn.file' ).addClass( 'infobtn-primary' )
				$( '#infoButtons' ).prepend( '<a class="btntemp infobtn infobtn-primary">OK</a>' );
				$( '#infoButtons' ).one( 'click', '.btntemp', function() {
					$( '#infoContent' ).html( htmlprev );
					infoSetValues();
					$( this ).remove();
					$( '#infoFileLabel' ).removeClass( 'hide' );
					$( '.infoimgnew, .infoimgwh' ).remove();
					$( '.infoimgname' ).removeClass( 'hide' );
				} );
			} else {
				$( '#infoFilename' ).text( filename );
				$( '#infoFilename, #infoOk' ).removeClass( 'hide' );
				$( '.extrabtn' ).addClass( 'hide' );
				$( '.infobtn.file' ).removeClass( 'infobtn-primary' )
				if ( typeimage ) setFileImage();
			}
		} );
	}
	
	if ( O.tab ) {
		$( '#infoTab' ).remove();
		htmltab      = '<div id="infoTab">';
		O.tab.forEach( function( l ) {
			htmltab += '<a>'+ l +'</a>';
		} );
		htmltab += '</div>';
		$( '#infoTopBg' ).after( htmltab );
		$( '#infoTab a' ).click( function() {
			if ( ! $( this ).hasClass( 'active' ) ) O.tabfunction[ $( this ).index() ]();
		} );
		$( '#infoTab a' )
			.css( 'width', 100 / O.tab.length +'%' )
			.eq( O.tabactive ).addClass( 'active' );
	}
	if ( O.content ) {
		// custom html content
		var htmlcontent = O.content;
	} else {
		var htmls = {}
		if ( O.message ) {
			htmls.message  = '<div class="infomessage"';
			if ( O.messagealign ) htmls.message += ' style="text-align:'+ O.messagealign +'"';
			htmls.message += '>'+ O.message +'</div>';
		}
		if ( O.footer ) {
			htmls.footer  = '<div class="infofooter"';
			if ( O.footeralign ) htmls.footer += ' style="text-align:'+ O.footeralign +'"';
			htmls.footer += '>'+ O.footer +'</div>';
		}
		// inputs html ///////////////////////////////////////////////////////////
		if ( O.textlabel ) {
			if ( typeof O.textlabel !== 'object' ) O.textlabel = [ O.textlabel ];
			htmls.text      = '';
			O.textlabel.forEach( function( lbl ) {
				htmls.text += '<tr><td>'+ lbl +'</td><td><input type="text"></td></tr>';
			} );
		}
		if ( O.passwordlabel ) {
			if ( typeof O.passwordlabel !== 'object' ) O.passwordlabel = [ O.passwordlabel ];
			htmls.password      = '';
			O.passwordlabel.forEach( function( lbl ) {
				htmls.password += '<tr><td>'+ lbl +'</td><td><input type="password"></td><td><i class="fa fa-eye fa-lg"></i></td></tr>';
			} );
		}
		if ( O.textarea ) {
			htmls.textarea = '<textarea></textarea>';
		}
		var td0 = htmls.text || htmls.password ? '<td></td>' : '';
		if ( O.radio ) { // single set only
			var line;
			var i       = 0;
			htmls.radio = '';
			$.each( O.radio, function( lbl, val ) {
				line = '<td>'+ ( lbl ? '<label><input type="radio" name="inforadio" value="'+ val +'">'+ lbl +'</label>' : '' ) +'</td>';
				if ( ! O.radiocolumn ) {
					htmls.radio += '<tr>'+ td0 + line +'</tr>';
				} else {
					i++
					if ( i % 2 ) {
						htmls.radio += '<tr>'+ td0 + line;
						return
					} else {
						htmls.radio += line +'</tr>';
					}
				}
			} );
			if ( ! O.values ) O.values = [ '' ];
		}
		if ( O.checkbox ) {
			var line;
			var i          = 0;
			htmls.checkbox = '';
			O.checkbox.forEach( function( lbl ) {
				line = '<td>'+ ( lbl ? '<label><input type="checkbox">'+ lbl +'</label>' : '' ) +'</td>';
				if ( ! O.checkcolumn ) {
					htmls.checkbox += '<tr>'+ td0 + line +'</tr>';
				} else {
					i++
					if ( i % 2 ) {
						htmls.checkbox += '<tr>'+ td0 + line;
						return
					} else {
						htmls.checkbox += line +'</tr>';
					}
				}
			} );
		}
		if ( O.select ) {
			if ( typeof O.select !== 'object' ) {
				htmls.select      = O.select;
			} else {
				htmls.select      = '<tr><td>'+ O.selectlabel +'</td><td><select>';
				$.each( O.select, function( key, val ) {
					htmls.select += '<option value="'+ val.toString().replace( /"/g, '&quot;' ) +'">'+ key +'</option>';
				} );
			}
			htmls.select += '</select></td></tr>';
		}
		if ( O.rangevalue ) {
			htmls.range = '<div id="infoRange">'
						 +'<div class="value">'+ O.rangevalue +'</div>'
						 +'<a class="min">0</a><input type="range" min="0" max="100" value="'+ +O.rangevalue +'"><a class="max">100</a></div>';
		}
		var htmlcontent = '';
		htmlcontent    += htmls.tab || '';
		htmlcontent    += htmls.message || '';
		if ( ! O.order ) O.order = [ 'text', 'password', 'textarea', 'radio', 'checkbox', 'select' ];
		var htmlinputs  = '';
		O.order.forEach( function( type ) {
			if ( type in htmls ) htmlinputs += htmls[ type ];
		} );
		if ( htmlinputs ) htmlcontent += '<table>'+ htmlinputs +'</table>';
		htmlcontent   += htmls.range || '';
		htmlcontent   += htmls.footer || '';
	}
	$( 'html, body' ).scrollTop( 0 );
	if ( ! htmlcontent ) {
		$( '#infoButtons' ).css( 'padding', '0 0 20px 0' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		setButtonWidth();
		return
	}
	
	// populate layout //////////////////////////////////////////////////////////////////////////////
	$( '#infoContent' ).html( htmlcontent ).promise().done( function() {
		$( '#infoContent input:text' ).prop( 'spellcheck', false );
		// get all input fields - omit .selectric-input for select
		$inputs_txt = $( '#infoContent' ).find( 'input:text, input:password, textarea' );
		var $input  = $( '#infoContent' ).find( 'input:not( .selectric-input ), select, textarea' );
		var name, nameprev;
		O.inputs    = $input.filter( function() { // filter each radio per group ( multiple inputs with same name )
		name        = this.name;
			if ( ! name ) {
				return true
			} else if (	name !== nameprev ) {
				nameprev = name;
				return true
			}
		} );
		// assign values
		if ( 'values' in O && O.values !== '' ) infoSetValues();
		
		$( '#infoOverlay' )
			.removeClass( 'hide' )
			.attr( 'tabindex', -1 ); // for keyup event
		if ( 'focus' in O ) {
			$( '#infoContent' ).find( 'input:text, input:password').eq( O.focus ).focus();
		} else {
			$( '#infoOverlay' ).focus();
		}
		if ( $( '#infoBox' ).height() > window.innerHeight - 10 ) $( '#infoBox' ).css( { top: '5px', transform: 'translateY( 0 )' } );
		setButtonWidth();
		// set width: text / password / textarea
		if ( O.boxwidth ) {
			var widthmax = O.boxwidth === 'max';
			if ( widthmax ) $( '#infoBox' ).css( 'width', 600 );
			var allW = $( '#infoContent' ).width();
			var labelW = $( '#infoContent td:first-child' ).width() || 0;
			O.boxW = ( widthmax ? allW - labelW - 20 : O.boxwidth );
		} else {
			O.boxW = 230;
		}
		$( '#infoContent' ).find( 'input:text, input:password, textarea, select' ).parent().css( 'width', O.boxW );
		if ( $( '#infoContent select' ).length ) selectricRender(); // render selectric to set width
		var $tdfirst = $( '#infoContent td:first-child' );
		var tdL      = $( '#infoContent tr:eq( 0 ) td' ).length;
		if ( $tdfirst.find( 'input' ).length ) { // radio / checkbox
			$tdfirst.css( 'padding-right', tdL > 1 ? 10 : 0 );
		} else { // label - text input
			$tdfirst.css( {
				  'padding-right' : tdL > 1 ? 5 : 0
				, 'text-align'    : tdL > 1 ? 'right' : 'left'
			} );
		}
		if ( ( O.messagealign || O.footeralign ) && $( '#infoContent table' ) ) {
			var tblW = $( '#infoContent table' ).width();
			$( '#infoContent' ).find( '.infomessage, .infofooter' ).css( 'width', tblW );
		}
		if ( O.rangevalue ) {
			$( '#infoRange input' ).on( 'click input keyup', function() {
				$( '#infoRange .value' ).text( $( this ).val() );
			} );
		}
		// custom function before show
		if ( O.beforeshow ) O.beforeshow();
		if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( '#infoContent a' ).removeAttr( 'href' );
	} );
	$( '#infoContent' ).on( 'click', '.fa-eye', function() {
		var $this = $( this );
		var $pwd  = $this.parent().prev().find( 'input' );
		if ( $pwd.prop( 'type' ) === 'text' ) {
			$this.removeClass( 'bl' );
			$pwd.prop( 'type', 'password' );
		} else {
			$this.addClass( 'bl' );
			$pwd.prop( 'type', 'text' );
		}
	} );
	// check inputs: blank / length / change
	if ( O.checkblank ) {
		if ( typeof O.checkblank !== 'object' ) O.checkblank = [ ...Array( $inputs_txt.length ).keys() ];
		checkBlank();
	} else {
		O.blank = false;
	}
	if ( O.checklength ) {
		checkLength();
	} else {
		O.short = false;
	}
	O.nochange = O.values && O.checkchanged ? true : false;
	$( '#infoOk' ).toggleClass( 'disabled', O.blank || O.short || O.nochange ); // initial check
	infoCheckSet();
}

function checkBlank() {
	if ( ! O.checkblank ) return // suppress error on repeating
	
	O.blank = false;
	O.blank = O.checkblank.some( function( i ) {
		if ( $inputs_txt.eq( i ).val().trim() === '' ) return true
	} );
}
function checkLength() {
	O.short = false;
	$.each( O.checklength, function( k, v ) {
		if ( typeof v !== 'object' ) {
			var L    = v
			var cond = 'equal';
		} else {
			var L    = v[ 0 ];
			var cond = v[ 1 ];
		}
		var diff = O.inputs.eq( k ).val().trim().length - L;
		if ( ( cond === 'equal' && diff !== 0 ) || ( cond === 'min' && diff < 0 ) || ( cond === 'max' && diff > 0 ) ) {
			O.short = true;
			return false
		}
	} );
}
function infoCheckSet() {
	if ( O.checkblank || O.checklength || O.checkchanged ) {
		$inputs_txt.on( 'keyup paste cut', function() {
			if ( O.checkblank ) setTimeout( checkBlank, 0 ); // ios: wait for value
			if ( O.checklength ) setTimeout( checkLength, 25 );
			if ( O.checkchanged ) {
				var prevval = O.values.join( '' );
				var values  = infoVal();
				var val     = O.values.length > 1 ? values.join( '' ) : values; // single value cannot be joined
				O.nochange  = prevval === val;
			}
			setTimeout( function() { // ios: force after checkLength
				$( '#infoOk' ).toggleClass( 'disabled', O.blank || O.short || O.nochange );
			}, 50 );
		} );
	}
	if ( O.checkchanged ) {
		$( '#infoContent' ).find( 'input:radio, input:checkbox, select' ).on( 'change', function() {
			var values = O.values.length > 1 ? infoVal() : [ infoVal() ];
			O.nochange = O.values.join( '' ) === values.join( '' );
			$( '#infoOk' ).toggleClass( 'disabled', O.nochange );
		} );
	}
}
function infoSetValues() {
	if ( typeof O.values !== 'object' ) O.values = [ O.values ];
	var $this, type, val;
	O.inputs.each( function( i, e ) {
		$this = $( e );
		type  = $this.prop( 'type' );
		val   = O.values[ i ];
		if ( type === 'radio' ) { // reselect radio by name
			$( '#infoContent input:radio[name='+ this.name +']' ).val( [ val ] );
		} else if ( type === 'checkbox' ) {
			$this.prop( 'checked',  val );
		} else { // text, password, textarea, select
			$this.val( val );
		}
	} );
}
function infoVal() {
	var values = [];
	var $this, type, name, val, n;
	var i      = 0;
	O.textarea = 0;
	O.inputs.each( function() {
		$this = $( this );
		type  = $this.prop( 'type' );
		val   = '';
		switch ( type ) {
			case 'radio': // radio has only single checked - skip unchecked inputs
				val = $( '#infoContent input:radio[name='+ this.name +']:checked' ).val();
				if ( val === 'true' ) { val = true; } else if ( val === 'false' ) { val = false; }
				break;
			case 'checkbox':
				val = $this.prop( 'checked' );
				break;
			case 'textarea':
				O.textarea = 1;
				val = $this.val().trim().replace( /\n/g, '\\n' );
				break;
			case 'password':
				val = $this.val().trim().replace( /(["&()\\])/g, '\$1' ); // escape extra characters
				break;
			case 'text':
				val = $this.val().trim();
				break;
			default:
				val = $this.val();
		}
		values.push( val );
	} );
	if ( values.length > 1 ) {
		return values
	} else {
		return values[ 0 ]
	}
}
function selectricRender() {
	$( 'select' ).selectric( { disableOnMobile: false, nativeOnMobile: false } );
	$( 'select' ).each( function() {
		if ( $( this ).find( 'option' ).length === 1 ) $( this ).parents( '.selectric-wrapper' ).addClass( 'disabled' );
	} );
	$( '.selectric-input' ).prop( 'readonly', navigator.maxTouchPoints > 0 ); // suppress soft keyboard
}
function setButtonWidth() {
	if ( O.buttonfit ) return
	
	var widest = 0;
	$( '#infoButtons a' ).each( function() {
		var w = $( this ).outerWidth();
		if ( w > widest ) widest = w;
	} );
	if ( widest > 70 ) $( '.infobtn, .filebtn' ).css( 'min-width', widest );
}
function setFileImage() {
	delete O.infofilegif;
	G.timeoutfile = setTimeout( function() {
		banner( 'refresh blink', 'Change Image', 'Load ...', -1 );
	}, 1000 );
	G.rotate      = 0;
	$( '.infoimgname' ).addClass( 'hide' );
	$( '.infoimgnew, .infoimgwh' ).remove();
	if ( O.infofile.name.slice( -3 ) !== 'gif' ) {
		setFileImageReader();
	} else { // animated gif or not
		var formdata = new FormData();
		formdata.append( 'cmd', 'giftype' );
		formdata.append( 'file', O.infofile );
		$.ajax( {
			  url         : 'cmd.php'
			, type        : 'POST'
			, data        : formdata
			, processData : false
			, contentType : false
			, success     : function( animatedtmpfile ) {
				if ( ! animatedtmpfile ) {
					setFileImageReader();
				} else {
					O.infofilegif = animatedtmpfile;
					var img    = new Image();
					img.src    = URL.createObjectURL( O.infofile );
					img.onload = function() {
						var imgW   = img.width;
						var imgH   = img.height;
						var resize = setFileImageResize( 'gif', imgW, imgH );
						setFileImageRender( img.src, imgW +' x '+ imgH, resize ? resize.wxh : '' );
						clearTimeout( G.timeoutfile );
						bannerHide();
					}
				}
			}
		} );
	}
}
function setFileImageReader() {
	var maxsize   = ( G.library && ! G.librarylist ) ? 200 : 1000;
	var reader    = new FileReader();
	reader.onload = function( e ) {
		var img    = new Image();
		img.src    = e.target.result;
		img.onload = function() {
			var imgW          = img.width;
			var imgH          = img.height;
			var filecanvas    = document.createElement( 'canvas' );
			var ctx           = filecanvas.getContext( '2d' );
			filecanvas.width  = imgW;
			filecanvas.height = imgH;
			ctx.drawImage( img, 0, 0 );
			var resize = setFileImageResize( 'jpg', imgW, imgH );
			if ( resize ) {
				var canvas    = document.createElement( 'canvas' );
				canvas.width  = resize.w;
				canvas.height = resize.h;
				pica.resize( filecanvas, canvas, picaOption ).then( function() {
					setFileImageRender( canvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH, resize.wxh );
				} );
			} else {
				setFileImageRender( filecanvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH );
			}
			clearTimeout( G.timeoutfile );
			bannerHide();
		}
	}
	reader.readAsDataURL( O.infofile );
	$( '#infoContent' )
		.off( 'click', '.infoimgnew' )
		.on( 'click', '.infoimgnew', function() {
		if ( ! $( '.infomessage .rotate' ).length ) return
		
		G.rotate     += 90;
		if ( G.rotate === 360 ) G.rotate = 0;
		var canvas    = document.createElement( 'canvas' );
		var ctx       = canvas.getContext( '2d' );
		var image     = $( this )[ 0 ];
		var img       = new Image();
		img.src       = image.src;
		img.onload    = function() {
			ctx.drawImage( image, 0, 0 );
		}
		var w         = img.width;
		var h         = img.height;
		var cw        = Math.round( w / 2 );
		var ch        = Math.round( h / 2 );
		canvas.width  = h;
		canvas.height = w;
		ctx.translate( ch, cw );
		ctx.rotate( Math.PI / 2 );
		ctx.drawImage( img, -cw, -ch );
		image.src     = canvas.toDataURL( 'image/jpeg' );
	} );
}
function setFileImageRender( src, original, resize ) {
	$( '.infomessage .imgnew' ).remove();
	$( '.infomessage' ).append(
		 '<span class="imgnew">'
			+'<img class="infoimgnew" src="'+ src +'">'
			+'<div class="infoimgwh">'
			+ ( resize ? resize : '' )
			+ ( original ? '<br>original: '+ original : '' )
			+'</div>'
			+ ( src.slice( 0, 4 ) === 'blob' ? '' : '<br><i class="fa fa-redo rotate"></i>&ensp;Tap to rotate' )
		+'</span>'
	);
}
function setFileImageResize( ext, imgW, imgH ) {
	var maxsize = ( G.library && ! G.librarylist ) ? 200 : ( ext === 'gif' ? 600 : 1000 );
	if ( imgW > maxsize || imgH > maxsize ) {
		var w = imgW > imgH ? maxsize : Math.round( imgW / imgH * maxsize );
		var h = imgW > imgH ? Math.round( imgH / imgW * maxsize ) : maxsize;
		return {
			  w   : w
			, h   : h
			, wxh : w +' x '+ h
		}
	}
}

// verify password - called from addons.js ///////////////////////////////////////
function verifyPassword( title, pwd, fn ) {
	if ( ! title ) return
	
	info( {
		  title         : title
		, message       : 'Please retype'
		, passwordlabel : 'Password'
		, ok            : function() {
			if ( infoVal() === pwd ) {
				fn();
			} else {
				info( {
					  title   : title
					, message : 'Passwords not matched. Please try again.'
					, ok      : function() {
						verifyPassword( title, pwd, fn )
					}
				} );
			}
		}
	} );
}
