/* 
copy,     banner(),    errorDisplay(), 
info(),   infoPower(), infoPowerCommand(), infoPowerNfs(),
loader(), local(),     $.fn.press(),       pushstream,     selectSet()
*/

var page        = location.search.replace( '?p=', '' );
var iconwarning = '<i class="fa fa-warning fa-lg yl"></i>&ensp;';

// ----------------------------------------------------------------------
function banner( icon, title, message, delay ) {
	clearTimeout( I.timeoutbanner );
	var iconhtml = icon && icon.slice( 0, 1 ) === '<' 
					? icon 
					: icon ? '<i class="fa fa-'+ ( icon ) +'"></i>' : '';
	$( '#banner' ).html( `
<div id="bannerIcon">${ iconhtml }</div>
<div id="bannerTitle">${ title }</div>
<div id="bannerMessage">${ message }</div>
` ).removeClass( 'hide' );
	if ( delay !== -1 ) I.timeoutbanner = setTimeout( bannerHide, delay || 3000 );
}
function bannerHide() {
	if ( $( '#banner' ).hasClass( 'hide' ) || V.reboot ) return
	
	$( '#banner' )
		.addClass( 'hide' )
		.empty();
}
$( '#banner' ).click( bannerHide );

// ----------------------------------------------------------------------
$( '#data' ).on( 'click', '.copy', function() {
	banner( 'copy', 'Error Data', 'Errors copied to clipboard.' );
	// copy2clipboard - for non https which cannot use clipboard API
	$( 'body' ).prepend( '<textarea id="error">\`\`\`\n'+ $( '#data' ).text().replace( 'Copy{', '\n{' ) +'\`\`\`</textarea>' );
	$( '#error' ).focus().select();
	document.execCommand( 'copy' );
	$( '#error' ).remove();
} );

// ----------------------------------------------------------------------
function errorDisplay( msg, list ) {
	var pos   = msg.includes( 'position' ) ? msg.replace( /.* position /, '' ) : msg.replace( /.* column (.*) of .*/, '$1' );
	var error =  '<codered>Errors:</codered> '+ msg.replace( pos, '<codered>'+ pos +'</codered>' )
				+'&emsp;<a class="infobtn infobtn-primary copy"><i class="fa fa-copy"></i>Copy</a>'
				+'<hr>'
				+ list.slice( 0, pos ) +'<codered>X</codered>'+ list.slice( pos );
	$( '#data' )
		.html( error )
		.removeClass( 'hide' );
	$( '#button-data' ).addClass( 'hide' );
	loaderHide();
}

// ----------------------------------------------------------------------
function highlightJSON( json ) {
	var json = Object.keys( json )
					.sort()
					.reduce( ( r, k ) => ( r[ k ] = json[ k ], r ), {} ); // https://stackoverflow.com/a/29622653
	json = '\n\n'+ JSON.stringify( json, null, '\t' );
	return json.replace( /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)|[{}\[\]]/g, function( match ) {
		if ( /^"/.test( match ) ) {              // string
			if ( /:$/.test( match ) ) { // key
				return match
			} else {                    // value
				return '<yl>'+ match +'</yl>'
			}
		} else if ( /true/.test( match ) ) {     // true
			return '<grn>'+ match +'</grn>'
		} else if ( /false/.test( match ) ) {    // false
			return '<red>'+ match +'</red>'
		} else if ( /[0-9]/.test( match ) ) {    // number
			return '<ora>'+ match +'</ora>'
		} else if ( /[{}\[\]]/.test( match ) ) { // braces
			return '<pur>'+ match +'</pur>'
		}
	} ); // source: https://stackoverflow.com/a/7220510
}

