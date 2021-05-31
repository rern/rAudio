/*
simple usage: 
info( 'message' );

normal usage:
info( {                                     // default
	width         : N                       // 400            (infocontent width)
	height        : N                       // (fit)          (infocontent height)
	icon          : 'NAME'                  // 'question'     (top icon)
	title         : 'TITLE'                 // 'Information'  (top title)
	nox           : 1                       // (show)         (no top 'X' close button)
	autoclose     : N                       // (disabled)     (auto close in ms)
	
	arrowright    : FUNCTION                // (none)         (switch between multiple infos)
	arrowleft     : FUNCTION                // (none)
	
	content       : 'HTML'                  // ***            (custom inputs content)
	message       : 'MESSAGE'               // (blank)        (message under title)
	messagealign  : 'CSS'                   // 'center'
	footer        : 'FOOTER'                // (blank)        (footer above buttons)
	footeralign   : 'CSS'                   // (blank)
	
	textlabel     : [ 'LABEL', ... ]        // ***            (label array input label)
	textalign     : 'CSS'                   // 'left'         (input text alignment)
	
	passwordlabel : 'LABEL'                 // (blank)        (password input label)
	
	textarea      : 1                       // ***
	
	boxwidth      : N                       // 200            (input text/password width - 'max' to fit)
	nofocus       : 1                       // (input box)    (no focus at input box)
	
	radio         : { LABEL: 'VALUE', ... } // ***
	
	checkbox      : [ 'LABEL', ... ]        // ***
	
	select        : { LABEL: 'VALUE', ... } // ***
	selectlabel   : 'LABEL'                 // (blank)        (select input label)
	
	order         : [ TYPE, ... ]           // (sequence)     (order of *** inputs)
	
	filelabel     : 'LABEL'                 // ***            (browse button label)
	fileoklabel   : 'LABEL'                 // 'OK'           (upload button label)
	filetype      : '.EXT, ...'             // (none)         (filter and verify filetype (with 'dot' - 'image/*' for all image types)
	
	nook          : 1                       // (show)         (no ok button)
	oklabel       : 'LABEL'                 // ('OK')         (ok button label)
	okcolor       : 'COLOR'                 // var( --cm )    (ok button color)
	ok            : FUNCTION                // (reset)        (ok click function)
	cancellabel   : 'LABEL'                 // ***            (cancel button label)
	cancelcolor   : 'COLOR'                 // var( --cg )    (cancel button color)
	cancelshow    : 1                       // (hide)         (show cancel button)
	cancel        : FUNCTION                // (reset)        (cancel click function)
	
	buttonlabel   : [ 'LABEL', ... ]        // ***            (label array)
	button        : [ FUNCTION, ... ]       // (none)         (function array)
	buttoncolor   : [ 'COLOR', ... ]        // '#34495e'      (color array)
	buttonfit     : 1                       // (none)         (fit buttons width to label)
	buttonnoreset : 1                       // (none)         (do not hide/reset on button clicked)
	
	values        : [ 'VALUE', ... ]        // (none)         (default values - in layout order)
	checkblank    : [ i, ... ]              // (none)         (required text in 'i' of all inputs)
	checklength   : { i: N, ... }           // (none)         (required min N characters in 'i')
	checkchanged  : 1              .        // (none)         (check values changed)
	
	beforeshow    : FUNCTION                // (none)         (function after values set)
} );

Note:
- Single value/function - no need to be array
- select requires Selectric.js
- Get values - infoVal()
*/

