function branchtest( alias, type, message, install ) {
	info( {
		  icon      : 'jigsaw'
		, title     : title
		, message   : message
		, textlabel : 'Tree #/Branch'
		, values    : 'UPDATE'
		, ok        : function() {
			opt = [ alias, type, infoVal() ];
			option = addons[ alias ].option;
			j = 0;
			if ( install && option ) {
				getoptions();
			} else {
				postcmd();
			}
		}
	} );
}
function getoptions() {
	okey = Object.keys( option );
	olength = okey.length;
	oj = okey[ j ];
	oj0 = oj.replace( /[0-9]/, '' ); // remove trailing # from option keys
	switch( oj0 ) {
		case 'wait': // only 1 'Ok' = continue
			info( {
				  icon    : 'jigsaw'
				, title   : title
				, message : option[ oj ]
				, oklabel : 'Continue'
				, ok      : sendcommand
			} );
			break;
		case 'confirm': // 'Cancel' = close
			info( {
				  icon    : 'jigsaw'
				, title   : title
				, message : option[ oj ]
				, oklabel : 'Continue'
				, ok      : sendcommand
			} );
			break;
		case 'yesno': // 'Cancel' = 0
			var ojson = option[ oj ];
			info( {
				  icon        : 'jigsaw'
				, title       : title
				, message     : ojson.message
				, buttonlabel : 'No'
				, button      : function() {
					opt.push( 0 );
					sendcommand();
				}
				, ok          : function() {
					opt.push( 1 );
					sendcommand();
				}
			} );
			break;
		case 'skip': // 'Cancel' = continue, 'Ok' = skip options
			info( {
				  icon        : 'jigsaw'
				, title       : title
				, message     : option[ oj ]
				, buttonlabel : 'No'
				, button      : sendcommand
				, oklabel     : 'Yes'
				, ok          : postcmd
			} );
			break;
		case 'text':
			var ojson = option[ oj ];
			info( {
				  icon      : 'jigsaw'
				, title     : title
				, message   : ojson.message
				, textlabel : ojson.label
				, values    : ojson.value
				, boxwidth  : ojson.width
				, ok        : function() {
					opt.push( infoVaal() || 0 );
					sendcommand();
				}
			} );
			break;
		case 'password':
			ojson = option[ oj ];
			info( {
				  icon          : 'jigsaw'
				, title         : title
				, message       : ojson.message
				, passwordlabel : ojson.label
				, ok:          function() {
					var pwd = infoVal();
					if ( pwd ) {
						verifyPassword( title, pwd, function() {
							opt.push( pwd );
							sendcommand();
						} );
					} else {
						if ( !ojson.required ) {
							opt.push( 0 );
							sendcommand();
						} else {
							verifyPasswordblank( title, ojson.message, ojson.label, function() {
								opt.push( pwd );
								sendcommand();
							} );
						}
					}
				}
			} );
			break;
		case 'radio': // single value
			ojson = option[ oj ];
			info( {
				  icon    : 'jigsaw'
				, title   : title
				, message : ojson.message
				, radio   : ojson.list
				, values  : ojson.checked
				, ok      : function() {
					opt.push( infoVal() );
					sendcommand();
				}
			} );
			break;
		case 'select': // long single value
			ojson = option[ oj ];
			info( {
				  icon        : 'jigsaw'
				, title       : title
				, message     : ojson.message
				, selectlabel : ojson.label
				, select      : ojson.list
				, values      : ojson.checked
				, boxwidth    : ojson.width || 80
				, ok          : function() {
					opt.push( infoVal() );
					sendcommand();
				}
			} );
			break;
		case 'checkbox': // multiple values
			ojson = option[ oj ];
			info( {
				  icon     : 'jigsaw'
				, title    : title
				, message  : ojson.message
				, checkbox : ojson.list
				, values   : ojson.checked
				, ok       : function() {
					opt.push( infoVal() );
					sendcommand();
				}
			} );
			break;
	}
}
function postcmd() { // post submit with temporary form
	var form = '<form id="formtemp" action="/settings/addons-progress.php" method="post">';
	var optL = opt.length;
	for ( i = 0; i < optL; i++ ) { // [ branch, alias, type, opt1, opt2, ... ]
		form += '<input type="hidden" name="sh[]" value="'+ opt[ i ] +'">'
	}
	form += '</form>';
	$( 'body' ).append( form );
	$( '#formtemp' ).submit();
	banner( 'Addons', 'Download files ...', 'jigsaw blink', -1 );
}
function sendcommand() {
	j++;
	if ( j < olength ) {
		getoptions();
	} else {
		postcmd();
	}
}
//---------------------------------------------------------------------------
data = {}
if ( [ 'localhost', '127.0.0.1' ].indexOf( location.hostname ) !== -1 ) $( 'a' ).removeAttr( 'href' );
$( '#close' ).click( function() {
	location.href = '/';
} );
$( '.revision' ).click( function(e) {
	e.stopPropagation();
	$( this ).parent().parent().next().toggle();
	$( this ).toggleClass( 'revisionup' );
} );
$( '#list li' ).click( function() {
	var alias = this.getAttribute( 'alias' );
	$( 'html, body' ).scrollTop( $( '#'+ alias ).offset().top - 50 );
} );
$( '.boxed-group .infobtn' ).on( 'longtap', function () {
	$this = $( this );
	alias = $this.parent().attr( 'alias' );
	title = addons[ alias ].title.replace( / *\**$/, '' );
	type = $this.text();
	rollback = addons[ alias ].rollback || '';
	if ( rollback ) {
		info( {
			  icon      : 'jigsaw'
			, title     : title
			, message   : 'Upgrade / Downgrade ?'
			, radiohtml : '<label><input type="radio" name="inforadio" value="1" checked>&ensp;Rollback to previous version</label><br>'
						 +'<label><input type="radio" name="inforadio" value="Branch">&ensp;Tree # / Branch ...</label>'
			, ok        : function() {
				if ( infoVal() == 1 ) {
					opt = [ alias, type, rollback ];
					postcmd();
				} else {
					branchtest( alias, type, 'Upgrade / Downgrade to ?' );
				}
			}
		} );
	} else if ( type === 'Install' ) {
		branchtest( alias, type, 'Install version?', 'install' );
	} else {
		branchtest( alias, type, 'Install version?' );
	}
} ).on( 'click', function () {
	$this = $( this );
	if ( $this.hasClass( 'disabled' ) ) return
	
	alias = $this.parent().attr( 'alias' );
	version = $this.parent().attr( 'version' );
	title = addons[ alias ].title.replace( / *\**$/, '' );
	type = $this.text();
	opt = [ alias, type, version ];
	if ( $this.attr( 'warning' ) ) {
		info( {
			  icon    : 'jigsaw'
			, title   : title
			, message : $( this ).attr( 'warning' )
		} );
		return
	}
	
	option = addons[ alias ].option;
	j = 0;
	if ( option && type !== 'Update' && type !== 'Uninstall' ) {
		getoptions();
	} else {
		info( {
			  icon    : 'jigsaw'
			, title   : title
			, message : type +'?'
			, ok      : function () {
				( option && type !== 'Update' && type !== 'Uninstall' ) ? getoptions() : postcmd();
			}
		} );
	}
} );
$( '.thumbnail' ).click( function() {
	$( this ).prev().find( '.source' )[ 0 ].click();
} );
