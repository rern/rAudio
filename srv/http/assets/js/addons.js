document.title = 'Addons';
V              = {} // var global
var icon       = 'jigsaw';

$( '.container' ).removeClass( 'hide' );
$( '.bottom' ).height( window.innerHeight - $( '.container div:last' ).height() - 200 );
loaderHide();

if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( 'a' ).removeAttr( 'href' );
$( '.close' ).click( function() {
	location.href = '/';
} );
$( '.page-icon' ).click( function() {
	fetch( '/data/addons/addons-list.json' )
		.then( response => response.text() )
		.then( data => {
			$( '#data' ).text( '\n\n'+ data );
			$( '.container' ).addClass( 'hide' );
			$( '#button-data, #data' ).removeClass( 'hide' );
		} );
} ).press( function() {
	location.href = 'settings.php?p=addonsprogress';
} );
$( '#button-data' ).click( function() {
	$( '.container' ).removeClass( 'hide' );
	$( '#button-data, #data' ).addClass( 'hide' );
} );
$( '.helphead' ).click( function() {
	var hidden = $( '.revisiontext' ).hasClass( 'hide' );
	$( this ).toggleClass( 'bl', hidden );
	$( '.revisiontext' ).toggleClass( 'hide', ! hidden );
} );
$( '.revision' ).click( function( e ) {
	e.stopPropagation();
	$this = $( this );
	$revisiontext = $this.parent().parent().next();
	var hidden = $revisiontext.hasClass( 'hide' );
	$( '.helphead' ).toggleClass( 'bl', hidden );
	$revisiontext.toggleClass( 'hide', ! hidden );
} );
$( '#list li' ).click( function() {
	alias = $( this ).data( 'alias' );
	$( 'html, body' ).scrollTop( $( '#'+ alias ).offset().top - 50 );
} );
$( '.boxed-group .infobtn' ).click( function() {
	$this       = $( this );
	if ( $this.hasClass( 'disabled' ) ) return
	
	alias  = $this.parent().data( 'alias' );
	addon  = addons[ alias ];
	title  = addon.title;
	type   = $this.text();
	option = addons.option;
	opt    = [ alias, type, addon.version || 'main' ];
	if ( option && type !== 'Update' && type !== 'Uninstall' ) {
		j = 0;
		getOption();
	} else {
		info( {
			  icon    : icon
			, title   : title
			, message : addon.version ? type +' to <wh>'+ addon.version +'</wh> ?' : type +'?'
			, ok      : formPost
		} );
	}
} ).press( function( e ) {
	$this = $( e.target );
	alias = $this.parents( 'form' ).data( 'alias' );
	title = addons[ alias ].title;
	type  = $this.text();
	info( {
		  icon      : icon
		, title     : title
		, textlabel : 'Branch / Release'
		, values    : 'UPDATE'
		, ok        : () => {
			opt    = [ alias, type, infoVal() ];
			option = addons[ alias ].option;
			if ( option && type !== 'Update' && type !== 'Uninstall' ) {
				j = 0;
				getOption();
			} else {
				formPost();
			}
		}
	} );
} );
$( '.thumbnail' ).click( function() {
	$( this ).prev().find( '.source' )[ 0 ].click();
} );

function formPost() { // post submit with temporary form
	var htmlform  = '<form id="formtemp" action="settings.php?p=addonsprogress" method="post">';
	opt.forEach( o => htmlform += '<input type="hidden" name="opt[]" value="'+ o.trim() +'">' );
	$( 'body' ).append( htmlform +'</form>' );
	$( '#formtemp' ).submit();
}
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
				, ok      : setOption
			} );
			break;
		case 'confirm': // 'Cancel' = close
			info( {
				  icon    : icon
				, title   : title
				, message : option[ oj ]
				, oklabel : 'Continue'
				, ok      : setOption
			} );
			break;
		case 'yesno': // 'Cancel' = 0
			var ojson = option[ oj ];
			info( {
				  icon        : icon
				, title       : title
				, message     : ojson.message
				, buttonlabel : 'No'
				, button      : () => setOption( 0 )
				, ok          : () => setOption( 1 )
			} );
			break;
		case 'skip': // 'Cancel' = continue, 'Ok' = skip options
			info( {
				  icon        : icon
				, title       : title
				, message     : option[ oj ]
				, buttonlabel : 'No'
				, button      : setOption
				, oklabel     : 'Yes'
				, ok          : formPost
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
				, ok        : () => setOption( infoVal() || 0 )
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
						infoVerifyPassword( title, pwd, () => setOption( pwd ) );
					} else {
						setOption( 0 );
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
				, ok      : () => setOption( infoVal() )
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
				, ok          : () => setOption( infoVal() )
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
				, ok       : () => setOption( infoVal() )
			} );
			break;
	}
}
function setOption( val ) {
	if ( val ) opt.push( val );
	j++;
	j < olength ? getOption() : formPost();
}
