function getOption() {
	okey    = Object.keys( option );
	olength = okey.length;
	oj      = okey[ j ];
	oj0     = oj.replace( /[0-9]/, '' ); // remove trailing # from option keys
	switch ( oj0 ) {
		case 'wait': // only 1 'Ok' = continue
			info( {
				  icon    : icon
				, title   : title
				, message : option[ oj ]
				, oklabel : 'Continue'
				, ok      : sendCommand
			} );
			break;
		case 'confirm': // 'Cancel' = close
			info( {
				  icon    : icon
				, title   : title
				, message : option[ oj ]
				, oklabel : 'Continue'
				, ok      : sendCommand
			} );
			break;
		case 'yesno': // 'Cancel' = 0
			var ojson = option[ oj ];
			info( {
				  icon        : icon
				, title       : title
				, message     : ojson.message
				, buttonlabel : 'No'
				, button      : () => {
					opt.push( 0 );
					sendCommand();
				}
				, ok          : () => {
					opt.push( 1 );
					sendCommand();
				}
			} );
			break;
		case 'skip': // 'Cancel' = continue, 'Ok' = skip options
			info( {
				  icon        : icon
				, title       : title
				, message     : option[ oj ]
				, buttonlabel : 'No'
				, button      : sendCommand
				, oklabel     : 'Yes'
				, ok          : postCommand
			} );
			break;
		case 'text':
			var ojson = option[ oj ];
			info( {
				  icon      : icon
				, title     : title
				, message   : ojson.message
				, textlabel : ojson.label
				, values    : ojson.value
				, boxwidth  : ojson.width
				, ok        : () => {
					opt.push( infoVal() || 0 );
					sendCommand();
				}
			} );
			break;
		case 'password':
			ojson = option[ oj ];
			info( {
				  icon          : icon
				, title         : title
				, message       : ojson.message
				, passwordlabel : ojson.label
				, ok:          () => {
					var pwd = infoVal();
					if ( pwd ) {
						infoVerifyPassword( title, pwd, function() {
							opt.push( pwd );
							sendCommand();
						} );
					} else {
						opt.push( 0 );
						sendCommand();
					}
				}
			} );
			break;
		case 'radio': // single value
			ojson = option[ oj ];
			info( {
				  icon    : icon
				, title   : title
				, message : ojson.message
				, radio   : ojson.list
				, values  : ojson.checked
				, ok      : () => {
					opt.push( infoVal() );
					sendCommand();
				}
			} );
			break;
		case 'select': // long single value
			ojson = option[ oj ];
			info( {
				  icon        : icon
				, title       : title
				, message     : ojson.message
				, selectlabel : ojson.label
				, select      : ojson.list
				, values      : ojson.checked
				, boxwidth    : ojson.width
				, ok          : () => {
					opt.push( infoVal() );
					sendCommand();
				}
			} );
			break;
		case 'checkbox': // multiple values
			ojson = option[ oj ];
			info( {
				  icon     : icon
				, title    : title
				, message  : ojson.message
				, checkbox : ojson.list
				, values   : ojson.checked
				, ok       : () => {
					opt.push( infoVal() );
					sendCommand();
				}
			} );
			break;
	}
}
function postCommand() { // post submit with temporary form
	var form  = '<form id="formtemp" action="settings.php?p=addons-progress" method="post">';
	opt.forEach( ( o ) => {
		form += '<input type="hidden" name="opt[]" value="'+ o.trim() +'">';
	} );
	$( 'body' ).append( form +'</form>' );
	$( '#formtemp' ).submit();
	banner( 'jigsaw blink', 'Addons', 'Download files ...', -1 );
}
function sendCommand() {
	j++;
	j < olength ? getOption() : postCommand();
}

//---------------------------------------------------------------------------
icon           = 'jigsaw';
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
	$this = $( this );
	$revisiontext = $this.parent().parent().next();
	var hidden = $revisiontext.hasClass( 'hide' );
	$( '.help-head' ).toggleClass( 'bl', hidden );
	$revisiontext.toggleClass( 'hide', ! hidden );
} );
$( '#list li' ).click( function() {
	alias = $( this ).data( 'alias' );
	$( 'html, body' ).scrollTop( $( '#'+ alias ).offset().top - 50 );
} );
$( '.boxed-group .infobtn' ).click( function() {
	$this       = $( this );
	if ( $this.hasClass( 'disabled' ) ) return
	
	alias       = $this.parent().data( 'alias' );
	title       = addons[ alias ].title;
	type        = $this.text();
	option      = addons[ alias ].option;
	var version = $this.parent().data( 'version' );
	opt         = version ? [ alias, type, version ] : [ alias, type ];
	if ( option && type !== 'Update' && type !== 'Uninstall' ) {
		j = 0;
		getOption();
	} else {
		info( {
			  icon    : icon
			, title   : title
			, message : type +'?'
			, ok      : () => {
				postCommand();
			}
		} );
	}
} ).press( function( e ) {
	$this = $( e.target );
	alias = $this.parent().data( 'alias' );
	title = addons[ alias ].title;
	type  = $this.text();
	opt   = [ alias, type ];
	info( {
		  icon      : icon
		, title     : title
		, textlabel : 'Branch / Release'
		, values    : 'UPDATE'
		, ok        : () => {
			option = addons[ alias ].option;
			if ( type === 'Install' && option ) {
				j = 0;
				getOption();
			} else {
				postCommand();
			}
		}
	} );
} );
$( '.thumbnail' ).click( function() {
	$( this ).prev().find( '.source' )[ 0 ].click();
} );
