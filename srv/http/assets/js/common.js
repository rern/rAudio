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
var blinkdot    = '<a class="dot dot1">·</a>&ensp;<a class="dot dot2">·</a>&ensp;<a class="dot dot3">·</a>';

// ----------------------------------------------------------------------
/*
$( ELEMENT ).press( DELEGATE, function( e ) {
	- this not applicable
	- cannot be attached with .on
	- DELEGATE : optional
} );
events:
	- move  : mouseenter > mousemove > mouseleave > mouseout
	- click : mousedown  > mouseup   > click
	- touch : touchstart > touchmove > touchend
*/
$.fn.press = function( arg1, arg2 ) {
	var callback, delegate, timeout;
	if ( arg2 ) { 
		delegate = arg1;
		callback = arg2;
	} else {
		delegate = '';
		callback = arg1;
	}
	this.on( 'touchstart mousedown', delegate, function( e ) {
		timeout = setTimeout( () => {
			V.press = true;
			callback( e ); // e.currentTarget = ELEMENT
		}, 1000 );
	} ).on( 'touchend mouseup mouseleave', delegate, function() {
		clearTimeout( timeout );
		setTimeout( () => V.press = false, 300 ); // needed for mouse events
	} );
	return this // allow chain
}

// ----------------------------------------------------------------------
/*
Simple spaced arguments
	- [ 'CMD.sh', v1, v2, ... ] - CMD.sh $1 $2 ...
Multiline arguments - no escape \" \` in js values > escape in php instead
	- [ CMD, v1, v2, ... ]                  - script.sh $CMD ON=1 "${args[1]}" "${args[2]}" ...
	- [ CMD, 'OFF' ]                        - script.sh $CMD ON=  (disable CMD)
	- [ CMD, v1, v2, ..., 'CMD K1 K2 ...' ] - script.sh $CMD ON=1 "$K1" "$K2" ...
	- [ CMD, v1, v2, ..., 'CFG K1 K2 ...' ] -        ^^^                     and save K1=v1; K2=v2; ... to $dirsystem/$CMD.conf
	- { cmd: [ CMD, ... ], json: JSON }     -        ^^^                     and save {"K1":"v1", ... } to $dirsystem/$CMD.json

- js > php   >> common.js - bash()
	- string : 
		- array of lines : [ 'CMD' v1, v2, ..., 'CMD K1 K2 ...' ]
		- multiline      : 'l1\\nl2\\nl3...'
	- json   : json.sringify( JSON )
- php > bash >> cmd.php   - $_POST[ 'cmd' ] === 'bash'
	- array : covert to multiline with " ` escaped > CMD "...\"...\n...\`..."
	- json  : decode > reencode > save to $dirsystem/$CMD.json ($_POST[ 'json' ])
		- js cannot escape " as \\" double backslash which disappeared in bash
- bash       >> common.sh - args2var
	- convert to array > assign values
		- No 'CMD'   : ${args[1]} == v1; ${args[2]} == v2; ...
		- With 'CMD' : $K1        == v1; $K2        == v2; ... ($VAR in capital)
		- With 'CFG' : 
			- the same as 'CMD'
			- save to $dirsystem/$CMD.conf  with " ` escaped and quote > K1="... ...\"...\n...\`..."
*/
function bash( args, callback, json ) {
	var data = { cmd: 'bash' }
	if ( 'json' in args ) {
		data.json = JSON.stringify( args.json );
		args = args.cmd;
	}
	var args0 = args[ 0 ];
	if (  [ '.sh', '.py' ].includes( args0.slice( -3 ) ) ) { // CMD.sh / CMD.py
		data.filesh = args.join( ' ' );
		args = false;
	} else if ( page ) {                 // CMD - settings
		data.filesh = 'settings/'+ page +'.sh';                            // default
		if ( args0 === 'mount' ) data.filesh = 'settings/system-mount.sh'; // not default
	} else {                             // CMD - playback
		data.filesh = 'cmd.sh';
		if ( [ 'scrobble', 'tageditor' ].includes( args0 ) ) data.filesh = args0 +'.sh';
	}
	if ( args ) data.args = args;
/*
V.debug - press: $( '#debug' )
	- all
	- console.log commands
	- active pushstream (no disconnect)
V.consolelog - press: $( '#infoOk' ) / $( '.switch' )
	- each
	- console.log commands only (NOT run)
*/
	if ( V.debug || V.consoleonly ) {
		var bashcmd = data.filesh.replace( 'settings/', '' );
		if ( data.args ) bashcmd += ' "\\\n'+ data.args.join( '\n' ).replace( /"/g, '\\"' ) +'"';
		console.log( data );
		console.log( bashcmd );
		if ( V.consoleonly ) {
			setTimeout( () => page ? switchCancel() : bannerHide(), 5000 );
			return
		}
	}
	
	$.post( 
		 'cmd.php'
		, data
		, callback || null
		, json || null
	);
}
// debug
$( '#debug' ).press( function() {
	V.debug = true;
	banner( 'gear', 'Debug', 'Console.log + Pushstream', 5000 );
	bash( [ 'cmd.sh', 'cachebust' ] );
} );
$( '#infoOverlay' ).press( '#infoOk', function() {
	V.consoleonly = true;
	I.ok();
} );
$( '.col-r .switch' ).press( function( e ) {
	if ( $( '#setting-'+ e.target.id ).length && ! S[ e.target.id ] ) {
		$( '#setting-'+ e.target.id ).trigger( 'click' );
		return
	}
	
	V.consoleonly = true;
	switchIdIconTitle( e.target.id );
	notifyCommon( S[ SW.id ] ? 'Disable ...' : 'Enable ...' );
	bash( S[ SW.id ] ? [ SW.id, 'OFF' ] : [ SW.id ] );
} );
	
// ----------------------------------------------------------------------
function banner( icon, title, message, delay ) {
	clearTimeout( I.timeoutbanner );
	var bottom = $( '#bar-bottom' ).is( '.transparent, :hidden' ) || ! $( '#loader' ).hasClass( 'hide' ) ? '10px' : '';
	$( '#banner' )
		.html( '<div id="bannerIcon">'+ ico( icon ) +'</div><div id="bannerTitle">'+ title +'</div>'
			  +'<div id="bannerMessage">'+ message +'</div>' )
		.css( 'bottom', bottom )
		.removeClass( 'hide' );
	if ( delay !== -1 ) I.timeoutbanner = setTimeout( bannerHide, delay || 3000 );
}
function bannerHide() {
	if ( $( '#banner' ).hasClass( 'hide' ) || V.reboot ) return
	
	$( '#banner' )
		.addClass( 'hide' )
		.empty();
}
$( '#banner' ).on( 'click', bannerHide );

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
	json = json.replace( /</g, '&lt;' );
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
$( '#infoOverlay' ).press( '#infoIcon', function() { // usage
	window.open( 'https://github.com/rern/js/blob/master/info/README.md#infojs', '_blank' );
} );
$( '#infoOverlay' ).on( 'click', '#infoContent', function() {
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} );
$( '#infoOverlay' ).on( 'keydown', function( e ) {
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
			if ( ! $( '#infoOk' ).hasClass( 'disabled' ) && ! $( 'textarea' ).is( ':focus' ) ) $( '#infoOk' ).trigger( 'click' );
			break;
		case 'Escape':
			local(); // prevent toggle setting menu
			$( '#infoX' ).trigger( 'click' );
			break;
		case 'ArrowLeft':
		case 'ArrowRight':
			var activeinput = $( document.activeElement ).attr( 'type' );
			if ( [ 'text', 'password', 'textarea' ].includes( activeinput ) ) return
			
			var $tabactive = $( '#infoTab a.active' );
			if ( key === 'ArrowLeft' ) {
				$tabactive.is(':first-child') ? $( '#infoTab a:last-child' ).trigger( 'click' ) : $tabactive.prev().trigger( 'click' );
			} else {
				$tabactive.is(':last-child') ? $( '#infoTab a:first-child' ).trigger( 'click' ) : $tabactive.next().trigger( 'click' );
			}
			break;
	}
} );
	
