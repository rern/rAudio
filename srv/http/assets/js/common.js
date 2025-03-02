/*
$.fn.press
banner() dataError() 
info()   infoPower() infoPowerCommand() infoWarning()
loader() local()     selectSet()
websocket
bash()
*/
S               = {} // status
V               = {} // variable
W               = {  // ws push
	  bluetooth : () => {
		if ( page === 'networks' ) {
			S.listbt = data;
			renderBluetooth();
		} else if ( ! data ) {
			if ( page === 'system' ) $( '#bluetooth' ).removeClass( 'disabled' );
		} else if ( 'connected' in data ) {
			if ( page === 'features' ) {
				$( '#camilladsp' ).toggleClass( 'disabled', data.btreceiver );
			} else if ( page === 'system' ) {
				$( '#bluetooth' ).toggleClass( 'disabled', data.connected );
			}
		}
		bannerHide();
	}
	, notify : data => {
		if ( data === false ) {
			bannerHide();
			return
		}
		
		if ( V.relays ) {
			if ( ! data.title ) $( '#bannerMessage' ).html( data.message );
			return
		}
		
		var icon    = data.icon;
		var title   = data.title;
		var message = data.message;
		var delay   = data.delay;
		if ( ! title ) {
			V.relays    = true;
			$( '#infoX' ).trigger( 'click' )
		}
		if ( ! page ) {
			if ( message === 'Change track ...' ) { // audiocd
				intervalClear();
			} else if ( title === 'Latest' ) {
				C.latest = 0;
				$( '.mode.latest gr' ).empty();
				if ( V.mode === 'latest' ) $( '#button-library' ).trigger( 'click' );
			}
		}
		banner( icon, title, message, delay );
	}
	, power  : data => {
		loader();
		ws             = null;
		V[ data.type ] = true;
		banner( data.type +' blink', 'Power', V.off ? 'Off ...' : 'Reboot ...', -1 );
		if ( V.off ) {
			$( '#loader' ).css( 'opacity', 1 );
			setTimeout( () => {
				$( '#loader svg' ).css( 'animation', 'none' );
				$( '#banner' ).addClass( 'hide' );
			}, 10000 );
		} else { // reconnect after reboot
			setTimeout( websocketReconnect, data.startup + 5000 ); // add shutdown 5s
		}
	}
	, relays : data => {
		if ( 'reset' in data ) {
			$( '#infoX' ).trigger( 'click' );
			banner( 'relays', 'GPIO Relays', 'Reset idle timer to '+ data.reset +'m' );
			return
		}
		
		var relaysToggle = function() {
			clearInterval( V.intervalrelays );
			bannerHide();
			$( '#infoX' ).trigger( 'click' );
			if ( ! page ) {
				$( '#relays' ).toggleClass( 'on', S.relayson );
				$( ( $time.is( ':visible' ) ? '#ti' : '#mi' ) +'-relays' ).toggleClass( 'hide', ! S.relayson  );
			}
		}
		if ( 'done' in data ) {
			S.relayson = data.done;
			V.relays   = false;
			relaysToggle();
			return
		}
		
		if ( ! ( 'countdown' in data ) ) return
		
		info( {
			  icon        : 'relays'
			, title       : 'Equipments Off'
			, message     : '<div class="msgrelays"><object type="image/svg+xml" data="/assets/img/stopwatch.svg"></object><a>60</a></div>'
			, buttonlabel : ico( 'relays' ) +'Off'
			, buttoncolor : red
			, button      : () => bash( [ 'relays.sh', 'off' ] )
			, oklabel     : ico( 'set0' ) +'Reset'
			, ok          : () => bash( [ 'cmd.sh', 'relaystimerreset' ] )
		} );
		var delay        = 59;
		V.intervalrelays = setInterval( () => {
			delay ? $( '.infomessage a' ).text( delay-- ) : relaysToggle();
		}, 1000 );
	}
	, reload    : () => {
		if ( localhost ) location.reload();
	}
	, restore   : data => {
		if ( data.restore === 'done' ) {
			banner( 'restore', 'Restore Settings', 'Done' );
			setTimeout( () => location.href = '/', 2000 );
		} else {
			loader();
			banner( 'restore blink', 'Restore Settings', 'Restart '+ data.restore +' ...', -1 );
		}
	}
}
var page        = location.search.replace( /\?p=|&.*/g, '' ); // .../settings.php/p=PAGE&x=XXX... > PAGE
var iconwarning = ico( 'warning yl' ) +'&ensp;';
var localhost   = [ 'localhost', '127.0.0.1' ].includes( location.hostname );
var orange      = '#de810e';
var red         = '#bb2828';
var sortableOpt = {
	  delay               : 200
	, delayOnTouchOnly    : true
	, touchStartThreshold : 5
}
var ws;
// ----------------------------------------------------------------------
/*
$( ELEMENT ).press( { delegate: 'element', action: FUNCTION0, end: FUNCTION1 );
	- this not applicable
	- cannot be attached with .on
	- delagate - optional
events:
	- move  : mouseenter > mousemove > mouseleave > mouseout
	- click : mousedown  > mouseup   > click
	- touch : touchstart > touchmove > touchend
*/
$.fn.press = function( args ) {
	var action, delegate, end, timeout;
	if ( typeof args === 'function' ) {
		delegate = '';
		action   = args;
	} else {
		delegate = args.delegate;
		action   = args.action;
		end      = args.end;
	}
	this.on( 'touchstart mousedown', delegate, function( e ) {
		timeout = setTimeout( () => {
			V.press = true;
			action( e ); // e.currentTarget = ELEMENT
		}, 1000 );
	} ).on( 'touchend mouseup mouseleave', delegate, function() {
		clearTimeout( timeout );
		if ( ! V.press ) return
		
		setTimeout( () => { // after last action timeout
			if ( end ) end();
			setTimeout( () => V.press = false, 300 );
		}, 0 );
	} );
	return this // allow chain
}
// ----------------------------------------------------------------------
function banner( icon, title, message, delay ) {
	clearTimeout( V.timeoutbanner );
	var bottom = $( '#bar-bottom' ).is( '.transparent, :hidden' ) || ! $( '#loader' ).hasClass( 'hide' ) ? '10px' : '';
	$( '#banner' )
		.html( '<div id="bannerIcon">'+ ico( icon ) +'</div><div id="bannerTitle">'+ title +'</div>'
			  +'<div id="bannerMessage">'+ message +'</div>' )
		.css( 'bottom', bottom )
		.removeClass( 'hide' );
	V.bannerdelay = delay !== -1;
	if ( V.bannerdelay ) V.timeoutbanner = setTimeout( () => {
		delete V.bannerdelay;
		$( '#banner' )
			.addClass( 'hide' )
			.empty();
	}, delay || 3000 );
}
function bannerHide() {
	if ( V.bannerdelay || V.relays || V.reboot || V.off ) return
	
	$( '#banner' )
		.addClass( 'hide' )
		.empty();
}
$( '#banner' ).on( 'click', bannerHide );
// ----------------------------------------------------------------------
function dataError( msg, list ) {
	var pos   = msg.replace( /.* position /, '' );
	if ( msg.includes( 'position' ) )    pos = msg.replace( /.*position /, '' ).replace( / .line.*/, '' );
	else if ( msg.includes( 'column' ) ) pos = msgx.replace( /.* column /, '' ).replace( ')', '' );
	if ( pos ) msg = msg.replace( pos, '<codered>'+ pos +'</codered>' );
	var data  = list.slice( 0, pos ).replace( /</g, '&lt;' ) +'<codered>&gt;</codered>'+ list.slice( pos ).replace( /</g, '&lt;' );
	dataErrorSet( '<codered>Errors:</codered> '+ msg
				+'&emsp;<a class="infobtn infobtn-primary copy">'+ ico( 'copy' ) +'Copy</a>'
				+'<hr>'
				+'<div class="data">'+ data +'</div>' );
	loaderHide();
}
function dataErrorSet( error ) {
	$( '#data .error' ).remove();
	$( '#banner' ).after( '<pre id="data">'+ error +'</pre>' );
	if ( $( '#data codered' ).length ) {
		var fn = () => {
			// copy2clipboard - for non https which cannot use clipboard API
			$( 'body' ).prepend( '<textarea id="error">\`\`\`\n'+ $( '#data' ).text().replace( 'Copy{', '\n{' ) +'\`\`\`</textarea>' );
			$( '#error' ).trigger( 'focus' ).select();
			document.execCommand( 'copy' );
			$( '#error' ).remove();
			banner( 'copy', 'Error Data', 'Errors copied to clipboard.' );
		}
	} else {
		var fn = () => {
			var cmdsh = page === 'player' ? [ 'settings/player-conf.sh' ] : [ 'settings/camilla.sh', 'restart' ];
			bash( cmdsh, refreshData );
			notify( pkg, pkg, 'Start ...' );
		}
	}
	$( '#data .infobtn' ).on( 'click', fn );
}
// ----------------------------------------------------------------------
function highlightJSON( json ) {
	var color = ( text, color ) => '<'+ color +'>'+ text +'</'+ color +'>';
	var json  = Object.keys( json )
					.sort()
					.reduce( ( r, k ) => ( r[ k ] = json[ k ], r ), {} ); // from: https://stackoverflow.com/a/29622653
	var regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)|[{}\[\]]/g;
	return JSON.stringify( json, null, '\t' )
				.replace( /\x3C/g, '&lt;' )                               // <
				.replace( regex, function( match ) {                      // from: https://stackoverflow.com/a/7220510
		if ( /^"/.test( match ) )
			if ( /:$/.test( match ) )           return match                // key (wh)
			else                                return color( match, 'gr' ) // value
		else if ( /true/.test( match ) )        return color( match, 'grn' )
		else if ( /false/.test( match ) )       return color( match, 'red' )
		else if ( /[0-9]/.test( match ) )       return color( match, 'ora' )
		else if ( /[{}]/.test( match ) )        return color( match, 'bll' )
		else if ( /[\[\]]|null/.test( match ) ) return color( match, 'pur' )
	} );
}
function ico( icon, id, tabindex ) {
	return '<i'+ ( id ? ' id="'+ id +'"' : '' ) +' class="i-'+ icon +'"'+ ( tabindex ? ' tabindex="0"' : '' ) +'></i>';
}
function icoLabel( label, icon ) {
	return '<a class="helpmenu label">'+ label + ( icon ? '<i class="i-'+ icon +'"></i>' : '&emsp;' ) +'</a>'
}
function icoTab( tab ) {
	return '<a class="helpmenu tab"><i class="i-'+ tab.toLowerCase() +'"></i> '+ tab +'</a>'
}
function focusNext( $tabs, target, key ) {
	var back  = [ 'ArrowLeft', 'ArrowUp' ].includes( key );
	var bL    = $tabs.length;
	var index = 0;
	$.each( $tabs, ( i, el ) => {
		if ( $( el ).hasClass( target ) || $( el ).is( ':focus' ) ) {
			index = back ? i - 1 : i + 1; // eq( -N ) = N from last
			return false
		}
	} );
	if ( index === bL ) index = 0;
	if ( $tabs.eq( index ).hasClass( 'disabled' ) ) {
		index = back ? index - 1 : index + 1;
		if ( index === bL ) index = 0;
	}
	var $next   = $tabs.eq( index );
	if ( I.active ) {
		var $parent = $( '#infoOverlay' );
	} else if ( ! page || $next.parent().is( '#bar-bottom, .menu' ) ) {
		var $parent = $next.parent();
	} else {
		var $parent = $( '.container' );
	}
	$parent.find( '.'+ target ).removeClass( target );
	$next.addClass( target ).trigger( 'focus' );
	if ( I.active ) {
		if ( $next.is( 'input:text, input[type=number], input:password, textarea' ) ) $next.select();
	} else if ( $parent.is( '#bar-bottom' ) ) {
		if ( ! page ) $next.trigger( 'click' );
	} else {
		if ( $parent.is( '.content-top' ) ) return
		
		$next[ 0 ].scrollIntoView( { block: 'center' } );
	}
}
function focusNextTabs() {
	var $tabs = $( '#infoOverlay' ).find( '[ tabindex=0 ], .infobtn, input, select, textarea' ).filter( ( i, el ) => {
		if ( ! $( el ).is( 'input:hidden, input:radio:checked, input:disabled, .disabled, .hide, .select2-selection' ) ) return $( el )
	} );
	return $tabs
}
// info ----------------------------------------------------------------------
$( '#infoOverlay' ).on( 'keydown', function( e ) {
	if ( ! I.active ) return
	
	var key = e.key;
	if ( key === 'Tab' ) key = e.shiftKey ? 'ArrowUp' : 'ArrowDown';
	switch ( key ) {
		case 'ArrowUp':
		case 'ArrowDown':
		case 'Tab':
			e.preventDefault();
			if ( V.select2 ) return
			
			focusNext( focusNextTabs(), 'focus', key );
			if ( $( '#infoList .focus' ).is( 'select' ) ) $( '#infoList .focus' ).next().find( '.select2-selection' ).trigger( 'focus' );
			break
		case ' ':
			var $focus = $( '#infoOverlay' ).find( ':focus' );
			if ( ! $focus.length || ! $focus.is( '#infoTab a, input:checkbox, input:radio, select, .infobtn, i' ) ) return
			
			e.preventDefault();
			if ( $focus.is( 'select' ) ) $focus = $focus.next();
			$focus.trigger( 'click' );
			break
		case 'Enter':
			if ( V.select2 || $( 'textarea' ).is( ':focus' ) ) return
			
			var $target = $( '#infoTab, #infoButton' ).find( ':focus' );
			if ( ! $target.length ) $target = $( '#infoOk' );
			$target.trigger( 'focus' ).trigger( 'click' );
			break
		case 'Escape':
			$( '#infoX' ).trigger( 'click' );
			break
	}
} ).on( 'click', '#infoList', function() {
	$( '#infoList input' ).removeClass( 'focus' );
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} ).press( { // usage
	  delegate : '#infoIcon'
	, action   : () => window.open( 'https://github.com/rern/js/blob/master/info/README.md#infojs', '_blank' )
} );
	