function heredoc( fn ) {
	return fn.toString().match( /\/\*\s*([\s\S]*?)\s*\*\//m )[ 1 ];
};
var containerhtml = heredoc( function() { /*
<div id="infoOverlay" class="hide" tabindex="1">
	<div id="infoBox">
		<div id="infoTopBg">
			<div id="infoTop">
				<i id="infoIcon"></i><a id="infoTitle"></a>
			</div>
			<i id="infoX" class="fa fa-times"></i>
		</div>
		<div id="infoContent"></div>
		<div id="infoButtons"></div>
	</div>
</div>
*/ } );
$( 'body' ).prepend( containerhtml );

$( '#infoOverlay' ).keydown( function( e ) {
	var key = e.key;
	if ( key == 'Enter' ) {
		if ( !$( 'textarea' ).is( ':focus' ) ) $( '#infoOk' ).click();
	} else if ( key === 'Escape' ) {
		G.local = 1; // no local() in settings
		setTimeout( function() { G.local = 0 }, 300 );
		$( '#infoX' ).click();
	}
} );
$( '#infoContent' ).click( function() {
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} );
$( '#infoContent' ).on( 'click', '.fa-eye', function() {
	var $this = $( this );
	var $pwd = $this.prev();
	if ( $this.prev().prop( 'type' ) === 'text' ) {
		$this.removeClass( 'eyeactive' );
		$pwd.prop( 'type', 'password' );
	} else {
		$this.addClass( 'eyeactive' );
		$pwd.prop( 'type', 'text' );
	}
} );

function infoReset() {
	if ( O.infoscroll ) {
		$( 'html, body' ).scrollTop( O.infoscroll );
		O.infoscroll = 0;
	}
	$( '#infoOverlay' ).addClass( 'hide noclick' ) // prevent click OK on consecutive info
	$( '#infoBox' ).css( {
		  margin     : ''
		, width      : ''
		, visibility : 'hidden'
	} );
	$( '#infoIcon' ).removeAttr( 'class' );
	$( '#infoTitle' ).empty();
	$( '#infoX' ).removeClass( 'hide' );
	$( '#infoArrow i' ).off( 'click' );
	$( '#infoArrow' ).remove();
	$( '#infoContent' ).find( 'table, input, .selectric, .selectric-wrapper' ).css( 'width', '' );
	$( '#infoContent .selectric-items' ).css( 'min-width', '' );
	$( '#infoContent' ).find( 'input, select, textarea' ).off( 'keyup change' ).prop( 'disabled', 0 );
	$( '#infoContent' ).find( 'td' ).off( 'click' );
	$( '#infoContent' ).empty().css( 'height', '' );
	$( '.infobtn' )
		.removeClass( 'active' )
		.css( 'background-color', '' )
		.off( 'click' );
	$( '#infoButtons' ).empty();
}

O = {}

function info( json ) {
	O = json;
	infoReset();
	O.infoscroll = $( window ).scrollTop();
	// simple use as info( 'message' )
	setTimeout( function() { // allow consecutive infos
	//////////////////////////////////////////////////////////////////////////
	if ( typeof O !== 'object' ) {
		$( '#infoIcon' ).addClass( 'fa fa-info-circle' );
		$( '#infoTitle' ).text( 'Info' );
		$( '#infoX' ).addClass( 'hide' );
		$( '#infoContent' ).prepend( '<p class="message">'+ O +'</p>' );
		$( '#infoOk' ).removeClass( 'hide' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		$( '#infoOk' ).html( 'OK' ).click( infoReset );
		alignVertical();
		return;
	}
	
	$( '#infoOverlay' ).toggleClass( 'noscroll', 'noscroll' in O ); // for volume input range
	$( '#infoX' ).click( function() {
		if ( O.cancel ) O.cancel();
		infoReset();
	} );
	// switch arrows
	if ( O.arrowright ) switchRL( 'right', O.arrowright )
	if ( O.arrowleft ) switchRL( 'left', O.arrowleft )
	// title
	if ( O.width ) $( '#infoBox' ).css( 'width', O.width +'px' );
	if ( O.height ) $( '#infoContent' ).css( 'height', O.height +'px' );
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
	if ( O.nox ) $( '#infoX' ).addClass( 'hide' );
	if ( O.autoclose ) {
		setTimeout( function() {
			$( '#infoCancel' ).click();
		}, O.autoclose );
	}
	
	// buttons
		var htmlbutton = ''
		if ( O.button ) {
			if ( typeof O.button !== 'object' ) O.button = [ O.button ];
			if ( typeof O.buttonlabel !== 'object' ) O.buttonlabel = [ O.buttonlabel ];
			if ( typeof O.buttoncolor !== 'object' ) O.buttoncolor = [ O.buttoncolor ];
			var iL = O.buttonlabel.length;
			for ( i = 0; i < iL; i++ ) {
				var color = O.buttoncolor ? ' style="background-color:'+ O.buttoncolor[ i ] +'"' : '';
				htmlbutton += '<a'+ color +' class="infobtn extrabtn infobtn-primary">'+ O.buttonlabel[ i ] +'</a>';
			}
		}
		if ( O.cancelshow ) {
			var color = O.cancelcolor ? ' style="background-color:'+ O.cancelcolor +'"' : '';
			var hide = O.cancelshow ? '' : ' hide';
			htmlbutton += '<a id="infoCancel"'+ color +' class="infobtn infobtn-default'+ hide +'">'+ ( O.cancellabel || 'Cancel' ) +'</a>';
			$( '#infoButtons' ).on( 'click', '#infoCancel', function() {
				if ( typeof O.cancel === 'function' ) O.cancel();
				infoReset();
			} );
		}
		if ( !O.nook ) {
			var color = O.okcolor ? ' style="background-color:'+ O.okcolor +'"' : '';
			htmlbutton += '<a id="infoOk"'+ color +' class="infobtn infobtn-primary">'+ ( O.oklabel || 'OK' ) +'</a>';
			$( '#infoButtons' ).on( 'click', '#infoOk', function() {
				if ( typeof O.ok === 'function' ) O.ok();
				infoReset();
			} );
		}
		$( '#infoButtons' ).html( htmlbutton );
		if ( O.button ) {
			if ( typeof O.button !== 'object' ) O.button = [ O.button ];
			$( '#infoButtons' ).on( 'click', '.infobtn.extrabtn', function() {
				var fn = O.button[ $( this ).index( '.extrabtn' ) ];
				if ( fn ) fn();
				if ( !O.buttonnoreset ) infoReset();
			} );
		}
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
			
			var file = this.files[ 0 ];
			var filename = file.name;
			O.filechecked = 1;
			if ( O.filetype ) {
				if ( O.filetype === 'image/*' ) {
					O.filechecked = file.type.slice( 0, 5 ) === 'image';
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
				$( '#infoButtons' ).on( 'click', '.btntemp', function() {
					$( '#infoContent' ).html( htmlprev );
					setValues();
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
				if ( O.filetype === 'image/*' ) setFileImage( file );
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
				htmls.password += '<tr><td>'+ lbl +'</td><td><input type="password">&ensp;<i class="fa fa-eye fa-lg"></i></td></tr>';
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
			htmls.select = '';
			if ( typeof O.select !== 'object' ) {
				htmls.select += O.select;
			} else {
				htmls.select += '<tr><td>'+ O.selectlabel +'</td><td><select>';
				$.each( O.select, function( key, val ) {
					htmls.select += '<option value="'+ val.toString().replace( /"/g, '&quot;' ) +'">'+ key +'</option>';
				} );
				htmls.select += '</select></td></tr>';
			}
		}
		if ( O.rangevalue ) {
			htmls.range = '<div id="infoRange">'
					+'<div class="value">'+ O.rangevalue +'</div>'
					+'<a class="min">0</a><input type="range" min="0" max="100" value="'+ +O.rangevalue +'"><a class="max">100</a></div>';
		}
		var htmlcontent = htmls.message || '';
		if ( !O.order ) O.order = [ 'text', 'password', 'textarea', 'radio', 'checkbox', 'select', 'range' ];
		var htmlinputs = '';
		O.order.forEach( function( type ) {
			if ( type in htmls ) htmlinputs += htmls[ type ];
		} );
		if ( htmlinputs ) htmlcontent += '<table>'+ htmlinputs +'</table>';
		htmlcontent += htmls.footer || '';
	}
	// populate layout //////////////////////////////////////////////////////////////////////////////
	$( '#infoContent' ).html( htmlcontent ).promise().done( function() {
		// show to get width - still visibility hidden
		$( '#infoOverlay' )
			.removeClass( 'hide' )
			.focus(); // enable e.which keypress (#infoOverlay needs tabindex="1")
		// set vertical position
		alignVertical();
		// apply selectric
		if ( $( '#infoContent select' ).length ) $( '#infoContent select' ).selectric();
		// set width: button
		if ( !O.buttonfit ) {
			var widest = 0;
			var $this, w, btnhide;
			$.each( $( '#infoButtons a' ), function() {
				$this = $( this )
				btnhide = $this.hasClass( 'hide' );
				$this.removeClass( 'hide' );
				w = $this.outerWidth();
				if ( w > widest ) widest = w;
				$this.toggleClass( 'hide', btnhide );
			} );
			if ( widest > 70 ) $( '.infobtn, .filebtn' ).css( 'min-width', widest +'px' );
		}
		// set width: text / password / textarea
		if ( O.boxwidth ) {
			var allW = $( '#infoContent' ).width();
			var labelW = $( '#infoContent td:first-child' ).width();
			var boxW = O.boxwidth !== 'max' ? O.boxwidth + 12 : allW - ( allW > 399 ? 50 : 20 ) - labelW;
			$( '#infoContent' ).find( 'input:text, input:password, textarea, .selectric, .selectric-wrapper' ).css( 'width', boxW +'px' );
			$( '.selectric-items' ).css( 'min-width', boxW +'px' );
		}
		// set padding-right: radio / checkbox
		if ( $( '#infoContent tr:eq( 0 ) td' ).length > 1 ) {
			$( '#infoContent td:not( :last-child )' ).css( 'padding-right', '10px' );
		}
		// set padding-right, align right: label
		if ( !$( '#infoContent td:first-child input' ).length ) {
			$( '#infoContent td:first-child' ).css( {
				  'padding-right' : '5px'
				, 'text-align'    : 'right'
			} );
		}
		if ( ( O.messagealign || O.footeralign ) && $( '#infoContent table' ) ) {
			var tblW = $( '#infoContent table' ).width();
			$( '#infoContent' ).find( '.infomessage, .infofooter' ).css( 'width', tblW +'px' );
		}
		// get all input fields - omit .selectric-input for select
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
		if ( O.values ) setValues();
		// check text input length
		if ( O.checklength ) {
			$.each( O.checklength, function( i, L ) {
				O.short = O.inputs.eq( i ).val().length < L;
				$( '#infoOk' ).toggleClass( 'disabled', O.short );
				O.inputs.eq( i ).on( 'input', function() {
					O.short = $( this ).val().length < L;
					$( '#infoOk' ).toggleClass( 'disabled', O.short );
				} );
			} );
		}
		// check text input not blank
		if ( O.checkblank ) {
			O.checkblank.forEach( function( i ) {
				O.blank = O.inputs.eq( i ).val().trim() === '';
				$( '#infoOk' ).toggleClass( 'disabled', O.blank );
				O.inputs.eq( i ).on( 'input', function() {
					O.blank = $( this ).val().trim() === '';
					$( '#infoOk' ).toggleClass( 'disabled', O.blank );
				} );
			} );
		}
		// check changed values
		if ( O.values && O.checkchanged ) {
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoContent' ).find( 'input:text, input:password, textarea' ).keyup( checkChanged );
			$( '#infoContent' ).find( 'input:radio, input:checkbox, select' ).change( checkChanged );
		}
		// custom function before show
		if ( O.beforeshow ) O.beforeshow();
	} );
	//////////////////////////////////////////////////////////////////////////
	}, 0 );
}

function alignVertical() { // make infoBox scrollable
	setTimeout( function() {
		var boxH = $( '#infoBox' ).height();
		var wH = window.innerHeight;
		var top = boxH < wH ? ( wH - boxH ) / 2 : 20;
		$( 'html, body' ).scrollTop( 0 );
		$( '#infoBox' ).css( {
			  'margin-top' : top +'px'
			, 'visibility' : 'visible'
		} );
		$( '#infoOverlay' ).removeClass( 'noclick' );
		$( '#infoContent input:text' ).prop( 'spellcheck', false );
		$input0 = $( O.inputs[ 0 ] );
		if ( !O.nofocus && [ 'text', 'password' ].indexOf( $input0.prop( 'type' ) ) !== -1 ) $input0.focus();
	}, 200 );
}
function checkChanged() {
	if ( O.short || O.blank ) return // shorter - already disabled
	
	setTimeout( function() { // force after check length
		var values = infoVal();
		if ( typeof values !== 'object' ) values = [ values ];
		var changed = false;
		changed = values.some( function( v, i ) {
			if ( v != O.values[ i ] ) return true
		} );
		$( '#infoOk' ).toggleClass( 'disabled', !changed );
	}, 0 );
}
function infoVal() {
	var values = [];
	var $this, type, name, val, n;
	var i = 0;
	O.inputs.each( function() {
		$this = $( this );
		type = $this.prop( 'type' );
		val = '';
		if ( type === 'radio' ) { // radio has only single checked - skip unchecked inputs
			val = $( '#infoContent input:radio[name='+ this.name +']:checked' ).val();
			if ( val === 'true' ) { val = true; } else if ( val === 'false' ) { val = false; }
		} else if ( type === 'checkbox' ) {
			val = $this.prop( 'checked' );
		} else {
			val = $this.val().trim();
		}
		values.push( val );
	} );
	if ( values.length > 1 ) {
		return values
	} else {
		return values[ 0 ]
	}
}
function setFileImage( file ) {
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
	getOrientation( file, function( ori ) {
		resetOrientation( file, ori, function( filecanvas, imgW, imgH ) {
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
}
function setValues() {
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
	if ( $( '#infoContent select' ).length ) $( '#infoContent select' ).selectric( 'refresh' );
}
function switchRL( rl, fn ) {
	$( '#infoContent' ).before( '<div id="infoArrow"><i class="fa fa-arrow-'+ rl +'"></i></div>' );
	$( '#infoArrow i' ).click( function() {
		fn();
		$( '#infoOverlay' ).removeClass( 'hide' ); // keep background on switch info
	} );
}

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
