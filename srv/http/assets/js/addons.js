document.title = 'Addons';
V              = {} // var global
var icon       = 'jigsaw';
var keys       = [ 'installurl', 'postinfo', 'title', 'uninstall', 'version' ];

if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( 'a' ).removeAttr( 'href' );
$( '.helphead' ).off( 'click' ).on( 'click', function() {
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
	$this.toggleClass( 'active' );
} ).on( 'click', '#list li', function() {
	alias = $( this ).data( 'alias' );
	$( 'html, body' ).scrollTop( $( '#'+ alias ).offset().top - 50 );
} ).on( 'click', '.infobtn', function() {
	$this       = $( this );
	if ( $this.hasClass( 'disabled' ) && ! $this.hasClass( 'uninstall' ) ) {
		if ( ! S.status.online ) {
			info( {
				  icon    : 'addons'
				, title   : 'Addons'
				, message : 'Internet connection is offline.'
			} );
		}
		return
	}
	
	addonData( $this );
	if ( 'option' in V.addon ) {
		optionGet();
	} else {
		info( {
			  icon    : icon
			, title   : V.addon.title
			, message : V.addon.version ? V.label +' to <wh>'+ V.addon.version +'</wh> ?' : V.label +'?'
			, ok      : postData
		} );
	}
} ).on( 'click', '.thumbnail', function() {
	if ( S.status.online ) $( this ).prev().find( '.source' )[ 0 ].trigger( 'click' );
} ).press( '.install', function( e ) {
	if ( ! S.status.online ) return
	
	addonData( $( e.currentTarget ) );
	info( {
		  icon   : icon
		, title  : V.addon.title
		, list   : [ 'Branch / Release', 'text' ]
		, values : 'UPDATE'
		, ok     : () => {
			V.branch = infoVal();
			if ( ! V.branch ) return
			
			V.installurl = V.addon.installurl.replace( 'raw/main', 'raw/'+ V.branch );
			'option' in V.addon ? optionGet() : postData();
		}
	} );
} );

function addonData( $this ) {
	V.alias  = $this.parents( 'form' ).data( 'alias' );
	V.addon  = S[ V.alias ];
	V.branch = 'main';
	V.label  = $this.find( '.label' ).text();
	keys.forEach( k => V[ k ] = V.addon[ k ] );
}
function buttonLabel( icon, label ) {
	return ico( icon ) +' <span class="label">'+ label +'</span>';
}
function optionGet() {
	info( $.extend( {
			  icon  : icon
			, title : V.addon.title
			, ok    : () => postData( infoVal() )
		}, V.addon.option ) );
}
function postData( opt ) {
	var htmlform = '';
	keys = [ 'alias', 'branch', 'label' ].concat( keys );
	keys.forEach( k => htmlform += postInput( k, V[ k ] ) );
	if ( opt ) {
		if ( typeof opt !== 'object' ) opt = [ opt ];
		opt.forEach( v => htmlform += postInput( 'opt[]', v ) );
	}
	$( 'body' ).append( '<form id="formtemp" action="settings.php?p=addonsprogress" method="post">'+ htmlform +'</form>' );
	$( '#formtemp' ).submit();
}
function postInput( name, value ) {
	return '<input type="hidden" name="'+ name +'" value="'+ ( value || '' ) +'">'
}
function renderPage() {
	var list   = '';
	var addons = '';
	delete S.push;
	$.each( S, ( alias, addon ) => {
		if ( alias === 'status' || ( S.status.hidden.includes( alias ) ) ) return
		var notverified = S.status.notverified.includes( alias );
		var version     = 'version' in addon ? '&emsp;<a class="revision">'+ addon.version +'</a>' : '';
		if ( 'revision' in addon ) {
			var revision = '<p class="revisiontext hide">';
			addon.revision.forEach( el => revision += '<gr>•</gr> '+ el +'<br>' );
			revision    += '</p>';
		} else {
			var revision = '';
		}
		if ( notverified ) {
			var button   = iconwarning + addon.notverified;
		} else {
			var installed   = S.status.installed.includes( alias ) ? ' installed' : '';
			var update      = S.status.update.includes( alias ) ? ' update' : '';
			var disabled = ''
			if ( installed ) {
				disabled = update ? '' : ' disabled';
				var buttonlabel = buttonLabel( 'update', 'Update' );
			} else if ( addon.buttonlabel ) {
				var buttonlabel = buttonLabel( addon.buttonlabel[ 0 ], addon.buttonlabel[ 1 ] );
			} else {
				var buttonlabel = buttonLabel( 'plus-circle', 'Install' );
			}
			var button   = '<a class="install infobtn'+ disabled +'">'+ buttonlabel +'</a>';
			if ( installed && 'uninstall' in addon ) button += ' <a class="uninstall infobtn"><i class="i-remove"></i> Uninstall</a>';
		}
		addons         += `\
<div id="${ alias }" class="divaddon">
	<div class="content">
		<legend><span class="title${ installed + update }">${ addon.title }</span>${ version }</legend>
		${ revision }
		<form class="form-horizontal" data-alias="${ alias }">
			<p class="detailtext">${ addon.description }<br><a href="${ addon.sourcecode }" class="source" target="_blank" tabindex="-1">source <i class="i-github"></i></a></p>
			${ button }
		</form>
	</div>
	<img src="${ addon.thumbnail }" class="thumbnail">
	<div style="clear: both;"></div>
</div>
`;
		list           += '<li class="'+ alias + installed + update +'" data-alias="'+ alias +'">'+ addon.title +'</li>';
	} );
	html       = '<ul id="list">'+ list +'</ul>'+ addons +'<p class="bottom"></p>';
	$( '.container' ).html( html ).promise().done( function() {
		$( '.container' ).removeClass( 'hide' );
		$( '.bottom' ).height( window.innerHeight - $( '.container div:last' ).height() - 370 );
		if ( ! S.status.online ) $( '.infobtn' ).addClass( 'disabled' );
		loaderHide();
		$( 'a[ href ]' ).prop( 'tabindex', -1 );
		$( '.infobtn:not(.disabled)' ).prop( 'tabindex', 0 );
	} );
}
