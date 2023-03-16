document.title = 'Addons';
V              = {} // var global
var icon       = 'jigsaw';

if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) $( 'a' ).removeAttr( 'href' );
$( '.page-icon' ).press( function() {
	optionSet();
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
	
	V.alias      = $this.parents( 'form' ).data( 'alias' );
	V.addon      = S[ V.alias ];
	V.label      = $this.find( '.label' ).text();
	V.branch     = V.addon.version || 'main';
	V.installurl = V.addon.installurl;
	V.uninstall  = 'version' in V.addon && ! ( 'nouninstall' in V.addon );
	if ( 'option' in V.addon ) {
		optionGet();
	} else {
		info( {
			  icon    : icon
			, title   : V.addon.title
			, message : V.addon.version ? V.label +' to <wh>'+ V.addon.version +'</wh> ?' : V.label +'?'
			, ok      : optionSet
		} );
	}
} ).on( 'click', '.thumbnail', function() {
	$( this ).prev().find( '.source' )[ 0 ].click();
} ).press( function( e ) {
	var $this    = $( e.target );
	if ( ! $this.parents( 'form' ).length ) return

	V.alias      = $this.parents( 'form' ).data( 'alias' );
	V.addon      = S[ V.alias ];
	V.label      = $this.find( '.label' ).text();
	V.uninstall  = 'version' in V.addon && ! ( 'nouninstall' in V.addon );
	info( {
		  icon      : icon
		, title     : V.addon.title
		, textlabel : 'Branch / Release'
		, values    : 'UPDATE'
		, ok        : () => {
			V.branch = infoVal();
			V.installurl = V.addon.installurl.replace( 'raw/main', 'raw/'+ V.branch );
			'option' in V.addon ? optionGet() : optionSet();
		}
	} );
} );

function buttonLabel( icon, label ) {
	return ico( icon ) +' <span class="label">'+ label +'</span>';
}
function optionGet() {
	V.optL = Object.keys( V.addon.option ).length;
	V.opt = [];
	$.each( V.addon.option, ( opt, v ) => {
		V.optL--;
		var i    = { icon: icon, title: V.title }
		switch ( opt ) {
			case 'confirm':
				i.message = v;
				i.oklabel = 'Continue';
				i.ok      = () => $( '#infoX' ).click();
				break;
			case 'text':
				i.message   = v.message
				i.textlabel = v.label
				i.values    = v.value
				i.boxwidth  = v.width
				i.ok        = () => optionSet( infoVal() || 0 )
				break;
			case 'radio':
				i.message = v.message
				i.radio   = v.list
				i.values  = v.checked
				i.ok      = () => optionSet( infoVal() )
				break;
			case 'checkbox':
				i.message  = v.message
				i.checkbox = v.list
				i.values   = v.checked
				i.ok       = () => optionSet( infoVal() )
				break;
			case 'select':
				i.message     = v.message
				i.selectlabel = v.label
				i.select      = v.list
				i.values      = v.checked
				i.boxwidth    = v.width
				i.ok          = () => optionSet( infoVal() )
				break;
		}
		info( i );
	} );
}
function optionSet( val ) {
	if ( val ) V.opt.push( val );
	if ( V.optL ) return
	
	var htmlform = '<form id="formtemp" action="settings.php?p=addonsprogress" method="post">';
	[ 'alias', 'branch', 'installurl', 'label' ]
		.forEach( k => htmlform += '<input type="hidden" name="'+ k +'" value="'+ ( V[ k ] || '' ) +'">' );
	if ( 'addon' in V ) {
		[ 'nouninstall', 'postinfo', 'title', 'version' ]
			.forEach( k => htmlform += '<input type="hidden" name="'+ k +'" value="'+ ( V.addon[ k ] || '' ) +'">' );
	}
	if ( 'opt' in V ) V.opt.forEach( v => htmlform += '<input type="hidden" name="opt[]" value="'+ v +'">' );
	$( 'body' ).append( htmlform +'</form>' );
	$( '#formtemp' ).submit();
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
				var buttonlabel = buttonLabel( 'update', 'Update' );
			} else if ( addon.buttonlabel ) {
				var buttonlabel = buttonLabel( addon.buttonlabel[ 0 ], addon.buttonlabel[ 1 ] );
			} else {
				var buttonlabel = buttonLabel( 'plus-circle', 'Install' );
			}
			var button   = '<a class="install infobtn'+ disabled +'">'+ buttonlabel +'</a>';
			if ( version && ! ( 'nouninstall' in addon ) ) button += ' &nbsp; <a class="uninstall infobtn"><i class="i-minus-circle"></i> Uninstall</a>';
		}
		addons         += `\
<div id="${ alias }" class="divaddon">
	<div class="content">
		<legend><span class="title${ installed + update }">${ addon.title }</span>${ version }</legend>
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
		list           += '<li class="'+ alias + installed + update +'" data-alias="'+ alias +'">'+ addon.title +'</li>';
	} );
	html       = '<ul id="list">'+ list +'</ul>'+ addons +'<p class="bottom"></p>';
	$( '.container' ).html( html ).promise().done( function() {
		$( '.container' ).removeClass( 'hide' );
		$( '.bottom' ).height( window.innerHeight - $( '.container div:last' ).height() - 200 );
		loaderHide();
	} );
}
