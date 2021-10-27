// $.fn.press(), info(), banner()

// $.fn.press(), $fn.swipe() --------------------------------------------------------
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
	if ( !arg2 ) {
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
// banner -----------------------------------------------------------------------------
$( 'body' ).prepend( `
<div id="infoOverlay" class="hide" tabindex="1">
	<div id="infoBox">
		<div id="infoTopBg">
			<div id="infoTop"><i id="infoIcon"></i><a id="infoTitle"></a></div><i id="infoX" class="fa fa-times"></i>
		</div>
		<div id="infoContent"></div>
		<div id="infoButtons"></div>
	</div>
</div>
<div id="banner" class="hide">
	<div id="bannerIcon"></div>
	<div id="bannerTitle"></div>
	<div id="bannerMessage"></div>
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
	if ( key == 'Enter' ) {
		if ( !$( 'textarea' ).is( ':focus' ) ) $( '#infoOk' ).click();
	} else if ( key === 'Escape' ) {
		G.local = 1; // prevent toggle setting menu
		setTimeout( function() { G.local = 0 }, 300 );
		$( '#infoX' ).click();
	} else if ( key === 'ArrowLeft' || key === 'ArrowRight' ) {
		var rl = key === 'ArrowLeft' ? 'left' : 'right';
		$( '#infoArrow .fa-arrow-'+ rl ).click();
	}
} );
$( '#infoContent' ).click( function() {
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} );

function banner( title, message, icon, delay ) {
	clearTimeout( G.timeoutbanner );
	var iconhtml = icon && icon.slice( 0, 1 ) === '<' 
					? icon 
					: icon ? '<i class="fa fa-'+ ( icon ) +'"></i>' : '';
	$( '#bannerIcon' ).html( iconhtml );
	$( '#bannerTitle' ).html( title );
	$( '#bannerMessage' ).html( message );
	$( '#banner' ).removeClass( 'hide' );
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
		.removeAttr( 'style' );
	$( '#bannerIcon, #bannerTitle, #bannerMessage' ).empty();
}
// ------------------------------------------------------------------------------------
function infoUsage() {
	console.log( `
===============================
| icon | title                |
|      |----------------------|
|      | message              |
===============================

banner( 'title', 'message', 'icon', delayms )


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
	
	arrowright    : FUNCTION                  // (none)         (switch between multiple infos)
	arrowleft     : FUNCTION                  // (none)
	
	content       : 'HTML'                    // ***            (custom html <table> input content)
	height        : N                         // (fit)          (infocontent height)
	
	message       : 'MESSAGE'                 // (blank)        (message under title)
	messagealign  : 'CSS'                     // 'center'
	footer        : 'FOOTER'                  // (blank)        (footer above buttons)
	footeralign   : 'CSS'                     // (blank)
	
	textlabel     : [ 'LABEL', ... ]          // ***            (label array input label)
	textalign     : 'CSS'                     // 'left'         (input text alignment)
	
	passwordlabel : 'LABEL'                   // (blank)        (password input label)
	
	textarea      : 1                         // ***
	
	boxwidth      : N                         // 200            (input text/password width - 'max' to fit)
	
	radio         : { LABEL: 'VALUE', ... }   // ***
	
	checkbox      : [ 'LABEL', ... ]          // ***
	
	select        : { LABEL: 'VALUE', ... }   // ***
	selectlabel   : 'LABEL'                   // (blank)        (select input label)
	
	order         : [ TYPE, ... ]             // (sequence)     (order of *** inputs)
	
	filelabel     : 'LABEL'                   // ***            (browse button label)
	fileoklabel   : 'LABEL'                   // 'OK'           (upload button label)
	filetype      : '.EXT, ...'               // (none)         (filter and verify filetype (with 'dot' - 'image/*' for all image types)
	
	buttonlabel   : [ 'LABEL', ... ]          // ***            (label array)
	button        : [ FUNCTION, ... ]         // (none)         (function array)
	buttoncolor   : [ 'COLOR', ... ]          // 'var( --cm )'  (color array)
	buttonfit     : 1                         // (none)         (fit buttons width to label)
	buttonnoreset : 1                         // (none)         (do not hide/reset on button clicked)
	
	okno          : 1                         // (show)         (no ok button)
	oklabel       : 'LABEL'                   // ('OK')         (ok button label)
	okcolor       : 'COLOR'                   // var( --cm )    (ok button color)
	ok            : FUNCTION                  // (reset)        (ok click function)
	
	cancellabel   : 'LABEL'                   // ***            (cancel button label)
	cancelcolor   : 'COLOR'                   // var( --cg )    (cancel button color)
	cancelshow    : 1                         // (hide)         (show cancel button)
	cancel        : FUNCTION                  // (reset)        (cancel click function)
	
	values        : [ 'VALUE', ... ]          // (none)         (default values - in layout order)
	checkchanged  : 1                         // (none)         (check values changed)
	checkblank    : 1 or [ i, ... ]           // (none)         (check values not blank /  [ partial ] )
	checklength   : { i: N, . }               // (none)         (required N characters in i)
	checklength   : { i: [ N, 'COND' ], ... } // (none)         (required N: characters; COND: min, max; in i)
	
	beforeshow    : FUNCTION                  // (none)         (function after values set)
} );