// info ----------------------------------------------------------------------
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
	
	filelabel     : 'LABEL'                   // ***            (browse button label)
	fileoklabel   : 'LABEL'                   // 'OK'           (upload button label)
	filetype      : '.EXT, ...'               // (none)         (filter and verify filetype (with 'dot' - 'image/*' for all image types)
	
	buttonlabel   : [ 'LABEL', ... ]          // ***            (extra buttons - label array)
	button        : [ FUNCTION, ... ]         // (none)         (function array)
	buttoncolor   : [ 'COLOR', ... ]          // 'var( --cm )'  (color array)
	buttonfit     : 1                         // (none)         (fit buttons width to label)
	
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
- Require fa-font, Select2.js
- Single value/function - no need to be array
` );
}

I = { infohide: true }

function info( json ) {
	I          = json;
	I.active   = ! $( '#infoOverlay' ).hasClass( 'hide' );
	$( '#infoOverlay' ).html( `
<div id="infoBox">
	<div id="infoTopBg">
		<div id="infoTop"><i id="infoIcon"></i><a id="infoTitle"></a></div><i id="infoX" class="fa fa-close"></i>
	</div>
	<div id="infoContent"></div>
	<div id="infoButtons"></div>
</div>
` );
	I.infoscroll = $( window ).scrollTop();
	
/*	$( '#infoOverlay' ).on( 'mousedown touchstart', function( e ) {
		if ( e.target.id === 'infoOverlay' ) $( '#infoX' ).click();
	} );*/
	
	$( '#infoX' ).click( function() {
		I.active = false; // force clear for infoButtonCommand()
		infoButtonCommand( I.cancel );
	} );
	if ( typeof I !== 'object' ) {
		$( '#infoIcon' ).addClass( 'fa fa-info-circle' );
		$( '#infoTitle' ).text( 'Info' );
		$( '#infoContent' ).prepend( '<p class="message">'+ I +'</p>' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		$( 'html, body' ).scrollTop( 0 );
		return;
	}
	
	// title
	if ( I.width ) $( '#infoBox' ).css( 'width', I.width );
	if ( I.height ) $( '#infoContent' ).css( 'height', I.height );
	if ( I.icon ) {
		if ( I.icon.charAt( 0 ) !== '<' ) {
			$( '#infoIcon' ).addClass( 'fa fa-'+ I.icon );
		} else {
			$( '#infoIcon' ).html( I.icon );
		}
	} else {
		$( '#infoIcon' ).addClass( 'fa fa-help' );
	}
	var title = I.title || 'Information';
	$( '#infoTitle' ).html( title );
	
	// buttons
	var htmlbutton = '';
	if ( I.button ) {
		if ( typeof I.button !== 'object' ) I.button = [ I.button ];
		if ( typeof I.buttonlabel !== 'object' ) I.buttonlabel = [ I.buttonlabel ];
		if ( 'buttoncolor' in I && typeof I.buttoncolor !== 'object' ) I.buttoncolor = [ I.buttoncolor ];
		var iL = I.button.length;
		for ( i = 0; i < iL; i++ ) {
			htmlbutton += I.buttoncolor ? '<a style="background-color:'+ I.buttoncolor[ i ] +'"' : '<a';
			htmlbutton += ' class="infobtn extrabtn infobtn-primary">'+ I.buttonlabel[ i ] +'</a>';
		}
	}
	if ( I.cancelshow || I.cancellabel || I.cancelcolor ) {
		var color   = I.cancelcolor ? ' style="background-color:'+ I.cancelcolor +'"' : '';
		htmlbutton += '<a id="infoCancel"'+ color +' class="infobtn infobtn-default">'+ ( I.cancellabel || 'Cancel' ) +'</a>';
	}
	if ( ! I.okno ) {
		var color = I.okcolor ? ' style="background-color:'+ I.okcolor +'"' : '';
		htmlbutton += '<a id="infoOk"'+ color +' class="infobtn infobtn-primary">'+ ( I.oklabel || 'OK' ) +'</a>';
	}
	if ( htmlbutton ) {
		$( '#infoButtons' )
			.html( htmlbutton )
			.removeClass( 'hide' );
	} else {
		$( '#infoButtons' ).remove();
	}
	if ( I.button ) {
		if ( typeof I.button !== 'object' ) I.button = [ I.button ];
		$( '#infoButtons' ).on( 'click', '.extrabtn', function() {
			var buttonfn = I.button[ $( this ).index( '.extrabtn' ) ];
			infoButtonCommand( buttonfn );
		} );
	}
	$( '#infoCancel' ).one( 'click', function() {
		infoButtonCommand( I.cancel );
	} );
	$( '#infoOk' ).one( 'click', function() {
		infoButtonCommand( I.ok );
	} );
	if ( I.fileoklabel ) {
		var htmlfile = '<div id="infoFile">'
					  +'<code id="infoFilename" class="hide"></code>'
					  +'<input type="file" class="hide" id="infoFileBox"'
					  + ( I.filetype ? ' accept="'+ I.filetype +'">' : '>' )
					  +'</div>'
					  +'<a id="infoFileLabel" class="infobtn file infobtn-primary">'
					  + ( I.filelabel || '<i class="fa fa-folder-open"></i>File' ) +'</a>';
		$( '#infoButtons' ).prepend( htmlfile )
		$( '#infoOk' )
			.html( I.fileoklabel )
			.addClass( 'hide' );
		$( '#infoFileLabel' ).click( function() {
			$( '#infoFileBox' ).click();
		} );
		$( '#infoFileBox' ).change( function() {
			if ( ! this.files.length ) return
			
			I.infofile    = this.files[ 0 ];
			var filename  = I.infofile.name;
			var typeimage = I.infofile.type.slice( 0, 5 ) === 'image';
			I.filechecked = 1;
			if ( I.filetype ) {
				if ( I.filetype === 'image/*' ) {
					I.filechecked = typeimage;
				} else {
					var ext = filename.includes( '.' ) ? filename.split( '.' ).pop() : 'none';
					I.filechecked = I.filetype.includes( ext );
				}
			}
			if ( ! I.filechecked ) {
				var htmlprev = $( '#infoContent' ).html();
				$( '#infoFilename, #infoFileLabel' ).addClass( 'hide' );
				$( '#infoContent' ).html( '<table><tr><td>Selected file :</td><td><code>'+ filename +'</code></td></tr>'
										 +'<tr><td>File not :</td><td><code>'+ I.filetype +'</code></td></tr></table>' );
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
				if ( typeimage ) infoFileImage();
			}
		} );
	}
	
	if ( I.tab ) {
		$( '#infoTab' ).remove();
		htmltab      = '<div id="infoTab">';
		I.tab.forEach( lbl => htmltab += '<a>'+ lbl +'</a>' );
		htmltab += '</div>';
		$( '#infoTopBg' ).after( htmltab );
		$( '#infoTab a' ).click( function() {
			if ( ! $( this ).hasClass( 'active' ) ) I.tabfunction[ $( this ).index() ]();
		} );
		$( '#infoTab a' )
			.css( 'width', 100 / I.tab.length +'%' )
			.eq( I.tabactive ).addClass( 'active' );
	}
	if ( I.content ) {
		// custom html content
		var htmlcontent = I.content;
	} else {
		var htmls = {}
		if ( I.message ) {
			htmls.message  = '<div class="infomessage"';
			if ( I.messagealign ) htmls.message += ' style="text-align:'+ I.messagealign +'"';
			htmls.message += '>'+ I.message +'</div>';
		}
		if ( I.footer ) {
			htmls.footer  = '<div class="infofooter"';
			if ( I.footeralign ) htmls.footer += ' style="text-align:'+ I.footeralign +'"';
			htmls.footer += '>'+ I.footer +'</div>';
		}
		// inputs html ///////////////////////////////////////////////////////////
		if ( I.textlabel ) {
			if ( typeof I.textlabel !== 'object' ) I.textlabel = [ I.textlabel ];
			htmls.text      = '';
			I.textlabel.forEach( lbl => htmls.text += '<tr><td>'+ lbl +'</td><td><input type="text"></td></tr>' );
		}
		if ( I.passwordlabel ) {
			if ( typeof I.passwordlabel !== 'object' ) I.passwordlabel = [ I.passwordlabel ];
			htmls.password      = '';
			I.passwordlabel.forEach( lbl => htmls.password += '<tr><td>'+ lbl +'</td><td><input type="password"></td><td><i class="fa fa-eye fa-lg"></i></td></tr>' );
		}
		if ( I.textarea ) {
			htmls.textarea = '<textarea></textarea>';
		}
		var td0 = htmls.text || htmls.password ? '<td></td>' : '';
		if ( I.radio ) { // single set only
			var line;
			var i       = 0;
			htmls.radio = '';
			$.each( I.radio, ( k, v ) => {
				line = '<td>'+ ( k ? '<label><input type="radio" name="inforadio" value="'+ v +'">'+ k +'</label>' : '' ) +'</td>';
				if ( ! I.radiocolumn ) {
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
			if ( ! I.values ) I.values = [ '' ];
		}
		if ( I.checkbox ) {
			var line;
			var i          = 0;
			htmls.checkbox = '';
			I.checkbox.forEach( lbl => {
				line = '<td>'+ ( lbl ? '<label><input type="checkbox">'+ lbl +'</label>' : '' ) +'</td>';
				if ( ! I.checkcolumn ) {
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
		if ( I.select ) {
			if ( typeof I.select !== 'object' ) {
				htmls.select      = I.select;
			} else {
				htmls.select      = '<tr><td>'+ I.selectlabel +'</td><td><select>';
				$.each( I.select, ( k, v ) => htmls.select += '<option value="'+ v.toString().replace( /"/g, '&quot;' ) +'">'+ k +'</option>' );
			}
			htmls.select += '</select></td></tr>';
		}
		if ( I.rangevalue ) {
			htmls.range = '<div id="infoRange">'
						 +'<div class="value">'+ I.rangevalue +'</div>'
						 +'<a class="min">0</a><input type="range" min="0" max="100" value="'+ +I.rangevalue +'"><a class="max">100</a></div>';
		}
		var htmlcontent = '';
		htmlcontent    += htmls.tab || '';
		htmlcontent    += htmls.message || '';
		if ( ! I.order ) I.order = [ 'text', 'password', 'textarea', 'radio', 'checkbox', 'select' ];
		var htmlinputs  = '';
		I.order.forEach( type => {
			if ( type in htmls ) htmlinputs += htmls[ type ];
		} );
		if ( htmlinputs ) htmlcontent += '<table>'+ htmlinputs +'</table>';
		htmlcontent   += htmls.range || '';
		htmlcontent   += htmls.footer || '';
	}
	if ( ! htmlcontent ) {
		$( '#infoButtons' ).css( 'padding', '0 0 20px 0' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		infoButtonWidth();
		$( 'html, body' ).scrollTop( 0 );
		setTimeout( () => $( 'html, body' ).scrollTop( 0 ), 50 ); // fix - ios safari not scroll
		return
	}
	
	// populate layout //////////////////////////////////////////////////////////////////////////////
	$( '#infoContent' ).html( htmlcontent ).promise().done( function() {
		$( '#infoContent input:text' ).prop( 'spellcheck', false );
		// get all input fields
		$inputs_txt = $( '#infoContent' ).find( 'input:text, input:password, textarea' );
		var $input  = $( '#infoContent' ).find( 'input, select, textarea' );
		var name, nameprev;
		I.inputs    = $input.filter( ( i, el ) => { // filter each radio per group ( multiple inputs with same name )
			name = el.name;
			if ( ! name ) {
				return true
			} else if (	name !== nameprev ) {
				nameprev = name;
				return true
			}
		} );
		// assign values
		if ( 'values' in I && I.values !== '' ) infoSetValues();
		
		$( '#infoOverlay' ).removeClass( 'hide' );
		I.infohide = false;
		if ( 'focus' in I ) {
			$( '#infoContent' ).find( 'input:text, input:password').eq( I.focus ).focus();
		} else {
			$( '#infoOverlay' ).focus();
		}
		if ( $( '#infoBox' ).height() > window.innerHeight - 10 ) $( '#infoBox' ).css( { top: '5px', transform: 'translateY( 0 )' } );
		infoButtonWidth();
		// set width: text / password / textarea
		if ( I.boxwidth ) {
			var widthmax = I.boxwidth === 'max';
			if ( widthmax ) $( '#infoBox' ).css( 'width', 600 );
			var allW = $( '#infoContent' ).width();
			var labelW = $( '#infoContent td:first-child' ).width() || 0;
			I.boxW = ( widthmax ? allW - labelW - 20 : I.boxwidth );
		} else {
			I.boxW = 230;
		}
		$( '#infoContent' ).find( 'input:text, input:password, textarea, select' ).parent().css( 'width', I.boxW );
		if ( $( '#infoContent select' ).length ) selectSet(); // render select to set width
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
		if ( ( I.messagealign || I.footeralign ) && $( '#infoContent table' ) ) {
			var tblW = $( '#infoContent table' ).width();
			$( '#infoContent' ).find( '.infomessage, .infofooter' ).css( 'width', tblW );
		}
		if ( I.rangevalue ) {
			$( '#infoRange input' ).on( 'click input keyup', function() {
				$( '#infoRange .value' ).text( $( this ).val() );
			} );
		}
		// custom function before show
		if ( I.beforeshow ) I.beforeshow();
		if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( '#infoContent a' ).removeAttr( 'href' );
		$( 'html, body' ).scrollTop( 0 );
		setTimeout( () => $( 'html, body' ).scrollTop( 0 ), 50 ); // fix - ios safari not scroll
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
	if ( I.checkblank ) {
		if ( typeof I.checkblank !== 'object' ) I.checkblank = [ ...Array( $inputs_txt.length ).keys() ];
		infoCheckBlank();
	} else {
		I.blank = false;
	}
	if ( I.checklength ) {
		infoCheckLength();
	} else {
		I.short = false;
	}
	I.nochange = I.values && I.checkchanged ? true : false;
	$( '#infoOk' ).toggleClass( 'disabled', I.blank || I.short || I.nochange ); // initial check
	infoCheckSet();
}

function infoButtonCommand( fn ) {
	if ( typeof fn === 'function' ) fn();
	if ( I.infoscroll ) $( 'html, body' ).scrollTop( I.infoscroll );
	delete I.infofile;
	delete I.infofilegif;
	setTimeout( () => {
		if ( I.active ) return // I.active: for info() in sequence
		
		I.infohide = true;
		$( '#infoOverlay' ).addClass( 'hide' );
		$( '#infoOverlay' ).empty();
	}, 50 ); // wait for next info() if any
}
function infoButtonWidth() {
	if ( I.buttonfit ) return
	
	var widest = 0;
	$( '#infoButtons a' ).each( ( i, el ) => {
		var w = $( el ).outerWidth();
		if ( w > widest ) widest = w;
	} );
	if ( widest > 70 ) $( '.infobtn, .filebtn' ).css( 'min-width', widest );
}
function infoCheckBlank() {
	if ( ! I.checkblank ) return // suppress error on repeating
	
	I.blank = false;
	I.blank = I.checkblank.some( i => {
		if ( $inputs_txt.eq( i ).val().trim() === '' ) return true
	} );
}
function infoCheckLength() {
	I.short = false;
	$.each( I.checklength, ( k, v ) => {
		if ( typeof v !== 'object' ) {
			var L    = v
			var cond = 'equal';
		} else {
			var L    = v[ 0 ];
			var cond = v[ 1 ];
		}
		var diff = I.inputs.eq( k ).val().trim().length - L;
		if ( ( cond === 'equal' && diff !== 0 ) || ( cond === 'min' && diff < 0 ) || ( cond === 'max' && diff > 0 ) ) {
			I.short = true;
			return false
		}
	} );
}
function infoCheckSet() {
	if ( I.checkblank || I.checklength || I.checkchanged ) {
		$inputs_txt.on( 'keyup paste cut', function() {
			if ( I.checkblank ) setTimeout( infoCheckBlank, 0 ); // ios: wait for value
			if ( I.checklength ) setTimeout( infoCheckLength, 25 );
			if ( I.checkchanged ) {
				var prevval = I.values.join( '' );
				var values  = infoVal();
				var val     = I.values.length > 1 ? values.join( '' ) : values; // single value cannot be joined
				I.nochange  = prevval === val;
			}
			setTimeout( () => $( '#infoOk' ).toggleClass( 'disabled', I.blank || I.short || I.nochange ), 50 ); // ios: force after infoCheckLength
		} );
	}
	if ( I.checkchanged ) {
		$( '#infoContent' ).find( 'input:radio, input:checkbox, select' ).on( 'change', function() {
			var values = I.values.length > 1 ? infoVal() : [ infoVal() ];
			I.nochange = I.values.join( '' ) === values.join( '' );
			$( '#infoOk' ).toggleClass( 'disabled', I.nochange );
		} );
	}
}
function infoFileImage() {
	delete I.infofilegif;
	I.timeoutfile = setTimeout( () => banner( 'refresh blink', 'Change Image', 'Load ...', -1 ), 1000 );
	I.rotate      = 0;
	$( '.infoimgname' ).addClass( 'hide' );
	$( '.infoimgnew, .infoimgwh' ).remove();
	if ( I.infofile.name.slice( -3 ) !== 'gif' ) {
		infoFileImageReader();
	} else { // animated gif or not
		var formdata = new FormData();
		formdata.append( 'cmd', 'giftype' );
		formdata.append( 'file', I.infofile );
		fetch( 'cmd.php', { method: 'POST', body: formdata } )
			.then( response => response.json() ) // set response data as json > animated
			.then( animated => { // 0 / 1
				if ( animated ) {
					I.infofilegif = '/srv/http/data/shm/local/tmp.gif';
					var img    = new Image();
					img.src    = URL.createObjectURL( I.infofile );
					img.onload = function() {
						var imgW   = img.width;
						var imgH   = img.height;
						var resize = infoFileImageResize( 'gif', imgW, imgH );
						infoFileImageRender( img.src, imgW +' x '+ imgH, resize ? resize.wxh : '' );
						clearTimeout( I.timeoutfile );
						bannerHide();
					}
				} else {
					infoFileImageReader();
				}
			} );
	}
}
function infoFileImageReader() {
	var maxsize   = ( V.library && ! V.librarylist ) ? 200 : 1000;
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
			var resize = infoFileImageResize( 'jpg', imgW, imgH );
			if ( resize ) {
				var canvas    = document.createElement( 'canvas' );
				canvas.width  = resize.w;
				canvas.height = resize.h;
				pica.resize( filecanvas, canvas, picaOption ).then( function() {
					infoFileImageRender( canvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH, resize.wxh );
				} );
			} else {
				infoFileImageRender( filecanvas.toDataURL( 'image/jpeg' ), imgW +' x '+ imgH );
			}
			clearTimeout( I.timeoutfile );
			bannerHide();
		}
	}
	reader.readAsDataURL( I.infofile );
	$( '#infoContent' )
		.off( 'click', '.infoimgnew' )
		.on( 'click', '.infoimgnew', function() {
		if ( ! $( '.infomessage .rotate' ).length ) return
		
		I.rotate     += 90;
		if ( I.rotate === 360 ) I.rotate = 0;
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
function infoFileImageRender( src, original, resize ) {
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
function infoFileImageResize( ext, imgW, imgH ) {
	var maxsize = ( V.library && ! V.librarylist ) ? 200 : ( ext === 'gif' ? 600 : 1000 );
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
function infoSetValues() {
	if ( typeof I.values !== 'object' ) I.values = [ I.values ];
	var $this, type, val;
	I.inputs.each( ( i, el ) => {
		$this = $( el );
		type  = $this.prop( 'type' );
		val   = I.values[ i ];
		if ( type === 'radio' ) { // reselect radio by name
			$( '#infoContent input:radio[name='+ el.name +']' ).val( [ val ] );
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
	I.textarea = 0;
	I.inputs.each( ( i, el ) => {
		$this = $( el );
		type  = $this.prop( 'type' );
		val   = '';
		switch ( type ) {
			case 'radio': // radio has only single checked - skip unchecked inputs
				val = $( '#infoContent input:radio[name='+ el.name +']:checked' ).val();
				if ( val === 'true' ) { val = true; } else if ( val === 'false' ) { val = false; }
				break;
			case 'checkbox':
				val = $this.prop( 'checked' );
				break;
			case 'textarea':
				I.textarea = 1;
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
function infoVerifyPassword( title, pwd, fn ) { // verify password - called from addons.js
	if ( ! title ) return
	
	info( {
		  title         : title
		, message       : 'Please retype'
		, passwordlabel : 'Password'
		, ok            : () => {
			if ( infoVal() === pwd ) {
				fn();
			} else {
				info( {
					  title   : title
					, message : 'Passwords not matched. Please try again.'
					, ok      : () => infoVerifyPassword( title, pwd, fn )
				} );
			}
		}
	} );
}

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
			if ( ! $( '#infoOk' ).hasClass( 'disabled' ) && ! $( 'textarea' ).is( ':focus' ) ) $( '#infoOk' ).click();
			break;
		case 'Escape':
			local(); // prevent toggle setting menu
			$( '#infoX' ).click();
			break;
		case 'ArrowLeft':
		case 'ArrowRight':
			var $tabactive = $( '#infoTab a.active' );
			if ( key === 'ArrowLeft' ) {
				$tabactive.is(':first-child') ? $( '#infoTab a:last-child' ).click() : $tabactive.prev().click();
			} else {
				$tabactive.is(':last-child') ? $( '#infoTab a:first-child' ).click() : $tabactive.next().click();
			}
			break;
	}
} );
$( '#infoContent' ).click( function() {
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} );

// common info functions --------------------------------------------------
function infoPower() {
	info( {
		  icon        : 'power'
		, title       : 'Power'
		, buttonlabel : '<i class="fa fa-reboot"></i>Reboot'
		, buttoncolor : orange
		, button      : () => infoPowerCommand( 'reboot' )
		, oklabel     : '<i class="fa fa-power"></i>Off'
		, okcolor     : red
		, ok          : () => infoPowerCommand( 'off' )
	} );
}
function infoPowerCommand( action ) {
	bash( [ 'power', action ], nfs => infoPowerNfs( nfs, action ) );
}
function infoPowerNfs( nfs, action ) {
	if ( nfs != -1 ) return
	
	var off = action === 'off';
	info( {
		  icon    : 'power'
		, title   : 'Power'
		, message : 'This <wh>Server rAudio <i class="fa fa-rserver"></i></wh> is currently active.'
					+'<br><wh>Shared Data</wh> on clients will stop.'
					+'<br>(Resume when server online again)'
					+'<br><br>Continue?'
		, oklabel : off ? '<i class="fa fa-power"></i>Off' : '<i class="fa fa-reboot"></i>Reboot'
		, okcolor : off ? red : orange
		, ok      : () => {
			bash( [ 'power', action, 1 ] );
			banner( 'rserver', 'Server rAudio', 'Notify clients ...', -1 );
		}
	} );
}

// ----------------------------------------------------------------------
function loader() {
	$( '#loader' ).removeClass( 'hide' );
}
function loaderHide() {
	$( '#loader' ).addClass( 'hide' );
}

// ----------------------------------------------------------------------
function local( delay ) {
	V.local = 1;
	setTimeout( () => V.local = 0, delay || 300 );
}

// ----------------------------------------------------------------------
/*
$( ELEMENT ).press( DELEGATE, function( e ) {
	// ELEMENT  : #id or .class
	// DELEGATE : optional
	// this     : use $( e.target ) instead of $( this );
	// .on      : cannot be attached with .on
} );
events:
	- move  : mouseenter > mousemove > mouseleave > mouseout
	- click : mousedown  > mouseup   > click
	- touch : touchstart > touchmove > touchend
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
		timeout = setTimeout( () => {
			V.press = 1;
			callback( e );
		}, 1000 );
	} ).on( 'touchend mouseup mouseleave', delegate, function( e ) {
		clearTimeout( timeout );
		setTimeout( () => V.press = 0, 300 ); // needed for mouse events
	} );
	return this // allow chain
}

// pushstream -----------------------------------------------------------------
if ( ! [ 'addons', 'addons-progress', 'guide' ].includes( page )  ) {
	var pushstream  = new PushStream( {
		  modes                                 : 'websocket'
		, reconnectOnChannelUnavailableInterval : 3000
	} );
	function pushstreamChannel( channels ) {
		channels.forEach( channel => pushstream.addChannel( channel ) );
		pushstream.connect();
	}
	function pushstreamPower( message ) {
		var type  = message.split( ' ' )[ 0 ].toLowerCase();
		V[ type ] = 1;
		loader();
	}
	pushstream.onstatuschange = status => { // 0 - disconnected; 1 - reconnect; 2 - connected
		if ( status === 2 ) {        // connected
			if ( V.reboot ) {
				if ( S.login ) {
					location.href = '/';
					return
				}
				
				delete V.reboot;
				loaderHide();
			}
			refreshData();
			bannerHide();
		} else if ( status === 0 ) { // disconnected
			pushstreamDisconnect();
			if ( V.off ) {
				pushstream.disconnect();
				$( '#loader' ).css( 'background', '#000000' );
				setTimeout( () => {
					$( '#loader .logo' ).css( 'animation', 'none' );
					bannerHide();
					loader();
				}, 10000 );
			}
		}
	}
	// page visibility -----------------------------------------------------------------
	var active  = 1; // fix: multiple firings
	var select2 = 0; // fix: closing > blur > disconnect
	function connect() {
		if ( active || V.off ) return
		
		active = 1;
		pushstream.connect();
	}
	function disconnect() {
		if ( ! active ) return
		
		active = 0;
		pushstream.disconnect();
	}
	document.onvisibilitychange = () => document.hidden ? disconnect() : connect();
	window.onpagehide = disconnect;
	window.onpageshow = connect;
	window.onblur     = () => { if ( ! select2 ) disconnect() }
	window.onfocus    = connect;
}

// select2 --------------------------------------------------------------------
function selectSet( $select ) {
	var options = {}
	if ( $select ) {
		var searchbox = page === 'system' ? 1 : 0;
	} else {
		$select = $( '#infoContent select' );
		var searchbox = 0;
		if ( $( '#eq' ).length ) options.dropdownParent = $( '#eq' );
	}
	if ( ! searchbox ) options.minimumResultsForSearch = Infinity;
	$select
		.select2( options )
		.on( 'select2:closing', () => select2 = 1 )
		.on( 'select2:close',   () => select2 = 0 )
		.each( ( i, el ) => {
			var $this = $( el );
			if ( $this.find( 'option' ).length === 1 ) $this.prop( 'disabled', true );
		} );
}