I = { active: false }
var $infocontent;

function info( json ) {
	local(); // flag for consecutive info
	I          = json;
	V.iwidth   = I.width;
	
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
	if ( V.wW < 768 ) $( 'body' ).css( 'overflow-y', 'auto' );
	
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
	$( '#infoX, #infoCancel' ).on( 'click', function() {
		infoButtonCommand( I.cancel, 'cancel' );
	} );
	$( '#infoOk' ).on( 'click', function() {
		if ( V.press || $( this ).hasClass( 'disabled' ) ) return
		
		infoButtonCommand( I.ok );
	} );
	if ( I.fileoklabel ) { // file api
		var htmlfile = '<div id="infoFile">'
					  +'<c id="infoFilename" class="">(select file)</c><br>&nbsp;'
					  +'<input type="file" class="hide" id="infoFileBox"'
					  + ( I.filetype ? ' accept="'+ I.filetype +'">' : '>' )
					  +'</div>'
					  +'<a id="infoFileLabel" class="infobtn file infobtn-primary">'
					  + ( I.filelabel || ico( 'folder-open' ) +' File' ) +'</a>';
		$( '#infoButton' ).prepend( htmlfile )
		$( '#infoOk' )
			.html( I.fileoklabel )
			.addClass( 'hide' );
		$( '#infoFileLabel' ).on( 'click', function() {
			$( '#infoFileBox' ).trigger( 'click' );
		} );
		$( '#infoFileBox' ).on( 'change', function() {
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
				$( '#infoContent' ).html( '<table><tr><td>Selected file :</td><td><c>'+ filename +'</c></td></tr>'
										 +'<tr><td>File not :</td><td><c>'+ I.filetype +'</c></td></tr></table>' );
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
		$( '#infoTab a' ).on( 'click', function() {
			if ( ! $( this ).hasClass( 'active' ) ) I.tab[ $( this ).index() ]();
		} );
	}
	
	if ( I.content ) { // custom html content
		var htmlcontent = I.content;
	} else {
		var htmls = {};
		[ 'header', 'message', 'footer' ].forEach( k => {
			if ( I[ k ] ) {
				var kalign = k +'align'
				var align = I[ kalign ] ? ' style="text-align:'+ I[ kalign ] +'"' : '';
				htmls[ k ] = '<div class="info'+ k +'" '+ align +'>'+ I[ k ] +'</div>';
			}
		} );
		// inputs html ///////////////////////////////////////////////////////////
		if ( I.textlabel ) {
			infoKey2array( 'textlabel' );
			htmls.text      = '';
			I.textlabel.forEach( lbl => htmls.text += '<tr class="trtext"><td>'+ lbl +'</td><td><input type="text"></td></tr>' );
		}
		if ( I.numberlabel ) {
			infoKey2array( 'numberlabel' );
			htmls.number    = '';
			I.numberlabel.forEach( lbl => htmls.number += '<tr class="trnumber"><td>'+ lbl +'</td><td><input type="number"></td></tr>' );
		}
		if ( I.passwordlabel ) {
			infoKey2array( 'passwordlabel' );
			htmls.password      = '';
			I.passwordlabel.forEach( lbl => htmls.password += '<tr class="trpassword"><td>'+ lbl +'</td><td><input type="password"></td></tr>' );
		}
		if ( I.textarea ) {
			htmls.textarea = '<textarea></textarea>';
		}
		var td0 = htmls.text || htmls.number || htmls.password ? '<td></td>' : '';
		if ( I.radio ) {
			if ( Array.isArray( I.radio ) ) {
				var kv = {}
				I.radio.forEach( v => kv[ v ] = v );
				I.radio = kv;
			}
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
					var html = k ? '<label><input type="radio" name="inforadio" value="'+ v +'">'+ k +'</label>' : '';
					if ( I.radiosingle ) {
						htmls.radio += html +'&emsp;';
					} else {
						line = '<td>'+ html +'</td>';
						if ( ! I.radiocolumn ) {
							htmls.radio += '<tr class="trradio">'+ td0 + line +'</tr>';
						} else {
							i++
							if ( i % 2 ) {
								htmls.radio += '<tr class="trradio">'+ td0 + line;
								return
							} else {
								htmls.radio += line +'</tr>';
							}
						}
					}
				} );
				if ( I.radiosingle ) htmls.radio = '<tr class="trradio"><td></td><td>'+ htmls.radio +'</td></tr>';
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
					htmls.checkbox += '<tr class="trcheckbox">'+ td0 + line +'</tr>';
				} else {
					i++
					if ( i % 2 ) {
						htmls.checkbox += '<tr class="trcheckbox">'+ td0 + line;
						return
					} else {
						htmls.checkbox += line +'</tr>';
					}
				}
			} );
		}
		if ( I.select ) {
			if ( ! Array.isArray( I.selectlabel ) ) {
				I.selectlabel = [ I.selectlabel ];
				I.select      = [ I.select ];
			}
			htmls.select = '';
			I.select.forEach( ( el, i ) => {
				htmls.select +=  '<tr class="trselect"><td>'+ ( I.selectlabel[ i ] || '' ) +'</td><td><select>'
								+ ( el[ 0 ] === '<' ? el : htmlOption( el ) )
								+'</select></td></tr>';
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
		var htmlcontent = htmls.header || '';
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
		I.active = true;
		$( '#infoButton' ).css( 'padding', '0 0 20px 0' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		$( '#infoBox' ).css( 'margin-top', $( window ).scrollTop() );
		infoButtonWidth();
		return
	}
	
	// populate layout //////////////////////////////////////////////////////////////////////////////
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
		// set height shorter if checkbox / radio only
		$( '#infoContent tr' ).each( ( i, el ) => {
			var $this = $( el );
			if ( $this.find( 'input:checkbox, input:radio' ).length ) $this.css( 'height', '36px' );
		} );
		// show	
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
		infoWidth();
		if ( I.rangelabel ) {
			$( '#infoRange input' ).on( 'click input keyup', function() {
				$( '#infoRange .value' ).text( $( this ).val() );
			} );
		}
		if ( I.tab && $input.length === 1 ) $( '#infoContent' ).css( 'padding', '30px' );
		// custom function before show
		$( '#infoContent input:password' ).parent().after( '<td>'+ ico( 'eye' ) +'</td>' );
		if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( '#infoContent a' ).removeAttr( 'href' );
		// set at current scroll position
		$( '#infoBox' ).css( 'margin-top', $( window ).scrollTop() );
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
		if ( I.beforeshow ) I.beforeshow();
	} );
	$( '#infoContent .i-eye' ).on( 'click', function() {
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
}

function infoButtonCommand( fn, cancel ) {
	if ( typeof fn === 'function' ) fn();
	if ( cancel ) delete I.oknoreset;
	if ( V.local || V.press || I.oknoreset ) return // consecutive info / no reset
	
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
function infoVal( array ) {
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
			case 'number':
				val = +$this.val();
				break;
			default:
				val = $this.val();
		}
		if (   typeof val !== 'string'              // boolean
			|| val === ''                           // empty
			|| isNaN( val )                         // NotaNumber 
			|| val[ 0 ] === '0' && val[ 1 ] !== '.' // '0123' not 0.123
		) {
			values.push( val );
		} else {
			values.push( parseFloat( val ) );
		}
	} );
	if ( array ) return values                                      // array
	
	if ( ! I.keys ) return values.length > 1 ? values : values[ 0 ] // array or single value as string
	
	var v = {}
	I.keys.forEach( ( k, i ) => v[ k ] = values[ i ] );
	return v                                                        // json
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
	bash( [ 'power.sh', action ], nfs => {
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
				bash( [ 'power.sh', action, 1  ] );
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
function infoWidth() {
	if ( I.boxwidth ) {
		var widthmax = I.boxwidth === 'max';
		if ( widthmax ) {
			if ( I.width ) {
				var maxw = ( I.width > V.wW ? I.width : V.wW ) +'px';
			} else {
				var maxw = '';
			}
			$( '#infoBox' ).css( {
				  width       : V.wW > 600 ? '600px' : V.wW  +'px'
				, 'max-width' : maxw
			} );
		}
		var allW = $( '#infoContent' ).width();
		var labelW = $( '#infoContent td:first-child' ).width() || 0;
		I.boxW = ( widthmax ? allW - labelW - 20 : I.boxwidth );
	} else if ( ! I.contentcssno ) {
		I.boxW = 230;
	}
	if ( I.boxW ) $( '#infoContent' ).find( 'input:text, input[type=number], input:password, textarea, select' ).parent().css( 'width', I.boxW );
	if ( $( '#infoContent select' ).length ) selectSet(); // render select to set width
	if ( ! I.contentcssno && $( '#infoContent tr:eq( 0 ) td' ).length > 1 ) { // column gutter
		var $td1st = $( '#infoContent td:first-child' );
		var input  = $td1st.find( 'input' ).length;
		$td1st.css( {
			  'padding-right': input ? '10px' : '5px' // checkbox/radio gutter : text label
			, 'text-align'   : input ? '' : 'right'   // text label
		} ); 
	}
	if ( I.headeralign || I.messagealign || I.footeralign ) {
		$( '#infoContent' ).find( '.infoheader, .infomessage, .infofooter' ).css( 'width', $( '#infoContent table' ).width() );
	}
}

function capitalize( str ) {
	return str.replace( /\b\w/g, l => l.toUpperCase() );
}
function htmlOption( el ) {
	if ( typeof el === 'number' ) el = [ ...Array( el ).keys() ];
	var options = '';
	if ( Array.isArray( el ) ) { // name = value
		el = el.sort();
		el.forEach( v => options += '<option value="'+ v +'">'+ v +'</option>' );
	} else {                     // json
		el = jsonSort( el );
		$.each( el, ( k, v ) => options += '<option value="'+ v.toString().replace( /"/g, '&quot;' ) +'">'+ k +'</option>' );
	}
	return options
}
function jsonChanged( a, b ) {
	if ( ! a || ! b || ! Object.keys( a ).length || ! Object.keys( b ).length ) return true
	
	var changed = false;
	$.each( a, ( k, v ) => {
		if ( typeof v === 'object' ) {
			if ( jsonChanged( v, b[ k ] ) ) {
				changed = true;
				return false
			}
		} else {
			if ( v !== b[ k ] ) {
				changed = true;
				return false
			}
		}
	} );
	return changed
}
function jsonClone( json ) {
	return JSON.parse( JSON.stringify( json ) )
}
function jsonSort( json ) {
	return Object.keys( json ).sort().reduce( function ( result, key ) {
		result[ key ] = json[ key ];
		return result;
	}, {} );
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
if ( ! [ 'addonsprogress', 'guide' ].includes( page )  ) {
	function psNotify( data ) {
		var icon    = data.icon;
		var title   = data.title;
		var message = data.message;
		var delay   = data.delay;
		if ( [ 'Off ...', 'Reboot ...' ].includes( message ) ) {
			var type  = message.split( ' ' )[ 0 ].toLowerCase();
			V[ type ] = true;
			loader();
		} else if ( ! page ) {
			if ( message === 'Change track ...' ) { // audiocd
				clearIntervalAll();
			} else if ( title === 'Latest' ) {
				C.latest = 0;
				$( '#mode-latest gr' ).empty();
				if ( V.mode === 'latest' ) $( '#button-library' ).trigger( 'click' );
			}
		}
		banner( icon, title, message, delay );
	}

	var pushstream  = new PushStream( {
		  modes                                 : 'websocket'
		, reconnectOnChannelUnavailableInterval : 3000
	} );
	function pushstreamChannel( channels ) {
		channels.forEach( channel => pushstream.addChannel( channel ) );
		pushstream.connect();
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
			if ( typeof pushstreamDisconnect === 'function' ) pushstreamDisconnect();
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
	var active  = true;  // fix: multiple firings
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
	var options = { minimumResultsForSearch: 10 }
	if ( ! $select ) {
		$select = $( '#infoContent select' );
		if ( $( '#eq' ).length ) options.dropdownParent = $( '#eq' );
	}
	$select
		.select2( options )
		.on( 'select2:open',    () => { // fix: scroll on info - set current value 3rd from top
			setTimeout( () => {
				var scroll = $( '.select2-results__option--selected' ).index() * 36 - 72;
				if ( ! navigator.maxTouchPoints ) scroll -= 12;
				$( '.select2-results ul' ).scrollTop( scroll );
			}, 0 );
		} )
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

// websocket
var ws, wscommand;
function volumeDrag() {
	wscommand.send( [ 'volumedrag', S.volume, S.control, S.card, 'CMD TARGET CONTROL CARD' ].join( '\n' ) );
}
function volumePush() {
	bash( [ 'volumepushstream', S.volume, 'CMD VOLUME' ] );
}
function volumeSocket() {
	if ( ! wscommand ) {
		wscommand = new WebSocket( 'ws://'+ window.location.host +':8080' );
		wscommand.onclose = () => wscommand = null;
	}
}
