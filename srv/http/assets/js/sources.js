$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function infoMount( formdata, cifs ) {
	var data = {};
	info( {
		  icon    : 'network'
		, title   : 'Network Share'
		, content : htmlmount
		, preshow : function() {
			if ( $.isEmptyObject( formdata ) ) {
				$( 'input[name=protocol]:eq( 0 )' ).prop( 'checked', 1 );
				$( '#infotextbox input:eq( 1 )' ).val( '192.168.1.' );
				$( '#infoCheckBox input' ).prop( 'checked', true );
			} else {
				if ( formdata.protocol === 'cifs' ) {
					$( 'input[name=protocol]:eq( 0 )' ).prop( 'checked', 1 );
					$( '#infotextbox input:eq( 3 )' ).val( formdata.user );
					$( '#infotextbox input:eq( 4 )' ).val( formdata.password );
				} else {
					$( 'input[name=protocol]:eq( 1 )' ).prop( 'checked', 1 );
					$( '.guest' ).addClass( 'hide' );
				}
				$( '#infotextbox input:eq( 0 )' ).val( formdata.name );
				$( '#infotextbox input:eq( 1 )' ).val( formdata.ip );
				$( '#infotextbox input:eq( 2 )' ).val( formdata.directory );
				$( '#infotextbox input:eq( 5 )' ).val( formdata.options );
				$( '#infoCheckBox input' ).prop( 'checked', formdata.update );
			}
			if ( G.autoupdate ) $( '#infoCheckBox' ).addClass( 'hide' );
			if ( cifs ) $( '#infoRadio' ).hide();
			$( '.eye.guest' ).css( 'margin-top', '210px' );
			var $dir = $( 'input[name=directory]' );
			$( 'input[name=protocol]' ).change( function() {
				if ( $( this ).val() === 'nfs' ) {
					$( '#sharename' ).text( 'Share path' );
					$( '.guest' ).addClass( 'hide' );
					$dir.val( '/'+ $dir.val() );
				} else {
					$( '#sharename' ).text( 'Share name' );
					$( '.guest' ).removeClass( 'hide' );
					$dir.val( $dir.val().replace( /\//g, '' ) );
				}
			} );
			// verify
			$( '#infoOk' ).addClass( 'disabled' );
			$( '.infoinput' ).keyup( function() {
				var $this = $( this );
				var cifs = $( 'input[name=protocol]:checked' ).val() === 'cifs';
				var val;
				if ( $this.prop( 'name' ) === 'directory' ) {
					val = $this.val();
					if ( cifs ) {
						$this.val( val.replace( /\/|\\/g, '' ) );
					} else {
						if ( val[ 0 ] !== '/' ) $this.val( '/'+ val );
					}
				}
				var form = document.getElementById( 'formmount' );
				data = Object.fromEntries( new FormData( form ).entries() );
				var valid = !data.name || !data.directory ? false : true;
				if ( valid ) valid = valid && validateIP( data.ip );
				$( '#infoOk' ).toggleClass( 'disabled', !valid );
			} );
		}
		, ok      : function() {
			var mountpoint = data.name;
			if ( data.protocol === 'cifs' ) {
				var options = 'noauto';
				options += ( !data.user ) ? ',username=guest,password=' : ',username='+ data.user +',password='+ data.password;
				options += ',uid='+ $( '#list' ).data( 'uid' ) +',gid='+ $( '#list' ).data( 'gid' ) +',iocharset=utf8';
				options += data.options ? ','+ data.options : '';
				var device = '//'+ data.ip +'/'+ directory;
			} else {
				var options = 'defaults,noauto,bg,soft,timeo=5';
				options += data.options ? ','+ data.options : '';
				var device = data.ip +':'+ directory;
			}
			var update = !G.autoupdate && data.update || false;
			notify( 'Network Mount', 'Mount ...', 'network' );
			bash( [ 'mount', mountpoint, data.ip, device, data.protocol, options, update ], function( std ) {
				if ( std !== 0 ) {
					formdata = data;
					info( {
						  icon    : 'network'
						, title   : 'Mount Share'
						, message : std
						, ok      : function() {
							infoMount( formdata );
						}
					} );
				} else {
					refreshData();
					formdata = {}
				}
				$( '#refreshing' ).addClass( 'hide' );
			}, 'json' );
			$( '#refreshing' ).removeClass( 'hide' );
		}
	} );
}

refreshData = function() {
	$( '#refreshing' ).removeClass( 'hide' );
	bash( '/srv/http/bash/sources-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		G.autoupdate = G.pop();
		reboot = G.pop();
		G.reboot = reboot ? reboot.split( '\n' ) : [];
		var html = '';
		$.each( G, function( i, val ) {
			if ( val.mounted ) {
				var dataunmounted = '';
				var dot = '<grn>&ensp;&bull;&ensp;</grn>';
			} else {
				var dataunmounted = ' data-unmounted="1"';
				var dot = '<red>&ensp;&bull;&ensp;</red>';
			}
			html += '<li '+ dataunmounted;
			html += '><i class="fa fa-'+ val.icon +'"></i><wh class="mountpoint">'+ val.mountpoint +'</wh>'+ dot
			html += '<gr class="source">'+ val.source +'</gr>';
			html +=  val.size ? '&ensp;'+ val.size +'</li>' : '</li>';
		} );
		$( '#list' ).html( html );
		$( '#refreshing' ).addClass( 'hide' );
		[ 'fstab', 'mount' ].forEach( function( id ) {
			codeToggle( id, 'status' );
		} );
		resetLocal();
		showContent();
	} );
}
refreshData();
//---------------------------------------------------------------------------------------
var formdata = {}
var htmlmount = heredoc( function() { /*
	<form id="formmount">
		<div id="infoText" class="infocontent">
			<div class="infotextlabel">
				Type<br>
				Name<br>
				IP<br>
				<span id="sharename">Share name</span><br>
				<span class="guest">
					User<br>
					Password<br>
				</span>
				Options
			</div>
			<div class="infotextbox">
				<label><input type="radio" name="protocol" value="cifs"> CIFS</label>&emsp;
				<label><input type="radio" name="protocol" value="nfs"> NFS</label>&emsp;
				<input type="text" class="infoinput" name="name" spellcheck="false">
				<input type="text" class="infoinput" name="ip" spellcheck="false">
				<input type="text" class="infoinput" name="directory" spellcheck="false">
				<div class="guest">
					<input type="text" class="infoinput" name="user" spellcheck="false">
					<input type="password" id="infoPasswordBox" class="infoinput" name="password">
				</div>
				<input type="text" class="infoinput" name="options" spellcheck="false">
			</div>
			<div id="infotextsuffix">
				<i class="eye fa fa-eye fa-lg guest"></i>
			</div>
			<div id="infoCheckBox" class="infocontent infocheckbox infohtml">
				<label><input type="checkbox" name="update" value="true" checked>&ensp;Update Library on mount</label>
			</div>
		</div>
	</form>
*/ } );
$( '#addnas' ).click( function() {
	infoMount();
} );
$( '#list' ).on( 'click', 'li', function() {
	var $this = $( this );
	var mountpoint = $this.find( '.mountpoint' ).text();
	if ( mountpoint === '/' ) return
	
	var nas = mountpoint.slice( 9, 12 ) === 'NAS';
	var source = $this.find( '.source' ).text();
	if ( !$this.data( 'unmounted' ) ) {
		info( {
			  icon    : nas ? 'network' : 'usbdrive'
			, title   : ( nas ? 'Network Share' : 'USB Drive' )
			, message : 'Unmount:<br><wh>'+ mountpoint +'</wh>'
			, oklabel : 'Unmount'
			, okcolor : '#de810e'
			, ok      : function() {
				notify( 'Network Mount', 'Unmount ...', 'network' );
				bash( [ 'unmount', mountpoint ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
		} );
	} else { // remove / remount
		info( {
			  icon        : nas ? 'network' : 'usbdrive'
			, title       : ( nas ? 'Network Share' : 'USB Drive' )
			, message     : 'Remove / Remount:<br><wh>'+ mountpoint +'</wh>'
			, buttonwidth : 1
			, buttonlabel : 'Remove'
			, buttoncolor : '#bb2828'
			, button      : function() {
				notify( 'Network Mount', 'Remove ...', 'network' );
				bash( [ 'remove', mountpoint ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
			, oklabel     : 'Remount'
			, ok          : function() {
				notify( 'Network Mount', 'Remount ...', 'network' );
				bash( [ 'remount', mountpoint, source ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
		} );
	}
} );
/*$( '#listshare' ).on( 'click', 'li', function() {
	if ( $( this ).find( '.blink' ).length ) return
	
	if ( $( this ).find( '.fa-search' ).length ) {
		$( '#listshare' ).html( '<li><i class="fa fa-search blink"></i></li>' );
		bash( '/srv/http/bash/sources-sharescan.sh', function( list ) {
			var list = JSON.parse( list );
			if ( list.length ) {
				var html = '';
				$.each( list, function( i, val ) {
					html += '<li data-mount="//'+ val.ip +'/'+ val.share +'"><i class="fa fa-networks"></i><gr>'+ val.host +'<grn>&ensp;&bull;&ensp;</grn>//'+ val.ip +'/'+ val.share +'</li>';
				} );
			} else {
				var html = '<li><i class="fa fa-info-circle"></i><gr>No shares available</gr></li>';
			}
			$( '#listshare' ).html( html );
			$( '#refreshshares' ).removeClass( 'hide' );
		}, 'json' );
	} else {
		var source = $( this ).data( 'mount' );
		var ipshare = source.split( '/' );
		var share = ipshare.pop();
		var ip = ipshare.pop();
		infoMount( {
			  protocol  : 'cifs'
			, name      : share
			, ip        : ip
			, directory : share
		}, 'cifs' );
	}
} );
$( '#refreshshares' ).click( function() {
	$( '#listshare li:eq( 0 )' )
		.html( '<li><i class="fa fa-search"></i></li>' )
		.click();
} );*/

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
