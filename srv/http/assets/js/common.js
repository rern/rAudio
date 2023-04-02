/*
bash()
$.fn.press
banner() copy        errorDisplay() 
info()   infoPower() infoPowerCommand() infoWarning()
loader() local()     pushstream         selectSet()
*/

var page        = location.search.replace( '?p=', '' );
var dirbash     = '/srv/http/bash/';
var dirsettings = '/srv/http/bash/settings/';
var iconwarning = ico( 'warning i-lg yl' ) +'&ensp;';
var localhost   = [ 'localhost', '127.0.0.1' ].includes( location.hostname );
var orange      = '#de810e';
var red         = '#bb2828';

// ----------------------------------------------------------------------
/*
Avoid " ` escaping in js values:

js array >            php array - implode to multiline     > bash pair key=value
js json - stringify > php decode - reencode - save to file > bash move file to target

json array/json <     php array/string - encode            < bash string or array/json literal

	- js array: bash()                         cmd = [ 'command', '"double"quotes and `backtick`' ];
		> php escape - implode to multiline: $script = "command\n\"double\"quotes and \`backtick\`";
			> bash readarray multiline to array: args=( command '"double"quotes and `backtick`' )
	- js json: bashJson()
		> php decode - reencode - save to $dirshm
			> bash mv fileconf to $dirsystem/$cmd.conf
			
*** multiline string value - js string:    value = '"'+ line0 +'\\n'+ line1'.replace( /"|`/g, '\\\\"' ) +'"';
*/
function bash( command, callback, json ) {
	var filesh = 'cmd';
	if ( page ) {
		var cmd0= command[ 0 ];
		var filesh = 'settings/';
		if ( cmd0 === 'refreshdata' ) {
			filesh += 'system';
			command.push( page );
		} else if ( cmd0 === 'pkgstatus' ) {
			filesh += 'system-pkgstatus';
			command.shift();
		} else {
			filesh += page;
		}
	}
	var data   = { cmd: 'bash', args: [ filesh +'.sh', ...command ] }
	if ( V.consolelog ) {
		var l     = data.args;
		var debug = l[ 0 ].replace( 'settings/', '' ) +' "'+ l[ 1 ] +'\n'
				  + l.slice( 2 ).join( '\n' ) +'\n"';
		navigator.maxTouchPoints ? alert( debug ) : console.log( debug );
		return
	}
	
	$.post( 
		  'cmd.php'
		, data
		, callback || null
		, json || null
	);
}
function bashJson( json, command ) {
	notify( SW.icon, SW.title, S.relays ? 'Change ...' : 'Enable ...' );
	if ( V.consolelog ) {
		var l     = command;
		var debug = JSON.stringify( json, null, 2 ) +'\n'
				  + JSON.stringify( command, null, 2 ) +'\n';
		navigator.maxTouchPoints ? alert( debug ) : console.log( debug );
		return
	}
	
	S[ SW.id ] = true;
	$.post(
		  'cmd.php'
		, {
			  cmd  : 'filejson'
			, json : JSON.stringify( json )
			, file : '/srv/http/data/shm/'+ SW.id +'.json' // php write to dirshm only
		}
		, () => bash( command )
	);
}

// ----------------------------------------------------------------------
/*
$( ELEMENT ).press( DELEGATE, function( e ) {
	cannot be attached with .on
	DELEGATE : optional - if not delegate, use e.target for this
} );
events:
	- move  : mouseenter > mousemove > mouseleave > mouseout
	- click : mousedown  > mouseup   > click
	- touch : touchstart > touchmove > touchend
*/
$.fn.press = function( arg1, arg2 ) {
	var callback, delegate, timeout;
	if ( arg2 ) { 
		delegate = arg1; // this = delegate
		callback = arg2;
	} else {
		delegate = '';   // this not applicable
		callback = arg1;
	}
	this.on( 'touchstart mousedown', delegate, function( e ) {
		timeout = setTimeout( () => {
			V.press = true;
			callback( delegate ? this : e );
		}, 1000 );
	} ).on( 'touchend mouseup mouseleave', delegate, function() {
		clearTimeout( timeout );
		setTimeout( () => V.press = false, 300 ); // needed for mouse events
	} );
	return this // allow chain
}