I = { active: false }

function info( json ) {
	infoClearTimeout( 'all' );
	$( '.menu' ).addClass( 'hide' );
	V.timeout = {}
	local(); // flag for consecutive info
	I = json;
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
	$( '#infoOverlay' ).html( `
<div id="infoBox">
	<div id="infoTopBg">
		<div id="infoTop"><i id="infoIcon"></i><a id="infoTitle"></a></div>${ ico( 'close', 'infoX' ) }
	</div>
	<div id="infoList"></div>
	<div id="infoButton"></div>
</div>
` );
	// title
	if ( I.width ) $( '#infoBox' ).css( 'width', I.width );
	if ( I.height ) $( '#infoList' ).css( 'height', I.height );
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
	htmlbutton ? $( '#infoButton' ).html( htmlbutton ) : $( '#infoButton' ).remove();
	if ( I.button ) {
		$( '#infoButton' ).on( 'click', '.extrabtn', function() {
			var buttonfn = I.button[ $( this ).index( '.extrabtn' ) ];
			infoButtonCommand( buttonfn );
		} );
	}
	$( '#infoX, #infoCancel' ).on( 'click', function() {
		V.local = false;
		delete I.oknoreset;
		infoButtonCommand( I.cancel );
	} );
	$( '#infoOk' ).on( 'click', function() {
		if ( V.press || $( this ).hasClass( 'disabled' ) ) return
		
		infoButtonCommand( I.ok );
	} ).press( () => {
		V.debug = true;
		infoButtonCommand( I.ok );
		V.debug = false;
	} );
	if ( I.file ) {
		var htmlfile = '<div id="infoFilename"><c>(select file)</c></div>'
					  +'<input type="file" class="hide" id="infoFileBox"'+ ( I.file.type ? ' accept="'+ I.file.type +'">' : '>' )
					  +'<a id="infoFileLabel" class="infobtn file infobtn-primary">'
					  + ( I.file.label || ico( 'folder-open' ) +' File' ) +'</a>';
		$( '#infoButton' ).prepend( htmlfile )
		$( '#infoOk' )
			.html( I.file.oklabel )
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
			if ( I.file.type ) {
				if ( I.file.type === 'image/*' ) {
					I.filechecked = typeimage;
				} else {
					var ext = filename.includes( '.' ) ? filename.split( '.' ).pop() : 'none';
					I.filechecked = I.file.type.includes( ext );
				}
			}
			if ( ! I.filechecked ) {
				var htmlprev = $( '#infoList' ).html();
				$( '#infoFilename, #infoFileLabel' ).addClass( 'hide' );
				$( '#infoList' ).html( '<table><tr><td>Selected file :</td><td><c>'+ filename +'</c></td></tr>'
										 +'<tr><td>File not :</td><td><c>'+ I.file.type +'</c></td></tr></table>' );
				$( '#infoOk' ).addClass( 'hide' );
				$( '.infobtn.file' ).addClass( 'infobtn-primary' )
				$( '#infoButton' ).prepend( '<a class="btntemp infobtn infobtn-primary">OK</a>' );
				$( '#infoButton' ).one( 'click', '.btntemp', function() {
					$( '#infoList' ).html( htmlprev );
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
		var htmltab = '';
		I.tablabel.forEach( ( lbl, i ) => {
			htmltab += '<a '+ ( I.tab[ i ] ? '' : 'class="active"' ) +'>'+ lbl +'</a>';
		} );
		$( '#infoTopBg' ).after( '<div id="infoTab">'+ htmltab +'</div>' );
		$( '#infoTab a' ).on( 'click', function() {
			if ( ! $( this ).hasClass( 'active' ) ) I.tab[ $( this ).index() ]();
		} );
	}
	var htmls = {};
	[ 'header', 'message', 'footer' ].forEach( k => {
		if ( I[ k ] ) {
			var kalign = k +'align'
			var align = I[ kalign ] ? ' style="text-align:'+ I[ kalign ] +'"' : '';
			htmls[ k ] = '<div class="info'+ k +'" '+ align +'>'+ I[ k ] +'</div>';
		} else {
			htmls[ k ] = '';
		}
	} );
	if ( ! I.list ) {
		$( '#infoList' ).html( Object.values( htmls ).join( '' ) );
		$( '.infobtn' ).prop( 'tabindex', 0 );
		if ( I.beforeshow ) I.beforeshow();
		infoToggle();
		return
	}
	
	[ 'range', 'updn' ].forEach( k => I[ k ] = [] );
	if ( typeof I.list === 'string' ) {
		htmls.list     = I.list;
	} else {
		htmls.list     = '';
		if ( typeof I.list[ 0 ] !== 'object' ) I.list = [ I.list ];
		I.checkboxonly = ! I.list.some( l => l[ 1 ] && l[ 1 ] !== 'checkbox' );
		var colspan, kv, label, param, type;
		var i          = 0; // for radio name
		I.list.forEach( ( l, i ) => {
			label   = l[ 0 ];
			type    = l[ 1 ];
			param   = l[ 2 ] || {};
			if ( type === 'html' ) {
				htmls.list += '<tr><td>'+ label +'</td><td>'+ param +'</td></tr>';
				return
			}
/*			param = {
				  kv       : { k: V, ... }
				, colspan  : N
				, nosort   : T/F
				, sameline : T/F
				, suffix   : UNIT
				, updn     : { step: N, min: N, max: N }
			}*/
			if ( [ 'checkbox', 'radio' ].includes( type ) && ( 'kv' in param && ! param.colspan ) ) param.colspan = 2;
			colspan = param.colspan && param.colspan > 1 ? ' colspan="'+ param.colspan +'"' : '';
			switch ( type ) {
				case 'checkbox':
					if ( htmls.list.slice( -3 ) === 'tr>' ) htmls.list += '<tr>'
					htmls.list += I.checkboxonly ? '<td>' : '<td></td><td'+ colspan +'>';
					break;
				case 'hidden':
					htmls.list += '<tr class="hide"><td></td><td>';
					break;
				case 'radio':
					colspan     = param.colspan || 2;
					htmls.list += '<tr><td>'+ label +'</td><td colspan="'+ colspan +'">';
					break;
				case 'range':
					htmls.list += '<tr><td'+ colspan +'>';
					break;
				default:
					htmls.list += htmls.list.slice( -3 ) === 'td>' ? '' : '<tr><td>'+ label +'</td>';
					htmls.list += '<td'+ colspan +'>';
			}
			switch ( type ) {
				case 'checkbox':
					htmls.list += '<label><input type="checkbox">'+ label +'</label></td>';
					htmls.list += param.sameline ? '' : '</tr>'; // default: false
					break;
				case 'hidden':
				case 'number':
				case 'text':
					htmls.list += '<input type="'+ type +'"'+ ( param.updn && ! param.updn.enable ? ' disabled' : '' ) +'>';
					if ( param.suffix ) {
						htmls.list += '<td>&nbsp;<gr>'+ param.suffix +'</gr>';
					} else if ( param.updn ) {
						I.updn.push( param.updn );
						htmls.list += '<td>'+ ico( 'remove updn dn' ) + ico( 'plus-circle updn up' );
					}
					htmls.list += param.sameline ? '</td>' : '</tr>';
					break;
				case 'password':
					htmls.list += '<input type="password"></td><td>'+ ico( 'eye' ) +'</td></tr>';
					break;
				case 'radio':
					kv          = param.kv || param;
					var isarray = Array.isArray( kv );
					var tr      = false;
					$.each( kv, ( k, v ) => {
						var k = isarray ? v : k;
						if ( tr ) htmls.list += '<tr><td></td><td colspan="'+ colspan +'">';
						htmls.list += '<label><input type="radio" name="inforadio'+ i +'" value="'+ v +'">'+ k +'</label>';
						if ( param.sameline === false ) { // default: true
							tr          = true;
							htmls.list += '</td></tr>';
						} else {
							htmls.list += '&emsp;';
						}
					} );
					htmls.list += tr ? '' : '</td></tr>';
					i++;
					break;
				case 'range':
					I.range = true;
					htmls.list += '<div class="inforange">'
								+'<div class="name">'+ label +'</div>'
								+'<div class="value gr"></div>'
								+ ico( 'minus dn' ) +'<input type="range" min="0" max="100">'+ ico( 'plus up' )
								+'</div></td></tr>';
					break
				case 'select':
					kv          = param.kv || param;
					htmls.list += '<select>'+ htmlOption( kv ) +'</select>';
					if ( param.suffix ) {
						htmls.list += '<td><gr>'+ param.suffix +'</gr></td></tr>'; // default: false
					} else {
						if ( param.sameline ) {
							var lblnext = I.list[ i + 1 ][ 0 ];
							htmls.list += lblnext ? '<td style="padding: 0 5px; text-align: right;">'+ lblnext +'</td>' : '</td>';
						} else {
							htmls.list += '</tr>';
						}
					}
					break;
				case 'textarea':
					htmls.list += '<textarea></textarea></td></tr>';
					break;
				default: // string
					if ( type ) htmls.list += type;
					if ( 'suffix' in param ) htmls.list += '</td><td>'+ param.suffix;
					htmls.list += param.sameline ? '</td>' : '</td></tr>';
			}
		} );
		htmls.list = '<table>'+ htmls.list +'</table>';
	}
	
	// populate layout //////////////////////////////////////////////////////////////////////////////
	var content = '';
	[ 'header', 'message', 'list', 'footer' ].forEach( k => content += htmls[ k ] );
	$( '#infoList' ).html( content ).promise().done( function() {
		$( '#infoTab a:not( .active ), .updn, .i-eye, #infoButton .infobtn' ).prop( 'tabindex', 0 );
		$( '#infoList input:text' ).prop( 'spellcheck', false );
		// get all input fields
		$inputbox = $( '#infoList' ).find( 'input:text, input[type=number], input:password, textarea' );
		$input    = $( '#infoList' ).find( 'input, select, textarea' );
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
		$( '#infoList tr' ).each( ( i, el ) => {
			var $this = $( el );
			if ( $this.find( 'input:checkbox, input:radio' ).length ) $this.css( 'height', '36px' );
		} );
		// show
		infoToggle();
		if ( $( '#infoBox' ).height() > window.innerHeight - 10 ) $( '#infoBox' ).css( { top: '5px', transform: 'translateY( 0 )' } );
		infoWidth(); // text / password / textarea
		if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( '#infoList a' ).removeAttr( 'href' );
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
		I.checklength ? infoCheckLength() : I.notlength = false;
		I.notchange = I.values && I.checkchanged ? true : false;
		$( '#infoOk' ).toggleClass( 'disabled', I.blank || I.notip || I.notlength || I.notchange ); // initial check
		I.notunique = false;
		infoCheckSet();
		if ( I.range ) {
			var $range    = $( '.inforange input' );
			var $rangeval = $( '.inforange .value' );
			var $up       = $( '.inforange .up' );
			var $dn       = $( '.inforange .dn' );
			var min       = +$( '.inforange input' ).prop( 'min' );
			var max       = +$( '.inforange input' ).prop( 'max' );
			$range.on( 'input', function() {
				var $this = $( this );
				var val   = +$this.val();
				$rangeval.text( val );
				$up.toggleClass( 'disabled', val === max );
				$dn.toggleClass( 'disabled', val === min );
			} );
			$range.trigger( 'input' );
			var rangeSet = up => {
				var val = +$range.val();
				if ( ( val === 0 && ! up ) || ( val === 100 && up ) ) return
				
				up ? val++ : val--;
				$range.val( val );
				$rangeval.text( val );
			}
			$( '.inforange i' ).on( 'touchend mouseup keyup', function() { // increment up/dn
				clearTimeout( V.timeout.range );
				if ( ! V.press ) rangeSet( $( this ).hasClass( 'up' ) );
			} ).press( e => {
				var up = $( e.target ).hasClass( 'up' );
				V.timeout.range = setInterval( () => rangeSet( up ), 100 );
			} );
		}
		if ( I.updn.length ) {
			var max = [];
			var min = [];
			for ( var i = 0; i < I.updn.length; i++ ) {
				min.push( I.updn[ i ].min );
				max.push( I.updn[ i ].max );
			}
			I.updn.forEach( ( el, i ) => {
				var $td   = $( '#infoList .updn' ).parent().eq( i );
				var $updn = $td.find( '.updn' );
				var $num  = $td.prev().find( 'input' );
				var step  = el.step;
				function numberset( $target ) {
					var up = $target.hasClass( 'up' );
					var v  = +$num.val();
					v      = up ? v + step : v - step;
					if ( v === el.min || v === el.max ) infoClearTimeout();
					$num.val( v );
					updnToggle( up );
				}
				function updnToggle( up ) {
					var v = [];
					$( '.updn' ).parents( 'tr' ).find( 'input' ).each( ( i, el ) => v.push( +$( el ).val() ) );
					if ( el.link && typeof up === 'boolean' )  {
						if ( v[ 0 ] > v[ 1 ] ) {
							var vlink = up ? v[ 0 ] : v[ 1 ];
							v         = [ vlink, vlink ];
							$input.val( vlink );
						}
					}
					if ( I.checkchanged ) $num.trigger( 'input' );
					for ( var i = 0; i < I.updn.length; i++ ) {
						$( '#infoList .dn' ).eq( i ).toggleClass( 'disabled', v[ i ] === min[ i ] );
						$( '#infoList .up' ).eq( i ).toggleClass( 'disabled', v[ i ] === max[ i ] );
					}
				}
				updnToggle();
				$updn.on( 'click', function() {
					if ( ! V.press ) numberset( $( this ) );
				} ).press( e => {
					var $target = $( e.target );
					V.timeout.updni = setInterval( () => numberset( $target ), 100 );
					V.timeout.updnt = setTimeout( () => { // @5 after 3s
						clearInterval( V.timeout.updni );
						step           *= 5;
						var v           = +$num.val();
						v               = v > 0 ? v + ( step - v % step ) : v - ( step + v % step );
						$num.val( v );
						V.timeout.updni = setInterval( () => numberset( $target ), 100 );
					}, 3000 );
				} ).on( 'touchend mouseup keyup', function() {
					infoClearTimeout();
					step = el.step;
				} );
				if ( el.enable ) {
					$input.on( 'blur', function() {
						var $this = $( this );
						var i     = $this.parents( 'tr' ).index();
						var v     = { val: +$this.val(), min: min[ i ], max: max[ i ] }
						if ( v.val < v.min ) {
							$this.val( v.min );
						} else if ( v.val > v.max ) {
							$this.val( v.max );
						}
						updnToggle( i === 0 );
					} );
				}
			} );
		}
		// custom function before show
		if ( I.beforeshow ) I.beforeshow();
		if ( 'focus' in I ) {
			$inputbox.eq( I.focus ).focus();
		} else {
			var iL = $inputbox.length;
			if ( iL === 1 || ( iL && ! $inputbox.eq( 0 ).val() ) ) {
				$inputbox.eq( 0 ).focus();
			} else {
				$( '#infoOverlay' ).trigger( 'focus' );
			}
		}
	} );
	$( '#infoList .i-eye' ).on( 'click', function() {
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

function infoButtonCommand( fn ) {
	if ( typeof fn === 'function' ) fn();
	if ( V.local || V.press || I.oknoreset ) return // consecutive info / no reset
	
	infoReset();
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
	I.blank = I.checkblank.some( i => $inputbox.eq( i ).val().trim() === '' );
}
function infoCheckIP() {
	var regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/; // https://stackoverflow.com/a/36760050
	I.notip = I.checkip.some( i => {
		return ! regex.test( $inputbox.eq( i ).val() );
	} );
}
function infoCheckLength() {
	I.notlength = false;
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
			I.notlength = true;
			return false
		}
	} );
}
function infoCheckSet() {
	var check = [ 'changed', 'blank', 'ip', 'length', 'unique' ].some( k => 'check'+ k in I );
	if ( ! check ) return
	
	$( '#infoList' ).find( 'input, select, textarea' ).on( 'input', function() {
		if ( I.checkchanged ) I.notchange = I.values.join( '' ) === infoVal( 'array' ).join( '' );
		if ( I.checkblank )  V.timeout.blank  = setTimeout( infoCheckBlank, 0 );   // #1
		if ( I.checklength ) V.timeout.length = setTimeout( infoCheckLength, 20 ); // #2
		if ( I.checkip )     V.timeout.ip     = setTimeout( infoCheckIP, 40 );     // #3
		if ( I.checkunique ) V.timeout.unique = setTimeout( infoCheckUnique, 60 ); // #4
		V.timeout.check = setTimeout( () => {
			$( '#infoOk' ).toggleClass( 'disabled', I.notchange || I.blank || I.notlength || I.notip || I.notunique );
		}, 100 );
	} );
}
function infoCheckUnique() {
	var infoval = infoVal( 'array' );
	I.notunique = infoval.length !== new Set( infoval ).size;
}
function infoClearTimeout( all ) { // ok for both timeout and interval
	if ( ! ( 'timeout' in V ) ) return
	
	var timeout = all ? Object.keys( V.timeout ) : [ 'updni', 'updnt' ];
	timeout.forEach( k => clearTimeout( V.timeout[ k ] ) );
}
function infoFileImage() {
	delete I.infofilegif;
	V.timeout.file = setTimeout( () => banner( 'refresh blink', 'Change Image', 'Load ...', -1 ), 1000 );
	I.rotate   = 0;
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
						clearTimeout( V.timeout.file );
						bannerHide();
					}
				} else {
					infoFileImageReader();
				}
			} );
	}
}
function infoFileImageReader() {
	var maxsize   = ( V.library && V.libraryhome ) ? 200 : 1000;
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
			clearTimeout( V.timeout.file );
			bannerHide();
		}
	}
	reader.readAsDataURL( I.infofile );
	$( '#infoList' )
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
			+ ( original ? 'original: '+ original : '' )
			+ ( src.slice( 0, 4 ) === 'blob' ? '' : '<br>'+ ico( 'redo rotate' ) +'Tap to rotate' )
			+'</div>'
		+'</span>'
	);
}
function infoFileImageResize( ext, imgW, imgH ) {
	var maxsize = ( V.library && V.libraryhome ) ? 200 : ( ext === 'gif' ? 600 : 1000 );
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
function infoFooterIcon( kv ) {
	var footer = '';
	$.each( kv, ( l, i ) => footer += '<span>'+ ico( i ) + l +'</span>' );
	return footer
}
function infoKey2array( key ) {
	if ( ! Array.isArray( I[ key ] ) ) I[ key ] = [ I[ key ] ];
}
function infoListAddRemove( callback ) {
	$( '#infoList tr' ).append( '<td>'+ ico( 'remove edit' ) +'</td>' );
	$( '#infoList td' ).eq( 2 ).html( ico( 'plus edit' ) );
	$( '#infoList' ).on( 'click', '.edit', function() {
		var $this = $( this );
		var add   = $this.hasClass( 'i-plus' );
		if ( add ) {
			$( '#infoList select' ).select2( 'destroy' );
			var $tr = $( '#infoList tr' ).last();
			$tr.after( $tr.clone() );
			selectSet();
		} else {
			$this.parents( 'tr' ).remove();
		}
		infoListChange( callback, add );
	} );
}
function infoListChange( callback, add ) {
	$input    = $( '#infoList' ).find( 'input, select' );
	$inputbox = $( '#infoList input' );
	if ( 'checkblank' in I ) {
		I.checkblank = [ ...Array( $inputbox.length ).keys() ];
		infoCheckBlank();
	}
	infoCheckSet();
	$( '#infoList input' ).trigger( 'input' );
	if ( callback ) callback( add );
}
function infoPrompt( message ) { // I.oknoreset - must be set if called after ok()
	I.oknoreset = true;
	if ( ! $( '.infoprompt' ).length ) $( '#infoList' ).after( '<div class="infoprompt gr hide">'+ I.prompt +'</div>' );
	var $toggle = $( '#infoX, #infoTab, .infoheader, #infoList, .infofooter, .infoprompt' );
	$( '.infoprompt' ).html( message );
	$toggle.toggleClass( 'hide' );
	bannerHide();
	$( '#infoOverlay' )
		.removeClass( 'hide' )
		.trigger( 'focus' );
	$( '#infoOk' ).off( 'click' ).on( 'click', function() {
		$toggle.toggleClass( 'hide' );
		$( '#infoOk' ).off( 'click' ).on( 'click', I.ok );
	} );
}
function infoReset() {
	infoToggle( 'reset' );
	$( '#infoOverlay' )
		.addClass( 'hide' )
		.removeAttr( 'style' )
		.empty();
	setTimeout( () => {
		I = { active: false }
		$( '.focus' ).trigger( 'focus' ); // restore previous focused
	}, 0 );
}
function infoSetValues() {
	var $this, type, val;
	$input.each( ( i, el ) => {
		$this = $( el );
		type  = $this.prop( 'type' );
		val   = I.values[ i ];
		if ( type === 'radio' ) { // reselect radio by name
			if ( val || val === 0 ) {
				var name = $this.prop( 'name' );
				$( 'input[name='+ name +']' ).val( [ val ] );
			} else {
				$this.eq( 0 ).prop( 'checked', true );
			}
		} else if ( type === 'checkbox' ) {
			var checked = typeof val === 'boolean' ? val : val == $this.val();
			$this.prop( 'checked', checked );
		} else if ( $this.is( 'select' ) ) {
			val !== '' && typeof val !== 'undefined' ? $this.val( val ) : el.selectedIndex = 0;
		} else {
			if ( Array.isArray( val ) ) { // array > array literal
				val = '[ '+ val.join( ', ' ) +' ]';
				$this.addClass( 'array' );
			}
			$this.val( val );
			if ( type === 'range' ) $('.inforange .value' ).text( val );
		}
	} );
}
function infoToggle( reset ) {
	if ( reset ) {
		var height    = '';
		var overflow  = '';
		var padding   = I.padding;
		var scrolltop = I.scrolltop;
	} else {
		I.active      = true;
		I.scrolltop   = $( window ).scrollTop();
		I.padding     = page ? '' : $( '.page:not( .hide ) .list' ).css( 'padding-bottom' );
		var height    = '150vh';
		var overflow  = 'hidden';
		var padding   = 0;
		var scrolltop = 0;
		$( '#infoOverlay' ).removeClass( 'hide' );
		infoButtonWidth();
		$( '#infoOverlay' ).trigger( 'focus' );
	}
	if ( ! page ) {
		$( '.page, .list' ).css( { 'max-height': height, overflow: overflow } );
		$( '.list' ).css( 'padding-bottom', padding );
	}
	$( window ).scrollTop( scrolltop );
}
function infoVal( array ) {
	var $this, type, name, val;
	var values = [];
	$input.each( ( i, el ) => {
		$this = $( el );
		type  = $this.prop( 'type' );
		switch ( type ) {
			case 'checkbox':
				val = $this.prop( 'checked' );
				if ( val && $this.attr( 'value' ) !== undefined ) val = $this.val(); // if value defined
				break;
			case 'number':
			case 'range':
				val = +$this.val();
				break;
			case 'password':
				val = $this.val().trim().replace( /(["&()\\])/g, '\$1' ); // escape extra characters
				break;
			case 'radio': // radio has only single checked - skip unchecked inputs
				val = $( '#infoList input:radio[name='+ el.name +']:checked' ).val();
				if ( val === 'true' ) {
					val = true;
				} else if ( val === 'false' ) {
					val = false;
				}
				break;
			case 'text':
				if ( $this.hasClass( 'array' ) ) { // array literal > array
					var v0 = $this.val()
								.replace( /[\[\]]/g, '' )
								.split( ',' );
					val    = [];
					v0.forEach( v => val.push( isNaN( v ) ? v : +v ) );
				} else {
					val = $this.val().trim();
				}
				break;
			case 'textarea':
				val = $this.val().trim().replace( /\n/g, '\\n' );
				break;
			default: // hidden, select
				val = $this.val();
		}
		if ( val === '0' ) val = 0;
		if ( typeof val !== 'string'                    // boolean
			|| val === ''                               // empty
			|| isNaN( val )                             // Not a Number 
			|| ( val[ 0 ] === '0' && val[ 1 ] !== '.' ) // '0123' not 0.123
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
				var maxW = I.width < window.innerWidth ? I.width : window.innerWidth;
			} else {
				var maxW = window.innerWidth > 600 ? 600 : window.innerWidth;
			}
			$( '#infoBox' ).css( 'width', maxW +'px' );
		}
		var allW   = $( '#infoList' ).width();
		var labelW = Math.round( $( '#infoList td:first-child' ).width() ) || 0;
		I.boxW   = ( widthmax ? allW - labelW - 20 : I.boxwidth );
	} else {
		I.boxW   = 230;
	}
	$( '#infoList table' ).find( 'input:text, input[type=number], input:password, textarea' )
		.parent().addBack()
		.css( 'width', I.boxW +'px' )
	if ( $( '#infoList select' ).length ) selectSet();
	if ( I.headeralign || I.messagealign || I.footeralign ) {
		$( '#infoList' ).find( '.infoheader, .infomessage, .infofooter' ).css( 'width', $( '#infoList table' ).width() );
	}
	if ( I.checkboxonly ) $( '#infoList td' ).css( 'text-align', 'left' );
}

// common info functions --------------------------------------------------
function infoDabScan() {
	var icon  = 'dabradio';
	var title = 'DAB Radio';
	info( {
		  icon    : icon
		, title   : title
		, message : 'Scan for available stations?'
		, ok      : () => {
			addonsProgressSubmit( {
				  alias      : icon
				, title      : title
				, label      : 'Scan'
				, installurl : 'dab-scan.sh'
				, backhref   : page ? 'settings.php?p=features' : '/'
			} );
		}
	} );
}
function infoPower() {
	info( {
		  icon        : 'power'
		, title       : 'Power'
		, message     : ico( 'raudio gr' ) +'&ensp;<a style="font-weight: 300">r A u d i o</a>'
		, buttonlabel : ico( 'reboot' ) +'Reboot'
		, buttoncolor : orange
		, button      : () => infoPowerCommand( 'reboot' )
		, oklabel     : ico( 'power' ) +'Off'
		, okcolor     : red
		, ok          : infoPowerCommand
	} );
}
function infoPowerCommand( action ) {
	loader();
	bash( [ 'power.sh', action ], nfs => {
		if ( nfs != -1 ) return
		
		loaderHide();
		info( {
			  icon    : 'power'
			, title   : 'Power'
			, message : 'This <wh>Server rAudio '+ ico( 'rserver' ) +'</wh> is currently active.'
						+'<br><wh>Shared Data</wh> on clients will stop.'
						+'<br>(Resume when server online again)'
						+'<br><br>Continue?'
			, oklabel : action ? ico( 'reboot' ) +'Reboot' : ico( 'power' ) +'Off'
			, okcolor : action ? orange : red
			, ok      : () => bash( [ 'power.sh', action || '', 'confirm' ] )
		} );
	} );
}

function accent2plain( str ) {
	return  str.normalize( 'NFD' ).replace( /[\u0300-\u036f]/g, '' )
}
function addonsProgressSubmit( input ) {
	if ( input.installurl.slice( 0, 4 ) !== 'http' ) input.installurl = '/usr/bin/sudo /srv/http/bash/'+ input.installurl
	var form  = '<form id="formtemp" action="settings.php?p=addonsprogress" method="post">';
	$.each( input, ( k, v ) => form += '<input type="hidden" name="'+ [ k ] +'" value="'+ v +'">' );
	$( 'body' ).append( form +'</form>' );
	if ( V.debug ) {
		var data = {};
		$( 'form' ).last().serializeArray().forEach( el => data[ el.name ] = el.value );
		console.log( data );
		return
	}
	
	loader();
	$( '#formtemp' ).submit();
}
function capitalize( str ) {
	return str.replace( /\b\w/g, l => l.toUpperCase() );
}
function htmlOption( el ) {
	var array = false;
	var sort  = true;
	if ( typeof el === 'number' ) {
		el         = [ ...Array( el ).keys() ];
	} else if ( Array.isArray( el ) ) {
		var array  = true;
	} else {
		if ( 'nosort' in el ) sort = false;
		if ( 'kv' in el ) el = el.kv;
	}
	var options = '';
	if ( array ) { // name = value
		if ( sort ) el.sort( ( a, b ) => a.toString().localeCompare( b.toString(), 'en', { numeric: true } ) );
		el.forEach( v => options += '<option value="'+ v +'">'+ v +'</option>' );
	} else {                     // json
		if ( sort ) el = jsonSort( el );
		$.each( el, ( k, v ) => options += '<option value="'+ v.toString().replace( /"/g, '&quot;' ) +'">'+ k +'</option>' );
	}
	return options
}
function ipSub( ip ) {
	return ip.replace( /(.*\..*\..*\.).*/, '$1' )
}
function jsonClone( json ) {
	return JSON.parse( JSON.stringify( json ) )
}
function jsonSave( name, json ) {
	if ( typeof json === 'object' ) json = JSON.stringify( json );
	var data = '{ "json": '+ json +', "name": "'+ name +'" }';
	if ( V.debug ) {
		bashConsoleLog( data );
		return
	}
	
	ws.send( data );
}
function jsonSort( json ) {
	return Object.keys( json ).sort().reduce( function ( result, key ) {
		result[ key ] = json[ key ];
		return result;
	}, {} );
}
// ----------------------------------------------------------------------
function eqDiv( min, max, freq, bottom = '' ) {
	var input  = '<input type="range" min="'+ min +'" max="'+ max +'">';
	var label  = '';
	var slider = '';
	freq.forEach( hz => {
		if ( hz > 999 ) hz = Math.round( hz / 1000 ) +'k';
		label  += '<a>'+ hz +'</a>';
		slider += input;
	} );
	return `
<div id="eq">
<div class="label up">${ label }</div>
<div class="bottom"><div class="label dn">${ label }</div>${ bottom }</div>
<div class="inforange vertical">${ slider }</div>
</div>`;
}
function loader( fader ) {
	$( '#loader svg' ).toggleClass( 'hide', fader === 'fader' );
	$( '#loader' ).removeClass( 'hide' );
}
function loaderHide() {
	if ( 'off' in V || 'reboot' in V ) return
	
	$( '#loader' ).addClass( 'hide' );
}

// ----------------------------------------------------------------------
function local( delay ) {
	V.local = true;
	setTimeout( () => V.local = false, delay || 300 );
}
function qrCode( msg ) {
	var qr = QRCode( {
		  msg : msg
		, dim : 115
		, pad : 0
		, pal : [ '#969a9c' ]
	} );
	return qr.outerHTML
}
function scrollUpToView( $el ) {
	if ( $el[ 0 ].getBoundingClientRect().bottom < window.innerHeight - 40 ) return
	
	$el[ 0 ].scrollIntoView( { block: 'end', behavior: 'smooth' } );
}
function sp( px ) {
	return '<sp style="width: '+ px +'px"></sp>'
}

// select2 --------------------------------------------------------------------
function selectSet( $select ) {
	var options = { minimumResultsForSearch: 10 }
	if ( ! $select ) {
		$select = $( '#infoList select' );
		if ( $( '#infoList #eq' ).length ) options.dropdownParent = $( '#eq' );
	}
	$select
		.select2( options ).on( 'select2:open', () => { // fix: scroll on info - set current value 3rd from top
			local(); // fix: onblur / onpagehide
			V.select2 = true;
			setTimeout( () => {
				var scroll = $( '.select2-results__option--selected' ).index() * 36 - 72;
				if ( navigator.maxTouchPoints ) scroll -= 12;
				$( '.select2-results ul' ).scrollTop( scroll );
			}, 0 );
		} ).on( 'select2:closing', function() {
			local(); // fix: onblur / onpagehide / Enter
			setTimeout( () => {
				V.select2 = false;
				var $tabs = focusNextTabs();
				$tabs
					.removeClass( 'focus' )
					.each( ( i, el ) => {
						if ( this === el ) {
							$tabs.eq( i + 1 ).trigger( 'focus' );
							return false
						}
				} );
			}, 300 );
		} ).each( ( i, el ) => {
			var $this = $( el );
			$this.prop( 'disabled', $this.find( 'option' ).length === 1 );
		} );
	$( '#infoList .select2-container' ).attr( 'style', 'width: '+ I.boxW +'px !important' );
}
function selectText2Html( pattern ) {
	function htmlSet( $el ) {
		$.each( pattern, ( k, v ) => {
			if ( $el.text() === k ) $el.html( v );
		} );
	}
	var $rendered = $( '.select2-selection__rendered' ).eq( 0 );
	htmlSet( $rendered );
	$( '#infoList select' ).on( 'select2:open', () => {
		setTimeout( () => $( '.select2-results__options li' ).each( ( i, el ) => htmlSet( $( el ) ) ), 0 );
	} ).on( 'select2:select', function() {
		htmlSet( $rendered );
	} );
}

// page visibility -----------------------------------------------------------------
function pageActive() {
	if ( V && ( V.pageactive || V.off ) ) return
	
	V.pageactive = true;
	if ( ws && ws.readyState === 1 ) {
		V.timeoutreload = true;
		setTimeout( () => { // reconnect if ws not response on wakeup
			if ( V.timeoutreload ) websocketReconnect();
		}, 300 );
		ws.send( '"ping"' );
	} else {
		websocketReconnect();
	}
	setTimeout( refreshData, page ? 300 : 0 );
}
function pageInactive() {
	if ( V.local || V.debug ) return // V.local from select2
	
	V.pageactive = false;
	if ( typeof onPageInactive === 'function' ) onPageInactive();
}
document.onvisibilitychange = () => document.visibilityState === 'hidden' ? pageInactive() : pageActive();
window.onblur     = pageInactive;
window.onfocus    = pageActive;
window.onpagehide = pageInactive;
window.onpageshow = pageActive;

function volumeMaxSet() {
	if ( S.volumemax && S.volume > S.volumemax ) {
		S.volume = S.volumemax;
		banner( 'volumelimit', 'Volume Limit', 'Max: '+ S.volumemax );
	}
}
function volumeMuteToggle() {
	V.volumediff = Math.abs( S.volume - S.volumemute );
	if ( S.volumemute ) {
		S.volume     = S.volumemute;
		S.volumemute = 0;
	} else {
		S.volumemute = S.volume;
		S.volume     = 0;
	}
	volumeSet( S.volumemute ? 'mute' : 'unmute' );
}
function volumePush() {
	V.local = true;
	ws.send( '{ "channel": "volume", "data": { "type": "", "val": '+ S.volume +' } }' );
}
function volumeSet( type ) { // type: mute / unmute
	V.local        = true;
	V.volumeactive = true;
	setTimeout( () => V.volumeactive = false, 300 );
	if ( V.drag || V.press ) type = 'dragpress';
	bash( [ 'volume', V.volumecurrent, S.volume, S.control, S.card, type, 'CMD CURRENT TARGET CONTROL CARD TYPE' ] );
	V.volumecurrent = S.volume;
}
function websocketConnect( ip ) {
	if ( ws && ws.readyState === 1 ) return
	
	ws           = new WebSocket( 'ws://'+ ( ip || location.host ) +':8080' );
	ws.onopen    = () => {
		var interval = setInterval( () => {
			if ( ws.readyState === 1 ) { // 0=created, 1=ready, 2=closing, 3=closed
				clearInterval( interval );
				ws.send( '{ "client": "add" }' );
				if ( V.reboot ) {
					delete V.reboot
					if ( S.login ) {
						location.href = '/';
					} else {
						refreshData();
						loaderHide();
						bannerHide();
					}
				}
			}
		}, 100 );
	}
	ws.onmessage = message => {
		var data = message.data;
		if ( data === 'pong' ) { // on pageActive - reload if ws not response
			V.timeoutreload = false;
		} else {
			var json    = JSON.parse( data );
			var channel = json.channel;
			if ( channel in W ) W[ channel ]( json.data );
		}
	}
}
function websocketReconnect() {
	$.post( 'cmd.php', { cmd: 'startupready' }, ready => {
		if ( ready ) {
			V.timeoutreload ? location.reload() : websocketConnect();
		} else {
			setTimeout( websocketReconnect, 1000 );
		}
	} ).fail( () => {
		V.timeoutreload = true;
		loader();
		setTimeout( websocketReconnect, 1000 );
	} );
}
/* bash
Multiline arguments - no escape \" \` in js values > escape in php instead
	- [ CMD, v1, v2, ... ]                  - script.sh $CMD ON=1 "${args[1]}" "${args[2]}" ...
	- [ CMD, 'OFF' ]                        - script.sh $CMD ON=  (disable CMD)
	- [ CMD, v1, v2, ..., 'CMD K1 K2 ...' ] - script.sh $CMD ON=1 "$K1" "$K2" ...
	- [ CMD, v1, v2, ..., 'CFG K1 K2 ...' ] -        ^^^                     and save K1=v1; K2=v2; ... to $dirsystem/$CMD.conf

- js > php/ws >> common.js - bash()
	- string : 
		- array of lines : [ 'CMD' v1, v2, ..., 'CMD K1 K2 ...' ]
		- multiline      : 'l1\\nl2\\nl3...'
- php > bash  >> cmd.php   - $_POST[ 'cmd' ] === 'bash'
	- array : covert to multiline with " ` escaped > CMD "...\"...\n...\`..."
- bash        >> common.sh - args2var
	- string : convert to array > assign values
		- No 'CMD'   : ${args[1]} == v1; ${args[2]} == v2; ...
		- With 'CMD' : $K1        == v1; $K2        == v2; ... ($VAR in capital)
		- With 'CFG' : 
			- the same as 'CMD'
			- save to $dirsystem/$CMD.conf  with " ` escaped and quote > K1="... ...\"...\n...\`..."
		- [ CMD, 'OFF' ] : disable
*/
function bash( args, callback, json ) {
	if ( typeof args === 'string' ) {
		var filesh = 'settings/'+ args
		args       = '';
	} else if ( [ '.sh', '.py' ].includes( args[ 0 ].slice( -3 ) ) ) {
		var filesh = args[ 0 ];
		args.shift();
	} else {
		var filesh = page ? 'settings/'+ page +'.sh': 'cmd.sh';
	}
	// websocket
	if ( ! callback && ws.readyState === 1 ) {
		var data = '{ "filesh": [ "'+ filesh +'", "'+ args.join( '\\n' ).replace( /"/g, '\\"' ) +'" ] }';
		if ( V.debug ) {
			bashConsoleLog( data );
			return
		}
		
		ws.send( data );
		return
	}
	// php
	var data = { cmd: 'bash', filesh: filesh, args: args || '' }
	if ( V.debug ) {
		bashConsoleLog( data );
		return
	}
	
	$.post( 'cmd.php', data, callback || null, json || null );
}
function bashConsoleLog( data ) {
	console.log( '%cDebug:', "color:red" );
	if ( typeof data === 'string' ) {
		console.log( JSON.parse( data ) );
		console.log( "websocat ws://127.0.0.1:8080 <<< '"+ data +"'" );
	} else {
		var bashcmd = data.filesh.split( '/' ).pop();
		if ( data.args ) bashcmd += ' "\\\n'+ data.args.join( '\n' ).replace( /"/g, '\\"' ) +'"';
		console.log( data );
		console.log( bashcmd );
	}
}

$( '.pagerefresh' ).press( () => location.reload() );

$( '#debug' ).on( 'click', function() {
	if ( V.press ) return
	
	if ( $( '#data' ).length ) {
		$( '#data' ).remove();
	} else {
		$( '#banner' ).after( '<pre id="data">'+ highlightJSON( S ) +'</pre>' );
	}
} ).press( () => {
	if ( V.debug ) {
		V.debug = false;
		refreshData();
		$( '#debug' ).removeClass( 'active' );
		console.log( '\x1B[36mDebug:\x1B[0m Disabled' );
		return
	}
	
	bash( [ 'cmd.sh', 'cachetype' ], type => {
		info( {
			  icon  : 'flash'
			, title : 'Debug / Cache'
			, list  : [ '', 'radio', { kv: {
				  'Debug'                  : 'debug'
				, 'Cache - static'         : 'static'
				, 'Cache <c>?v=time()</c>' : 'time'
			}, sameline: false } ]
			, okno  : true
			, beforeshow : () => {
				if ( navigator.maxTouchPoints ) $( '#infoList tr' ).eq( 0 ).addClass( 'hide' );
				$( '#infoList input[value='+ type +']' ).prop( { checked: true, disabled: true } );
				$( '#infoList input' ).on( 'click', function() {
					type = $( this ).val();
					if ( type === 'debug' ) {
						V.debug = true;
						$( '#debug' ).addClass( 'active' );
						console.log( '\x1B[36mDebug:\x1B[0m Data to server blocked' );
						$( '#infoX' ).trigger( 'click' );
					} else {
						bash( [ 'cmd.sh', 'cachebust', type === 'time', 'CMD TIME' ], location.reload() );
					}
				} );
			}
		} );
	} );
} );
