function branchtest( alias, type, install ) {
	info( {
		  icon      : 'jigsaw'
		, title     : title
		, textlabel : 'Branch / Release'
		, values    : 'UPDATE'
		, ok        : () => {
			opt    = [ alias, type, infoVal() ];
			option = addons[ alias ].option;
			j      = 0;
			if ( install && option ) {
				getoptions();
			} else {
				postcmd();
			}
		}
	} );
}
function getoptions() {
	okey    = Object.keys( option );
	olength = okey.length;
	oj      = okey[ j ];
	oj0     = oj.replace( /[0-9]/, '' ); // remove trailing # from option keys
	switch ( oj0 ) {
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
				, button      : () => {
					opt.push( 0 );
					sendcommand();
				}
				, ok          : () => {
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
				, ok        : () => {
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
				, ok:          () => {
					var pwd = infoVal();
					if ( pwd ) {
						infoVerifyPassword( title, pwd, function() {
							opt.push( pwd );
							sendcommand();
						} );
					} else {
						opt.push( 0 );
						sendcommand();
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
				, ok      : () => {
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
				, boxwidth    : ojson.width
				, ok          : () => {
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
				, ok       : () => {
					opt.push( infoVal() );
					sendcommand();
				}
			} );
			break;
	}
}
function postcmd() { // post submit with temporary form
	var form  = '<form id="formtemp" action="settings.php?p=addons-progress" method="post">';
	opt.forEach( ( o ) => {
		form += '<input type="hidden" name="opt[]" value="'+ o.trim() +'">';
	} );
	$( 'body' ).append( form +'</form>' );
	$( '#formtemp' ).submit();
	banner( 'jigsaw blink', 'Addons', 'Download files ...', -1 );
}
function sendcommand() {
	j++;
	j < olength ? getoptions() : postcmd();
}

//---------------------------------------------------------------------------
document.title = 'Addons';
$( '.container' ).removeClass( 'hide' );
$( '.bottom' ).height( window.innerHeight - $( '.container div:last' ).height() - 200 );
loaderHide();

if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( 'a' ).removeAttr( 'href' );
$( '.close' ).click( function() {
	location.href = '/';
} );
$( '.help-head' ).click( function() {
	var hidden = $( '.revisiontext' ).hasClass( 'hide' );
	$( this ).toggleClass( 'bl', hidden );
	$( '.revisiontext' ).toggleClass( 'hide', ! hidden );
} );
$( '.revision' ).click( function() {
	e.stopPropagation();
	var $this = $( this );
	$revisiontext = $this.parent().parent().next();
	var hidden = $revisiontext.hasClass( 'hide' );
	$( '.help-head' ).toggleClass( 'bl', hidden );
	$revisiontext.toggleClass( 'hide', ! hidden );
} );
$( '#list li' ).click( function() {
	var alias = $( this ).data( 'alias' );
	$( 'html, body' ).scrollTop( $( '#'+ alias ).offset().top - 50 );
} );
$( '.boxed-group .infobtn' ).click( function() {
	var $this = $( this );
	if ( $this.hasClass( 'disabled' ) ) return
	
	alias   = $this.parent().data( 'alias' );
	version = $this.parent().data( 'version' );
	title   = addons[ alias ].title.replace( / *\**$/, '' );
	type    = $this.text();
	opt     = [ alias, type, version ];
	option  = addons[ alias ].option;
	j       = 0;
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
} ).press( function( e ) {
	var $this = $( e.target );
	alias     = $this.parent().data( 'alias' );
	title     = addons[ alias ].title.replace( / *\**$/, '' );
	type      = $this.text();
	rollback  = addons[ alias ].rollback || '';
	if ( rollback ) {
		info( {
			  icon      : 'jigsaw'
			, title     : title
			, message   : 'Upgrade / Downgrade ?'
			, radiohtml : '<label><input type="radio" name="inforadio" value="1" checked>&ensp;Rollback to previous version</label><br>'
						 +'<label><input type="radio" name="inforadio" value="Branch">&ensp;Tree # / Branch ...</label>'
			, ok        : () => {
				if ( infoVal() == 1 ) {
					opt = [ alias, type, rollback ];
					postcmd();
				} else {
					branchtest( alias, type );
				}
			}
		} );
	} else if ( type === 'Install' ) {
		branchtest( alias, type, 'install' );
	} else {
		branchtest( alias, type );
	}
} );
$( '.thumbnail' ).click( function() {
	$( this ).prev().find( '.source' )[ 0 ].click();
} );