Get values: infoVal()
Show usage: infoUsage()

Note:
- Require fa-font, Selectric.js
- Single value/function - no need to be array
` );
}
function infoReset() {
	if ( O.infoscroll ) {
		$( 'html, body' ).scrollTop( O.infoscroll );
		O.infoscroll = 0;
	}
	$( '#infoContent, #infoArrow i, #infoButtons .infobtn, #infoFileLabel' ).off( 'click' );
	$( '#infoContent input, #infoFileBox' ).off( 'change keyup paste cut' );
	$( '#infoRange input' ).off( 'click input mouseup touchend' );
	
	$( '#infoOverlay' ).addClass( 'hide' );
	$( '#infoBox' ).css( {
		  margin  : ''
		, width   : ''
	} );
	$( '#infoIcon' ).removeAttr( 'class' );
	$( '#infoIcon, #infoTitle' ).empty();
	$( '#infoX' ).removeClass( 'hide' );
	$( '#infoArrow' ).remove();
	$( '#infoContent' ).find( 'table, input, .selectric, .selectric-wrapper' ).css( 'width', '' );
	$( '#infoContent .selectric-items' ).css( 'min-width', '' );
	$( '#infoContent' ).find( 'input' ).prop( 'disabled', 0 );
	$( '#infoContent' )
		.empty()
		.css( { width: '', height: '' } )
		.removeClass( 'hide' );   // extra appended message toggle
	$( '.infomessage' ).remove(); // extra appended message toggle
	$( '.infobtn' )
		.removeClass( 'active' )
		.css( 'background-color', '' );
	$( '#infoButtons' )
		.addClass( 'hide' )
		.empty();
}

O = {}

function info( json ) {
	O = json;
	infoReset();
	O.infoscroll = $( window ).scrollTop();
	// simple use as info( 'message' )
	setTimeout( function() { // allow consecutive infos
	//////////////////////////////////////////////////////////////////////////
	$( '#infoX' ).click( function() {
		if ( O.cancel ) O.cancel();
		infoReset();
	} );
	if ( typeof O !== 'object' ) {
		$( '#infoIcon' ).addClass( 'fa fa-info-circle' );
		$( '#infoTitle' ).text( 'Info' );
		$( '#infoX' ).removeClass( 'hide' );
		$( '#infoContent' ).prepend( '<p class="message">'+ O +'</p>' );
		$( '#infoOverlay' )
			.removeClass( 'hide' )
			.focus(); // enable e.which keypress (#infoOverlay needs tabindex="1")
		$( 'html, body' ).scrollTop( 0 );
		return;
	}
	
	// switch arrows
	if ( O.arrowright ) switchRL( 'right', O.arrowright )
	if ( O.arrowleft ) switchRL( 'left', O.arrowleft )
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
		$( '#infoIcon' ).addClass( 'fa fa-question-circle' );
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
	if ( O.cancelshow ) {
		var color = O.cancelcolor ? ' style="background-color:'+ O.cancelcolor +'"' : '';
		var hide = O.cancelshow ? '' : ' hide';
		htmlbutton += '<a id="infoCancel"'+ color +' class="infobtn infobtn-default'+ hide +'">'+ ( O.cancellabel || 'Cancel' ) +'</a>';
	}
	if ( !O.okno ) {
		var color = O.okcolor ? ' style="background-color:'+ O.okcolor +'"' : '';
		htmlbutton += '<a id="infoOk"'+ color +' class="infobtn infobtn-primary">'+ ( O.oklabel || 'OK' ) +'</a>';
	}
	if ( htmlbutton ) $( '#infoButtons' )
						.html( htmlbutton )
						.removeClass( 'hide' );
	if ( O.button ) {
		if ( typeof O.button !== 'object' ) O.button = [ O.button ];
		$( '#infoButtons' )
			.on( 'click', '.infobtn.extrabtn', function() {
			var fn = O.button[ $( this ).index( '.extrabtn' ) ];
			if ( fn ) fn();
			if ( !O.buttonnoreset ) infoReset();
		} );
	}
	$( '#infoCancel' ).one( 'click', function() {
		if ( typeof O.cancel === 'function' ) O.cancel();
		infoReset();
	} );
	$( '#infoOk' ).one( 'click', function() {
		if ( typeof O.ok === 'function' ) O.ok();
		infoReset();
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
			if ( !this.files.length ) return
			
			G.infofile = this.files[ 0 ];
			var filename = G.infofile.name;
			O.filechecked = 1;
			if ( O.filetype ) {
				if ( O.filetype === 'image/*' ) {
					O.filechecked = G.infofile.type.slice( 0, 5 ) === 'image';
				} else {
					var ext = filename.indexOf( '.' ) !== -1 ? filename.split( '.' ).pop() : 'none';
					O.filechecked = O.filetype.indexOf( ext ) !== -1;
				}
			}
			if ( !O.filechecked ) {
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
				if ( O.filetype === 'image/*' ) setFileImage( G.infofile );
			}
		} );
	}
	
	if ( O.content ) {
		// custom html content
		var htmlcontent = O.content;
	} else {
		var htmls = {}
		if ( O.message ) {
			htmls.message = '<div class="infomessage"';
			if ( O.messagealign ) htmls.message += ' style="text-align:'+ O.messagealign +'"';
			htmls.message += '>'+ O.message +'</div>';
		}
		if ( O.footer ) {
			htmls.footer = '<div class="infofooter"';
			if ( O.footeralign ) htmls.footer += ' style="text-align:'+ O.footeralign +'"';
			htmls.footer += '>'+ O.footer +'</div>';
		}
		// inputs html ///////////////////////////////////////////////////////////
		if ( O.textlabel ) {
			if ( typeof O.textlabel !== 'object' ) O.textlabel = [ O.textlabel ];
			htmls.text = '';
			O.textlabel.forEach( function( lbl ) {
				htmls.text += '<tr><td>'+ lbl +'</td><td><input type="text"></td></tr>';
			} );
		}
		if ( O.passwordlabel ) {
			if ( typeof O.passwordlabel !== 'object' ) O.passwordlabel = [ O.passwordlabel ];
			htmls.password = '';
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
			var i = 0;
			htmls.radio = '';
			$.each( O.radio, function( lbl, val ) {
				line = '<td>'+ ( lbl ? '<label><input type="radio" name="inforadio" value="'+ val +'">'+ lbl +'</label>' : '' ) +'</td>';
				if ( !O.radiocolumn ) {
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
		}
		if ( O.checkbox ) {
			var line;
			var i = 0;
			htmls.checkbox = '';
			O.checkbox.forEach( function( lbl ) {
				line = '<td>'+ ( lbl ? '<label><input type="checkbox">'+ lbl +'</label>' : '' ) +'</td>';
				if ( !O.checkcolumn ) {
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
				htmls.select = O.select;
			} else {
				htmls.select = '<tr><td>'+ O.selectlabel +'</td><td><select>';
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
		var htmlcontent = htmls.message || '';
		if ( !O.order ) O.order = [ 'text', 'password', 'textarea', 'radio', 'checkbox', 'select' ];
		var htmlinputs = '';
		O.order.forEach( function( type ) {
			if ( type in htmls ) htmlinputs += htmls[ type ];
		} );
		if ( htmlinputs ) htmlcontent += '<table>'+ htmlinputs +'</table>';
		htmlcontent += htmls.range || '';
		htmlcontent += htmls.footer || '';
	}
	// populate layout //////////////////////////////////////////////////////////////////////////////
	$( '#infoContent' ).html( htmlcontent ).promise().done( function() {
		$( '#infoContent input:text' ).prop( 'spellcheck', false );
		// get all input fields - omit .selectric-input for select
		var $inputs_txt = $( '#infoContent' ).find( 'input[type=text], input[type=password], textarea' );
		var $input = $( '#infoContent' ).find( 'input:not( .selectric-input ), select, textarea' );
		var name, nameprev;
		O.inputs = $input.filter( function() { // filter each radio per group ( multiple inputs with same name )
			name = this.name;
			if ( !name ) {
				return true
			} else if (	name !== nameprev ) {
				nameprev = name;
				return true
			}
		} );
		// assign values
		if ( O.values ) infoSetValues();
		
		$( '#infoOverlay' )
			.removeClass( 'hide' )
			.focus(); // enable e.which keypress (#infoOverlay needs tabindex="1")
			
		// set width: button
		if ( !O.buttonfit ) {
			var widest = 0;
			$( '#infoButtons a' ).each( function() {
				var w = $( this ).outerWidth();
				if ( w > widest ) widest = w;
			} );
			if ( widest > 70 ) $( '.infobtn, .filebtn' ).css( 'min-width', widest );
		}
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
		$( '#infoContent' ).find( 'input:text, input:password, textarea select' ).parent().css( 'width', O.boxW );
		if ( $( '#infoContent select' ).length ) selectricRender(); // render selectric to set width
		var $tdfirst = $( '#infoContent td:first-child' );
		var tdL = $( '#infoContent tr:eq( 0 ) td' ).length;
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
		// check text input length
		O.short = false;
		if ( O.checklength ) {
			function checkLength( k, v ) {
				if ( typeof v !== 'object' ) v = [ v, 'equal' ];
				var L = v[ 0 ];
				var cond = v[ 1 ];
				var diff = O.inputs.eq( k ).val().trim().length - L;
				if ( ( cond === 'min' && diff < 0 ) || ( cond === 'max' && diff > 0 ) || ( cond === 'equal' && !diff ) ) O.short = true;
			}
			$.each( O.checklength, function( k, v ) { checkLength( k, v ) } );
			$inputs_txt.on( 'keyup paste cut', function() {
				setTimeout( function() { // paste cut on touch devices
					if ( O.blank ) return
					
					O.short = false;
					$.each( O.checklength, function( k, v ) { checkLength( k, v ) } );
					$( '#infoOk' ).toggleClass( 'disabled', O.short );
				}, 0 ); // 0-checklength > 100-checkblank > 200-checkchange
			} );
		}
		// check text input not blank
		O.blank = false;
		if ( O.checkblank ) {
			var inputall = typeof O.checkblank !== 'object';
			if ( inputall ) {
				$inputs_txt.each( function() { if ( $( this ).val() === '' ) O.blank = true } );
			} else {
				O.checkblank.forEach( function( v ) { if ( O.inputs.eq( v ).val() === '' ) O.blank = true } );
			}
			$inputs_txt.on( 'keyup paste cut', function() {
				setTimeout( function() {
					if ( O.short ) return
					
					O.blank = false;
					if ( inputall ) {
						$inputs_txt.each( function() { if ( $( this ).val().trim() === '' ) O.blank = true } );
					} else {
						O.checkblank.forEach( function( v ) { if ( O.inputs.eq( v ).val().trim() === '' ) O.blank = true } );
					}
					$( '#infoOk' ).toggleClass( 'disabled', O.blank );
				}, 25 );
			} );
		}
		$( '#infoOk' ).toggleClass( 'disabled', O.short || O.blank ); // initial
		// check changed values
		if ( O.values && O.checkchanged ) {
			setTimeout( function() { // force after check length
				if ( !O.short && !O.blank ) checkChanged();
			}, 50 );
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoContent' ).find( 'input:text, input:password, textarea' ).on( 'keyup paste cut', checkChanged );
			$( '#infoContent' ).find( 'input:radio, input:checkbox, select' ).on( 'change', checkChanged );
		}
		$( '#infoContent' ).on( 'click', '.fa-eye', function() {
			var $this = $( this );
			var $pwd = $this.parent().prev().find( 'input' );
			if ( $pwd.prop( 'type' ) === 'text' ) {
				$this.removeClass( 'bl' );
				$pwd.prop( 'type', 'password' );
			} else {
				$this.addClass( 'bl' );
				$pwd.prop( 'type', 'text' );
			}
		} );
		// custom function before show
		if ( O.beforeshow ) O.beforeshow();
		$( 'html, body' ).scrollTop( 0 );
		} );
	//////////////////////////////////////////////////////////////////////////
	}, 0 );
}

function checkChanged() {
	var values = infoVal();
	if ( typeof values !== 'object' ) values = [ values ];
	var val;
	var changed = false;
	changed = values.some( function( v, i ) {
		val = O.values[ i ];
		if ( O.textarea ) val = O.values[ i ].replace( /\n/g, '\\n' ); 
		if ( v != val ) return true
	} );
	$( '#infoOk' ).toggleClass( 'disabled', !changed );
}
function infoSetValues() {
	if ( typeof O.values !== 'object' ) O.values = [ O.values ];
	var $this, type, val;
	O.inputs.each( function( i, e ) {
		$this = $( e );
		type = $this.prop( 'type' );
		val = O.values[ i ];
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
	var i = 0;
	O.textarea = 0;
	O.inputs.each( function() {
		$this = $( this );
		type = $this.prop( 'type' );
		val = '';
		if ( type === 'radio' ) { // radio has only single checked - skip unchecked inputs
			val = $( '#infoContent input:radio[name='+ this.name +']:checked' ).val();
			if ( val === 'true' ) { val = true; } else if ( val === 'false' ) { val = false; }
		} else if ( type === 'checkbox' ) {
			val = $this.prop( 'checked' );
		} else if ( type === 'textarea' ) {
			O.textarea = 1;
			val = $this.val().trim().replace( /\n/g, '\\n' );
		} else if ( type === 'password' ) {
			val = $this.val().trim().replace( /(["&()\\])/g, '\$1' ); // escape extra characters
		} else if ( type === 'text' ) {
			val = $this.val().trim();
		} else {
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
function orientationGet( file, callback ) { // return: 1 - undefined
	var reader = new FileReader();
	reader.onload = function( e ) {
		var view = new DataView( e.target.result );
		if ( view.getUint16( 0, false ) != 0xFFD8 ) return callback( 1 ); // not jpeg
		
		var length = view.byteLength, offset = 2;
		while ( offset < length ) {
			if ( view.getUint16( offset + 2, false ) <= 8 ) return callback( 1 );
			
			var marker = view.getUint16( offset, false );
			offset += 2;
			if ( marker == 0xFFE1 ) {
				if ( view.getUint32( offset += 2, false ) != 0x45786966 ) return callback( 1 );
				
				var little = view.getUint16( offset += 6, false ) == 0x4949;
				offset += view.getUint32( offset + 4, little );
				var tags = view.getUint16( offset, little );
				offset += 2;
				for ( var i = 0; i < tags; i++ ) {
					if ( view.getUint16( offset + ( i * 12 ), little ) == 0x0112 ) {
						var ori = view.getUint16( offset + ( i * 12 ) + 8, little );
						return callback( ori );
					}
				}
			} else if ( ( marker & 0xFF00 ) != 0xFF00 ) {
				break;
			} else { 
				offset += view.getUint16( offset, false );
			}
		}
		return callback( 1 );
	};
	reader.readAsArrayBuffer( file.slice( 0, 64 * 1024 ) );
}
function orientationReset( file, ori, callback ) {
	var reader = new FileReader();
	reader.onload = function( e ) {
		var img = new Image();
		img.src = e.target.result;
		img.onload = function() {
			var imgW = img.width,
				imgH = img.height,
				canvas = document.createElement( 'canvas' ),
				ctx = canvas.getContext( '2d' );
			// set proper canvas dimensions before transform
			if ( 4 < ori && ori < 9 ) {
				canvas.width = imgH;
				canvas.height = imgW;
			} else {
				canvas.width = imgW;
				canvas.height = imgH;
			}
			// transform context before drawing image
			switch ( ori ) {
				// transform( Hscale, Hskew, Vscale, Vskew, Hmove, Vmove )
				case 2: ctx.transform( -1,  0,  0,  1, imgW,    0 ); break; // mirror up
				case 3: ctx.transform( -1,  0,  0, -1, imgW, imgH ); break; // down
				case 4: ctx.transform(  1,  0,  0, -1,    0, imgH ); break; // mirror down
				case 5: ctx.transform(  0,  1,  1,  0,    0,    0 ); break; // mirror on left side
				case 6: ctx.transform(  0,  1, -1,  0, imgH,    0 ); break; // on left side
				case 7: ctx.transform(  0, -1, -1,  0, imgH, imgW ); break; // mirror on right side
				case 8: ctx.transform(  0, -1,  1,  0,    0, imgW ); break; // on right side
				default: break;
			}
			ctx.drawImage( img, 0, 0 );
			callback( canvas, imgW, imgH );
		}
	}
	reader.readAsDataURL( file );
}
function selectricRender() {
	$( 'select' ).selectric( { disableOnMobile: false, nativeOnMobile: false } );
	$( 'select' ).each( function() {
		if ( $( this ).find( 'option' ).length === 1 ) $( this ).parents( '.selectric-wrapper' ).addClass( 'disabled' );
	} );
	$( '#infoContent' ).find( '.selectric, .selectric-wrapper' ).css( 'width', O.boxW );
/*	$( '.selectric-items' ).css( 'min-width', O.boxW );*/
	$( '.selectric-input' ).prop( 'readonly', true ); // suppress soft keyboard
}function setFileImage( file ) {
	var timeout = setTimeout( function() {
		banner( 'Change Image', 'Load ...', 'coverart blink', -1 );
	}, 1000 );
	G.rotate = 0;
	$( '.infoimgname' ).addClass( 'hide' );
	$( '.infoimgnew, .infoimgwh' ).remove();
	if ( file.name.slice( -3 ) === 'gif' ) {
		var img = new Image();
		img.onload = function() {
			$( '.infomessage' ).append(
				 '<img class="infoimgnew" src="'+ URL.createObjectURL( file ) +'">'
				+'<div class="infoimgwh"><span>'+ this.width +' x '+ this.height +'</span></div>'
			);
			clearTimeout( timeout );
			bannerHide();
		}
		img.src = URL.createObjectURL( file );
		return
	}
	orientationGet( file, function( ori ) {
		orientationReset( file, ori, function( filecanvas, imgW, imgH ) {
			var maxsize = ( G.library && !G.librarylist ) ? 200 : 1000;
			var htmlrotate = '<br><i class="fa fa-redo"></i>&ensp;Tap to rotate</span></div>';
			if ( imgW > maxsize || imgH > maxsize ) {
				if ( imgW > imgH ) {
					pxW = maxsize;
					pxH = Math.round( imgH / imgW * maxsize );
				} else {
					pxH = maxsize;
					pxW = Math.round( imgW / imgH * maxsize );
				}
				var canvas = document.createElement( 'canvas' );
				canvas.width = pxW;
				canvas.height = pxH;
				pica.resize( filecanvas, canvas, picaOption ).then( function() {
					var resizedimg = canvas.toDataURL( 'image/jpeg' ); // canvas -> base64
					$( '.infomessage' ).append(
						 '<img class="infoimgnew" src="'+ resizedimg +'">'
						+'<div class="infoimgwh"><span>'+ pxW +' x '+ pxH
						+'<br>original: '+ imgW +' x '+ imgH
						+ htmlrotate
					);
					clearTimeout( timeout );
					bannerHide();
				} );
			} else {
				$( '.infomessage' ).append( 
					 '<img class="infoimgnew" src="'+ filecanvas.toDataURL( 'image/jpeg' ) +'">'
					+'<div class="infoimgwh"><span>'+ imgW +' x '+ imgH
					+ htmlrotate
				);
				clearTimeout( timeout );
				bannerHide();
			}
		} );
	} );
	$( '#infoContent' ).off( 'click', '.infoimgnew' );
	$( '#infoContent' ).on( 'click', '.infoimgnew', function() {
		G.rotate += 90;
		if ( G.rotate === 360 ) G.rotate = 0;
		var canvas = document.createElement( 'canvas' );
		var ctx = canvas.getContext( '2d' );
		var image = $( this )[ 0 ];
		var img = new Image();
		img.onload = function() {
			ctx.drawImage( image, 0, 0 );
		}
		img.src = image.src;
		var w = img.width;
		var h = img.height;
		var cw = Math.round( w / 2 );
		var ch = Math.round( h / 2 );
		canvas.width = h;
		canvas.height = w;
		ctx.translate( ch, cw );
		ctx.rotate( Math.PI / 2 );
		ctx.drawImage( img, -cw, -ch );
		image.src = canvas.toDataURL( 'image/jpeg' );
	} );
}
function switchRL( rl, fn ) {
	$( '#infoContent' ).before( '<div id="infoArrow"><i class="fa fa-arrow-'+ rl +'"></i></div>' );
	$( '#infoArrow i' ).on( 'click', function() {
		fn();
		$( '#infoOverlay' ).removeClass( 'hide' ); // keep background on switch info
	} );
}

// verify password - called from addons.js ///////////////////////////////////////
function verifyPassword( title, pwd, fn ) {
	if ( !title ) return
	
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