// ----------------------------------------------------------------------
function banner( icon, title, message, delay ) {
	clearTimeout( I.timeoutbanner );
	$( '#banner' ).html( `
<div id="bannerIcon">${ ico( icon ) }</div>
<div id="bannerTitle">${ title }</div>
<div id="bannerMessage">${ message }</div>
`   ).removeClass( 'hide' );
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
	var pos = '';
	if ( msg.includes( 'position' ) ) {
		pos = msg.replace( /.* position /, '' );
	} else if ( msg.includes( 'column' ) ) {
		pos = msg.replace( /.* column (.*) of .*/, '$1' );
	}
	if ( pos ) msg = msg.replace( pos, '<codered>'+ pos +'</codered>' );
	var error =  '<codered>Errors:</codered> '+ msg
				+'&emsp;<a class="infobtn infobtn-primary copy">'+ ico( 'copy' ) +'Copy</a>'
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
				return '<gr>'+ match +'</gr>'
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
function ico( cls, id ) {
	return '<i '+ ( id ? 'id="'+ id +'" ' : '' ) +'class="i-'+ cls +'"></i>'
}

// info ----------------------------------------------------------------------
// Show usage: Press icon
var usage = `\
===============================
| icon - title              X |
|-----------------------------|
|      tab     |     tab      |
|              ---------------|
|           message           |
|  input / select / textarea  |
|            footer           |
|                             |
| file - button - cancel - ok |
===============================

Debug : Click icon for console.log / alert of return arguments
Get values   : infoVal( ''|'array'|'json' )
	- ''      - values array - return array | value if single
	- 'KEY'   - 
	- 'array' - force return values in array (single value or values json)
	- 'json'  - force return values in json


info( {                                       // default
	icon          : 'NAME'                    // 'question'     (top icon)
	title         : 'TITLE'                   // 'Information'  (top title)
	width         : N                         // 400            (info width)
	
	tab           : [ FUNCTION, ... ]         // ***            (info() functions - blank for current)
	tablabel      : [ 'LABEL', ... ]          // ***            (tabs for switch between multiple infos)
	
	content       : 'HTML'                    // ***            (custom html <table> input content)
	height        : N                         // (fit)          (infocontent height)
	
	message       : 'MESSAGE'                 // (blank)        (message under title)
	messagealign  : 'CSS'                     // 'center'
	footer        : 'FOOTER'                  // (blank)        (footer above buttons)
	footeralign   : 'CSS'                     // (blank)
	
	textlabel     : [ 'LABEL', ... ]          // ***            (label array input label)
	textalign     : 'CSS'                     // 'left'         (input text alignment)
	focus         : N                         // --             (focused input)
	
	passwordlabel : 'LABEL'                   // (blank)        (password input label)
	
	textarea      : true                      // ***
	
	boxwidth      : N                         // 200            (input text/password width - 'max' to fit)
	
	radio         : { LABEL: 'VALUE', ... }   // ***
	                [ 'VALUE', ... ]                            (label = value)
	radiocolumn   : true                      // --             (layout 2 colums)
	
	checkbox      : [ 'LABEL', ... ]          // ***            (value = true/false if not json)
	                { LABEL: 'VALUE', ... }  
	checkcolumn   : true                      // --             (layout 2 colums)
	
	select        : { LABEL: 'VALUE', ... }   // ***
	                [ LABEL, ... ]                              (option label = value)
	selectlabel   : 'LABEL'                   // (blank)        (select input label)
	
	rangelabel    : 'LABEL'                   // ***            (input range label)
	rangesub      : 'SUBLABEL'                '' --             (sublabel under range)
	
	order         : [ TYPE, ... ]             // (sequence)     (order of *** inputs)
	
	beforeshow    : FUNCTION                  // --             (function after values set)
	
	filelabel     : 'LABEL'                   // ***            (browse button label)
	fileoklabel   : 'LABEL'                   // 'OK'           (upload button label)
	filetype      : '.EXT, ...'               // --             (filter and verify filetype (with 'dot' - 'image/*' for all image types)
	
	button        : [ FUNCTION, ... ]         // --             (function array)
	buttonlabel   : [ 'LABEL', ... ]          // ***            (extra buttons - label array)
	buttoncolor   : [ 'COLOR', ... ]          // 'var( --cm )'  (color array)
	buttonfit     : 1                         // --             (fit buttons width to label)
	
	cancel        : FUNCTION                  // (reset)        (cancel click function)
	cancellabel   : 'LABEL'                   // ***            (cancel button label)
	cancelcolor   : 'COLOR'                   // 'var( --cg )'  (cancel button color)
	cancelshow    : true                      // (hide)         (show cancel button)
	
	ok            : FUNCTION                  // (reset)        (ok click function)
	okno          : true                      // (show)         (no ok button)
	oklabel       : 'LABEL'                   // ('OK')         (ok button label)
	okcolor       : 'COLOR'                   // 'var( --cm )'  (ok button color)
	oknoreset     : true                      // --             (keep info open + omit reset; reset by cancel only)
	
	confirm       : 'CONFIRM'                 // --             (confirm prompt)
	confirmno     : FUNCTION                  // --             (skip confirm if FUNCTION true)
	
	checkchanged  : true                      // --             (check values changed)
	checkblank    : true or [ i, ... ]        // --             (check values not blank /  [ partial ] )
	checkip       : [ i, ... ]                // --             (check valid ip)
	checklength   : { i: N, . }               // --             (required N characters in i)
	                { i: [ N, 'COND' ], ... }                   (required N: characters; COND: min, max; in i)
	
	values        : [ 'VALUE', ... ]          // --             (default values - in layout order)
	                { KEY: 'VALUE', ... }                       (return bash var - [ 'KEY=value', ... ])
} );
`;

$( '#infoOverlay' ).on( 'click', '#infoIcon', function() {
	V.consolelog = true;
	setTimeout( ()=>  delete V.consolelog, 300 );
	$( '#infoOk' ).click();
} ).press( '#infoIcon', function() {
	info( {
		  icon     : 'help'
		, title    : 'Usage'
		, width    : '100%'
		, boxwidth : '100%'
		, textarea : true
		, values   : usage
		, okno     : true
		, beforeshow : () => $( '#infoContent textarea' ).css( 'height', window.innerHeight - 120 )
	} );
} ).on( 'click', '#infoContent', function() {
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} );
$( '#infoOverlay' ).keydown( function( e ) {
/*
all:      [Tab]       - focus / next input
		  [Shift+Tab] - previous input
radio:    [L] [R]     - check
checkbox: [space]     - check
select:   [U] [D]     - check
*/
	if ( ! I.active ) return
	
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
			var activeinput = $( document.activeElement ).attr( 'type' );
			if ( [ 'text', 'password', 'textarea' ].includes( activeinput ) ) return
			
			var $tabactive = $( '#infoTab a.active' );
			if ( key === 'ArrowLeft' ) {
				$tabactive.is(':first-child') ? $( '#infoTab a:last-child' ).click() : $tabactive.prev().click();
			} else {
				$tabactive.is(':last-child') ? $( '#infoTab a:first-child' ).click() : $tabactive.next().click();
			}
			break;
	}
} );
	
