document.title = 'Addons';
V              = {} // var global
var icon       = 'jigsaw';

if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( 'a' ).removeAttr( 'href' );
$( '.page-icon' ).press( function() {
	location.href = 'settings.php?p=addonsprogress';
} );
$( '.helphead' ).off( 'click' ).click( function() {
	var hidden = $( '.revisiontext' ).hasClass( 'hide' );
	$( this ).toggleClass( 'bl', hidden );
	$( '.revisiontext' ).toggleClass( 'hide', ! hidden );
} );
$( '.container' ).on( 'click', '.revision', function() {
	$this = $( this );
	$revisiontext = $this.parent().next();
	var hidden = $revisiontext.hasClass( 'hide' );
	$( '.helphead' ).toggleClass( 'bl', hidden );
	$revisiontext.toggleClass( 'hide', ! hidden );
} ).on( 'click', '#list li', function() {
	alias = $( this ).data( 'alias' );
	$( 'html, body' ).scrollTop( $( '#'+ alias ).offset().top - 50 );
} ).on( 'click', '.infobtn', function() {
	$this       = $( this );
	if ( $this.hasClass( 'disabled' ) ) return
	
	alias  = $this.parent().data( 'alias' );
	addon  = S[ alias ];
	title  = addon.title;
	type   = $this.text();
	option = addon.option;
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
} ).on( 'click', '.thumbnail', function() {
	$( this ).prev().find( '.source' )[ 0 ].click();
} ).press( function( e ) {
	$this = $( e.target );
	alias = $this.parents( 'form' ).data( 'alias' );
	title = S[ alias ].title;
	type  = $this.text();
	info( {
		  icon      : icon
		, title     : title
		, textlabel : 'Branch / Release'
		, values    : 'UPDATE'
		, ok        : () => {
			opt    = [ alias, type, infoVal() ];
			option = S[ alias ].option;
			if ( option && type !== 'Update' && type !== 'Uninstall' ) {
				j = 0;
				getOption();
			} else {
				formPost();
			}
		}
	} );
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
function renderPage() {
	var list   = '';
	var addons = '';
	delete S.push;
	$.each( S, ( alias, addon ) => {
		if ( alias === 'status' || ( S.status.hide.includes( alias ) ) ) return
		
		var installed   = S.status.installed.includes( alias ) ? ' installed' : '';
		var notverified = S.status.notverified.includes( alias );
		var update      = S.status.update.includes( alias ) ? ' update' : '';
		var version     = 'version' in addon ? '&emsp;<a class="revision">'+ addon.version +' <i class="i-help"></i></a>' : '';
		if ( 'revision' in addon ) {
			var revision = '<p class="revisiontext hide">';
			addon.revision.forEach( el => revision += '<gr>•</gr>'+ el +'<br>' );
			revision    += '</p>';
		} else {
			var revision = '';
		}
		if ( notverified ) {
			var button   = iconwarning + addon.verify.notverified;
		} else {
			var disabled = ''
			if ( installed ) {
				disabled = update ? '' : ' disabled';
				var buttonlabel = ico( 'update' ) +'Update';
			} else {
				var buttonlabel = addon.buttonlabel || ico( 'plus-circle' ) +'Install';
			}
			var button   = '<a class="install infobtn '+ disabled +'">'+ buttonlabel +'</a>';
			if ( version && ! ( 'nouninstall' in addon ) ) button += ' &nbsp; <a class="uninstall infobtn"><i class="i-minus-circle"></i> Uninstall</a>';
		}
		addons         += `\
<div id="${ alias }" class="divaddon${ installed }">
	<div class="content">
		<legend><span class="title ${ update }">${ addon.title }</span>${ version }</legend>
		${ revision }
		<form class="form-horizontal" data-alias="${ alias }">
			<p class="detailtext">${ addon.description }<br><a href="${ addon.sourcecode }" class="source" target="_blank">source <i class="i-github"></i></a></p>
			${ button }
		</form>
	</div>
	<img src="${ addon.thumbnail }" class="thumbnail">
	<div style="clear: both;"></div>
</div>
`;
		list           += '<li class="'+ alias + installed +'" data-alias="'+ alias +'">'+ addon.title +'</li>';
	} );
	html       = '<ul id="list">'+ list +'</ul>'+ addons +'<p class="bottom"></p>';
	$( '.container' ).html( html ).promise().done( function() {
		$( '.installed' ).removeClass( 'installed update' );
		$( '.uninstall' ).addClass( 'hide' );
		$( '.container' ).removeClass( 'hide' );
		$( '.bottom' ).height( window.innerHeight - $( '.container div:last' ).height() - 200 );
		loaderHide();
	} );
}
function setOption( val ) {
	if ( val ) opt.push( val );
	j++;
	j < olength ? getOption() : formPost();
}