I = { active: false }
var $infocontent;

function info( json ) {
	local(); // flag for consecutive info
	I          = json;
	
	if ( 'values' in I ) {
		if ( ! Array.isArray( I.values ) ) {
			if ( typeof I.values === 'object' ) { // json
				I.keys   = Object.keys( I.values );
				I.values = Object.values( I.values );
			} else {
				I.values = [ I.values ];
			}
		}
	} else {
		I.values = false;
	}
	// fix: narrow screen scroll
	if ( window.innerWidth < 768 ) $( 'body' ).css( 'overflow-y', 'auto' );
	
	$( '#infoOverlay' ).html( `
<div id="infoBox">
	<div id="infoTopBg">
		<div id="infoTop"><i id="infoIcon"></i><a id="infoTitle"></a></div>${ ico( 'close', 'infoX' ) }
	</div>
	<div id="infoContent"></div>
	<div id="infoButton"></div>
</div>
` );
	$infocontent = $( '#infoContent' );
	$( '#infoBox' ).css( 'margin-top', $( window ).scrollTop() );
	
	// title
	if ( I.width ) $( '#infoBox' ).css( 'width', I.width );
	if ( I.height ) $( '#infoContent' ).css( 'height', I.height );
	if ( I.icon ) {
		I.icon.charAt( 0 ) !== '<' ? $( '#infoIcon' ).addClass( 'i-'+ I.icon ) : $( '#infoIcon' ).html( I.icon );
	} else {
		$( '#infoIcon' ).addClass( 'i-help' );
	}
	var title = I.title || 'Information';
	$( '#infoTitle' ).html( title );
	// buttons
	var htmlbutton = '';
	if ( I.button ) {
		[ 'button', 'buttonlabel', 'buttoncolor' ].forEach( k => infoKey2array( k ) );
		I.button.forEach( ( fn, i ) => {
			htmlbutton += I.buttoncolor ? '<a style="background-color:'+ I.buttoncolor[ i ] +'"' : '<a';
			htmlbutton += ' class="infobtn extrabtn infobtn-primary">'+ I.buttonlabel[ i ] +'</a>';
		} );
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
		$( '#infoButton' )
			.html( htmlbutton )
			.removeClass( 'hide' );
	} else {
		$( '#infoButton' ).remove();
	}
	if ( I.button ) {
		$( '#infoButton' ).on( 'click', '.extrabtn', function() {
			var buttonfn = I.button[ $( this ).index( '.extrabtn' ) ];
			infoButtonCommand( buttonfn );
		} );
	}
	$( '#infoX, #infoCancel' ).click( function() {
		if ( ! I.confirm ) {
			infoButtonCommand( I.cancel, 'cancel' );
		} else {
			$( '#infoConfirm' ).hasClass( 'hide' )
				? infoButtonCommand( I.cancel, 'cancel' )
				: $( '#infoContent, #infoConfirm' ).toggleClass( 'hide' );
		}
	} );
	$( '#infoOk' ).click( function() {
		if ( ! I.confirm || ( 'confirmno' in I && I.confirmno() ) ) {
			infoButtonCommand( I.ok );
		} else {
			$( '#infoConfirm' ).hasClass( 'hide' )
				? $( '#infoContent, #infoConfirm' ).toggleClass( 'hide' )
				: infoButtonCommand( I.ok );
		}
	} );
	if ( I.fileoklabel ) { // file api
		var htmlfile = '<div id="infoFile">'
					  +'<code id="infoFilename" class="hide"></code>'
					  +'<input type="file" class="hide" id="infoFileBox"'
					  + ( I.filetype ? ' accept="'+ I.filetype +'">' : '>' )
					  +'</div>'
					  +'<a id="infoFileLabel" class="infobtn file infobtn-primary">'
					  + ( I.filelabel || ico( 'folder-open' ) +'File' ) +'</a>';
		$( '#infoButton' ).prepend( htmlfile )
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
			I.filechecked = true;
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
				$( '#infoButton' ).prepend( '<a class="btntemp infobtn infobtn-primary">OK</a>' );
				$( '#infoButton' ).one( 'click', '.btntemp', function() {
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
	// tab
	if ( I.tab ) {
		htmltab      = '<div id="infoTab">';
		I.tablabel.forEach( ( lbl, i ) => {
			var active = I.tab[ i ] ? '' : 'class="active"';
			htmltab += '<a '+ active +'>'+ lbl +'</a>';
		} );
		htmltab += '</div>';
		$( '#infoTopBg' ).after( htmltab );
		$( '#infoTab a' ).click( function() {
			if ( ! $( this ).hasClass( 'active' ) ) I.tab[ $( this ).index() ]();
		} );
		$( '#infoTab a' ).css( 'width', 100 / I.tablabel.length +'%' );
	}
	
	if ( I.content ) { // custom html content
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
			infoKey2array( 'textlabel' );
			htmls.text      = '';
			I.textlabel.forEach( lbl => htmls.text += '<tr><td>'+ lbl +'</td><td><input type="text"></td></tr>' );
		}
		if ( I.numberlabel ) {
			infoKey2array( 'numberlabel' );
			htmls.number    = '';
			I.numberlabel.forEach( lbl => htmls.number += '<tr><td>'+ lbl +'</td><td><input type="number"></td></tr>' );
		}
		if ( I.passwordlabel ) {
			infoKey2array( 'passwordlabel' );
			htmls.password      = '';
			I.passwordlabel.forEach( lbl => htmls.password += '<tr><td>'+ lbl +'</td><td><input type="password"></td></tr>' );
		}
		if ( I.textarea ) {
			htmls.textarea = '<textarea></textarea>';
		}
		var td0 = htmls.text || htmls.password ? '<td></td>' : '';
		if ( I.radio ) {
			infoKey2array( 'radio' );
			I.radio.forEach( radio => {
				if ( Array.isArray( radio ) ) {
					var kv = {}
					radio.forEach( v => kv[ v ] = v );
					radio = kv;
				}
				var line;
				var i       = 0;
				htmls.radio = '';
				$.each( radio, ( k, v ) => {
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
			} );
		}
		if ( I.checkbox ) {
			infoKey2array( 'checkbox' );
			var isstring   = typeof I.checkbox[ 0 ] === 'string';
			var line, lbl, val;
			var i          = 0;
			htmls.checkbox = '';
			$.each( I.checkbox, ( k, v ) => { // i, k
				if ( isstring ) {
					lbl = v;
				} else {
					lbl = k;
					val = 'value="'+ v +'"';
				}
				line = '<td>'+ ( lbl ? '<label><input type="checkbox" '+ val +'>'+ lbl +'</label>' : '' ) +'</td>';
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
			infoKey2array( 'select' );
			infoKey2array( 'selectlabel' );
			htmls.select = '';
			I.select.forEach( ( el, i ) => {
				htmls.select += '<tr><td>'+ ( I.selectlabel[ i ] || '' ) +'</td><td><select>';
				if ( typeof el !== 'object' ) {     // html
					htmls.select += el;
				} else if ( Array.isArray( el ) ) { // name = value
					el.forEach( v => htmls.select += '<option value="'+ v +'">'+ v +'</option>' );
				} else {                            // json
					$.each( el, ( k, v ) => htmls.select += '<option value="'+ v.toString().replace( /"/g, '&quot;' ) +'">'+ k +'</option>' );
				}
				htmls.select += '</select></td></tr>';
			} );
		}
		if ( I.rangelabel ) {
			infoKey2array( 'rangelabel' );
			htmls.range = '<div id="infoRange">'
			I.rangelabel.forEach( range => {
				htmls.range += '<div class="name">'+ I.rangelabel +'</div>'
							  +'<div class="value gr"></div>'
							  +'<a class="min">0</a><input type="range" min="0" max="100"><a class="max">100</a>'
							  + ( I.rangesub ? '<div class="sub gr">'+ I.rangesub +'</div>' : '' )
			} );
			htmls.range += '</div>';
		}
		var htmlcontent = '';
		htmlcontent    += htmls.tab || '';
		htmlcontent    += htmls.message || '';
		if ( ! I.order ) I.order = [ 'text', 'number', 'password', 'textarea', 'radio', 'checkbox', 'select', 'range' ];
		var htmlinputs  = '';
		I.order.forEach( type => {
			if ( type in htmls ) htmlinputs += htmls[ type ];
		} );
		if ( htmlinputs ) htmlcontent += '<table>'+ htmlinputs +'</table>';
		htmlcontent    += htmls.footer || '';
	}
	if ( ! htmlcontent ) {
		$( '#infoButton' ).css( 'padding', '0 0 20px 0' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		infoButtonWidth();
		return
	}
	
	// populate layout //////////////////////////////////////////////////////////////////////////////
	if ( I.confirm ) $( '#infoContent' ).after( '<div id="infoConfirm" class="infomessage hide">'+ I.confirm +'</div>' );
	
	$( '#infoContent' ).html( htmlcontent ).promise().done( function() {
		
		$( '#infoContent input:text' ).prop( 'spellcheck', false );
		// get all input fields
		$inputbox = $( '#infoContent' ).find( 'input:text, input[type=number], input:password, textarea' );
		$input    = $( '#infoContent' ).find( 'input, select, textarea' );
		var name, nameprev;
		$input    = $input.filter( ( i, el ) => { // filter each radio per group ( multiple inputs with same name )
			name = el.name;
			if ( ! name ) {
				return true
			} else if (	name !== nameprev ) {
				nameprev = name;
				return true
			}
		} );
		// assign values
		infoSetValues();
		
		$( '#infoOverlay' ).removeClass( 'hide' );
		I.active = true;
		if ( 'focus' in I ) {
			$inputbox.eq( I.focus ).focus();
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
		$( '#infoContent' ).find( 'input:text, input[type=number], input:password, textarea, select' ).parent().css( 'width', I.boxW );
		if ( $( '#infoContent select' ).length ) selectSet(); // render select to set width
		if ( ! I.contentcssno && $( '#infoContent tr:eq( 0 ) td' ).length > 1 ) { // column gutter
			var $td1st = $( '#infoContent td:first-child' );
			var input  = $td1st.find( 'input' ).length;
			$td1st.css( {
				  'padding-right': input ? '10px' : '5px' // checkbox/radio gutter : text label
				, 'text-align'   : input ? '' : 'right'   // text label
			} ); 
		}
		if ( ( I.messagealign || I.footeralign ) && htmlinputs ) {
			var tblW = $( '#infoContent table' ).width();
			$( '#infoContent' ).find( '.infomessage, .infofooter' ).css( 'width', tblW );
		}
		if ( I.rangelabel ) {
			$( '#infoRange input' ).on( 'click input keyup', function() {
				$( '#infoRange .value' ).text( $( this ).val() );
			} );
		}
		// custom function before show
		if ( I.beforeshow ) I.beforeshow();
		$( '#infoContent input:password' ).parent().after( '<td>'+ ico( 'eye' ) +'</td>' );
		if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( '#infoContent a' ).removeAttr( 'href' );
	} );
	$( '#infoContent .i-eye' ).click( function() {
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
		if ( I.checkblank === true ) I.checkblank = [ ...Array( $inputbox.length ).keys() ];
		infoKey2array( 'checkblank' );
		infoCheckBlank();
	} else {
		I.blank = false;
	}
	if ( I.checkip ) {
		infoKey2array( 'checkip' );
		infoCheckIP();
	} else {
		I.notip = false;
	}
	I.checklength  ? infoCheckLength() : I.short = false;
	I.nochange = I.values && I.checkchanged ? true : false;
	$( '#infoOk' ).toggleClass( 'disabled', I.blank || I.notip || I.short || I.nochange ); // initial check
	infoCheckSet();
}

function infoButtonCommand( fn, cancel ) {
	if ( typeof fn === 'function' ) fn();
	if ( cancel ) delete I.oknoreset;
	if ( V.consolelog || ( ! V.local && I.oknoreset ) ) return // consecutive info / no reset
	
	if ( I.oknoreset ) {
		$( '#infoContent, #infoConfirm' ).toggleClass( 'hide' );
		return
	}
	
	I = { active: false }
	$( '#infoOverlay' )
		.addClass( 'hide' )
		.removeAttr( 'style' )
		.empty();
	$( 'body' ).css( 'overflow-y', '' );
}
function infoButtonWidth() {
	if ( I.buttonfit ) return
	
	var $buttonhide = $( '#infoButton a.hide' );
	$buttonhide.removeClass( 'hide' );
	var widest = 0;
	$( '#infoButton a' ).each( ( i, el ) => {
		var w = $( el ).outerWidth();
		if ( w > widest ) widest = w;
	} );
	$buttonhide.addClass( 'hide' );
	if ( widest > 70 ) $( '.infobtn, .filebtn' ).css( 'min-width', widest );
}
function infoCheckBlank() {
	if ( ! I.checkblank ) return // suppress error on repeating
	
	I.blank = I.checkblank.some( i => $inputbox.eq( i ).val().trim() === '' );
}
function infoCheckIP() {
	var regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/; // https://stackoverflow.com/a/36760050
	I.notip = I.checkip.some( i => {
		return ! regex.test( $inputbox.eq( i ).val() );
	} );
}
function infoCheckLength() {
	I.short = false;
	$.each( I.checklength, ( k, v ) => {
		if ( ! Array.isArray( v ) ) {
			var L    = v
			var cond = 'equal';
		} else {
			var L    = v[ 0 ];
			var cond = v[ 1 ];
		}
		var diff = $input.eq( k ).val().trim().length - L;
		if ( ( cond === 'equal' && diff !== 0 ) || ( cond === 'min' && diff < 0 ) || ( cond === 'max' && diff > 0 ) ) {
			I.short = true;
			return false
		}
	} );
}
function infoCheckSet() {
	if ( I.checkblank || I.checkip || I.checklength || I.checkchanged ) {
		$inputbox.on( 'keyup paste cut', function() {
			if ( I.checkblank ) setTimeout( infoCheckBlank, 0 ); // ios: wait for value
			if ( I.checklength ) setTimeout( infoCheckLength, 25 );
			if ( I.checkip ) setTimeout( infoCheckIP, 50 );
			if ( I.checkchanged ) {
				var values  = infoVal( 'array' );
				I.nochange  = I.values.join( '' ) === values.join( '' );
			}
			setTimeout( () => {
				$( '#infoOk' ).toggleClass( 'disabled', I.blank || I.notip || I.short || I.nochange )
			}, 75 ); // ios: force after infoCheckLength
		} );
	}
	if ( I.checkchanged ) {
		$( '#infoContent' ).find( 'input:radio, input:checkbox, select' ).on( 'change', function() {
			var values = infoVal( 'array' );
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
		infoFileImageLoad();
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
					infoFileImageLoad();
				}
			} );
	}
}
function infoFileImageLoad() {
	V.pica ? infoFileImageReader() : $.getScript( '/assets/js/plugin/'+ jfiles.pica, infoFileImageReader );
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
				V.pica = pica.resize( filecanvas, canvas, picaOption ).then( function() {
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
			+ ( src.slice( 0, 4 ) === 'blob' ? '' : '<br>'+ ico( 'redo rotate' ) +'&ensp;Tap to rotate' )
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
function infoKey2array( key ) {
	if ( ! Array.isArray( I[ key ] ) ) I[ key ] = [ I[ key ] ];
}
function infoSetValues() {
	var $this, type, val;
	$input.each( ( i, el ) => {
		$this = $( el );
		type  = $this.prop( 'type' );
		val   = I.values[ i ];
		if ( type === 'radio' ) { // reselect radio by name
			if ( val ) {
				$( '#infoContent input:radio[name='+ el.name +']' ).val( [ val ] );
			} else {
				$( '#infoContent input:radio' ).eq( 0 ).prop( 'checked', true );
			}
		} else if ( type === 'checkbox' ) {
			$this.prop( 'checked',  val );
		} else if ( $this.is( 'select' ) ) {
			val ? $this.val( val ) : el.selectedIndex = 0;
		} else { // text, password, textarea, range
			$this.val( val );
			if ( type === 'range' ) $('#infoRange .value' ).text( val );
		}
	} );
}
function infoVal( format ) {
	var $this, type, name, val;
	var values = [];
	$input.each( ( i, el ) => {
		$this = $( el );
		type  = $this.prop( 'type' );
		switch ( type ) {
			case 'radio': // radio has only single checked - skip unchecked inputs
				val = $( '#infoContent input:radio[name='+ el.name +']:checked' ).val();
				if ( val === 'true' ) {
					val = true;
				} else if ( val === 'false' ) {
					val = false;
				}
				break;
			case 'checkbox':
				val = $this.prop( 'checked' );
				if ( val && $this.attr( 'value' ) ) val = $this.val(); // if value defined
				break;
			case 'textarea':
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
		if (   typeof val !== 'string'              // boolean
			|| isNaN( val )                         // NotaNumber 
			|| val[ 0 ] === '0' && val[ 1 ] !== '.' // '0123' not 0.123
		) {
			values.push( val );
		} else {
			values.push( parseFloat( val ) );
		}
	} );
	if ( ! I.keys ) return values.length > 1 ? values : values[ 0 ] // array : single value as string
	if ( format === 'array' ) return values
	if ( format === 'KEY' ) {
		var keys = I.keys.join( ' ' );
		if ( I.fileconf ) {
			keys += ' fileconf';
			values.push( I.fileconf );
		}
		return [ 'KEY', keys, ...values ]
	}
	var v = {}
	I.keys.forEach( ( k, i ) => v[ k ] = values[ i ] );
	return v // json
}

// common info functions --------------------------------------------------
function infoPower() {
	info( {
		  icon        : 'power'
		, title       : 'Power'
		, buttonlabel : ico( 'reboot' ) +'Reboot'
		, buttoncolor : orange
		, button      : () => infoPowerCommand( 'reboot' )
		, oklabel     : ico( 'power' ) +'Off'
		, okcolor     : red
		, ok          : () => infoPowerCommand( 'poweroff' )
	} );
}
function infoPowerCommand( action ) {
	bash( [ action ], nfs => {
		if ( nfs != -1 ) return
		
		var poweroff = action === 'poweroff';
		info( {
			  icon    : 'power'
			, title   : 'Power'
			, message : 'This <wh>Server rAudio '+ ico( 'rserver' ) +'</wh> is currently active.'
						+'<br><wh>Shared Data</wh> on clients will stop.'
						+'<br>(Resume when server online again)'
						+'<br><br>Continue?'
			, oklabel : poweroff ? ico( 'power' ) +'Off' : ico( 'reboot' ) +'Reboot'
			, okcolor : poweroff ? red : orange
			, ok      : () => {
				bash( [ action, 1 ] );
				banner( 'rserver', 'Server rAudio', 'Notify clients ...', -1 );
			}
		} );
	} );
}
function infoWarning( icon, title, message ) {
	info( {
		  icon    : icon
		, title   : title
		, message : iconwarning + message
	} );
}

// json -----------------------------------------------------------------
function escapeQuote( v ) {
	return v.replace( /"|`/g, '\\\\"' )
}
function stringQuote( v ) {
	var singlequote = v.includes( "'" );
	var doublequote = v.includes( '"' );
	var space       = v.includes( ' ' );
	if ( ! singlequote && ! doublequote && ! space ) return v                                  //  v
	if ( doublequote && ! singlequote )              return "'"+ v + "'"                       // 'v "v" v'
	if ( singlequote || doublequote )                return '"'+ v.replace( /"/g, '\\"' ) +'"' // "v 'v' \"v\""
	/* space */                                      return "'"+ v + "'"                       // 'v ...'
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
	V.local = true;
	setTimeout( () => V.local = false, delay || 300 );
}

// pushstream -----------------------------------------------------------------
$( '#bar-top, .head' ).press( function() {
	V.debug = true;
	banner( 'gear', 'Pushstream', 'No disconnect.' )
} );

if ( ! [ 'addonsprogress', 'guide' ].includes( page )  ) {
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
		V[ type ] = true;
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
					$( '#loader svg' ).css( 'animation', 'none' );
					bannerHide();
					loader();
				}, 10000 );
			}
		}
	}
	// page visibility -----------------------------------------------------------------
	var active  = true; // fix: multiple firings
	var select2 = false; // fix: closing > blur > disconnect
	function connect() {
		if ( active || V.off ) return
		
		active = true;
		pushstream.connect();
	}
	function disconnect() {
		if ( ! active || V.debug ) return
		
		active = false;
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
		var searchbox = false;
		if ( $( '#eq' ).length ) options.dropdownParent = $( '#eq' );
	}
	if ( ! searchbox ) options.minimumResultsForSearch = Infinity;
	$select
		.select2( options )
		.on( 'select2:closing', () => select2 = true )
		.on( 'select2:close',   () => select2 = false )
		.each( ( i, el ) => {
			var $this = $( el );
			if ( $this.find( 'option' ).length === 1 ) $this.prop( 'disabled', true );
		} );
}
function selectText2Html( pattern ) {
	function htmlSet( $el ) {
		$.each( pattern, ( k, v ) => {
			if ( $el.text() === k ) $el.html( v );
		} );
	}
	var $rendered = $( '.select2-selection__rendered' ).eq( 0 );
	htmlSet( $rendered );
	$( '#infoContent select' ).on( 'select2:open', () => {
		setTimeout( () => $( '.select2-results__options li' ).each( ( i, el ) => htmlSet( $( el ) ) ), 0 );
	} ).on( 'select2:select', function() {
		htmlSet( $rendered );
	} );
}
