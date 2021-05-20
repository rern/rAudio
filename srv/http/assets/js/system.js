$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

var formdata = {}
var htmlmount = heredoc( function() { /*
	<form id="formmount" class="infocontent">
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
			<input type="text" class="infoinput" name="mountpoint">
			<input type="text" class="infoinput" name="ip">
			<input type="text" class="infoinput" name="directory">
			<div class="guest">
				<input type="text" class="infoinput" name="user">
				<input type="password" id="infoPasswordBox" class="infoinput" name="password">
			</div>
			<input type="text" class="infoinput" name="options">
		</div>
		<div id="infotextsuffix">
			<i class="eye fa fa-eye fa-lg guest"></i>
		</div>
		<div id="infoCheckBox" class="infocontent infocheckbox infohtml">
			<label><input type="checkbox" name="update" value="true" checked>&ensp;Update Library on mount</label>
		</div>
	</form>
*/ } );
function infoMount( data ) {
	if ( !data ) var data = {}
	info( {
		  icon    : 'network'
		, title   : 'Add Network Share'
		, content : htmlmount
		, preshow : function() {
			$( 'input[name=protocol]:eq( 0 )' ).prop( 'checked', data.protocol || 'cifs' );
			$( '.infotextbox input[name=mountpoint]' ).val( data.mountpoint );
			$( '.infotextbox input[name=ip]' ).val( data.ip || '192.168.1.' );
			$( '.infotextbox input[name=directory]' ).val( data.directory );
			$( '.infotextbox input[name=user]' ).val( data.user );
			$( '.infotextbox input[name=password]' ).val( data.password );
			$( '.infotextbox input[name=options]' ).val( data.options );
			$( '.infoCheckBox input' ).prop( 'checked', data.update || 1 );
			if ( G.autoupdate ) $( '#infoCheckBox input' ).prop( 'disabled', 1 );
			$( '.guest' ).toggleClass( 'hide', data.protocol === 'nfs' );
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
		}
		, ok      : function() {
			var form = document.getElementById( 'formmount' );
			data = Object.fromEntries( new FormData( form ).entries() );
			notify( 'Network Mount', 'Mount ...', 'network' );
			bash( [ 'mount', JSON.stringify( data ) ], function( std ) {
				if ( std ) {
					info( {
						  icon    : 'network'
						, title   : 'Mount Share'
						, message : std
						, ok      : function() {
							infoMount( data );
						}
					} );
					bannerHide();
				} else {
					refreshData();
				}
			} );
		}
	} );
}
function rebootText( enable, device ) {
	var exist = 0;
	if ( G.reboot.length ) {
		exist = G.reboot.some( function( line ) {
			return line.indexOf( device ) !== -1
		} );
	}
	if ( !exist ) G.reboot.push( ( enable ? 'Enable' : 'Disable' ) +' '+ device );
}
function renderStatus() {
	var status = G.cpuload.replace( / /g, ' <gr>&bull;</gr> ' );
	if ( G.cputemp ) {
		status += + G.cputemp < 80 ? '<br>'+ G.cputemp +' °C' : '<br><red><i class="fa fa-warning blink red"></i>&ensp;'+ G.cputemp +' °C</red>';
	} else {
		$( '#cputemp' ).hide();
	}
	status += '<br>'+ G.time.replace( ' ', ' <gr>&bull;</gr> ' ) +'&emsp;<grw>'+ G.timezone.replace( '/', ' · ' ) +'</grw>'
			+'<br>'+ G.uptime +'<span class="wide">&emsp;<gr>since '+ G.uptimesince.replace( ' ', ' &bull; ' ) +'</gr></span>'
			+'<br>'+ ( G.startup ? G.startup.replace( /\(/g, '<gr>' ).replace( /\)/g, '</gr>' ) : 'Booting ...' );
	if ( G.throttled ) { // https://www.raspberrypi.org/documentation/raspbian/applications/vcgencmd.md
		var bits = parseInt( G.throttled ).toString( 2 ); // 20 bits: 19..0 ( hex > decimal > binary )
		if ( bits.slice( -1 ) == 1 ) {                    // bit# 0  - undervoltage now
			status += '<br><i class="fa fa-warning blink red"></i>&ensp;Voltage under 4.7V - currently detected.'
		} else if ( bits.slice( -19, 1 ) == 1 ) {         // bit# 19 - undervoltage occured
			status += '<br><i class="fa fa-warning"></i>&ensp;Voltage under 4.7V - occurred.';
		}
	}
	return status
}

refreshData = function() {
	bash( '/srv/http/bash/system-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		var cpu = G.soccpu +' <gr>@</gr> ';
		cpu += G.socspeed < 1000 ? G.socspeed +'MHz' : G.socspeed / 1000 +'GHz';
		$( '#systemvalue' ).html(
			  'rAudio '+ G.version +' <gr>&bull; '+ G.versionui +'</gr>'
			+'<br>'+ G.kernel
			+'<br>'+ G.rpimodel.replace( /(Rev.*)$/, '<grw>$1</grw>' )
			+'<br>'+ G.soc + ' <gr>&bull;</gr> '+ G.socram
			+'<br>'+ cpu
		);
		$( '#status' ).html( renderStatus );
		$( '#throttled' ).toggleClass( 'hide', $( '#status .fa-warning' ).length === 0 );
		var html = '';
		$.each( G.list, function( i, val ) {
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
		if ( G.bluetooth ) {
			$( '#bluetooth' ).prop( 'checked', true );
			$( '#setting-bluetooth' ).toggleClass( 'hide', false );
			$( '#bt' )
				.removeAttr( 'class' )
				.addClass( 'col-l double status' )
				.html( '<a>Bluetooth<br><gr>bluetoothctl<i class="fa fa-status"></i></gr></a><i class="fa fa-bluetooth"></i>' );
		} else {
			$( '#bluetooth' ).prop( 'checked', false );
			$( '#setting-bluetooth' ).toggleClass( 'hide', true );
			$( '#bt' )
				.removeAttr( 'class' )
				.addClass( 'col-l single' )
				.html( 'Bluetooth<i class="fa fa-bluetooth"></i>' );
		}
		$( '#wlan' ).prop( 'checked', G.wlan );
		if ( G.wlan ) {
			$( '#wlan' ).prop( 'checked', true );
			$( '#wl' )
				.removeAttr( 'class' )
				.addClass( 'col-l double status' )
				.html( '<a>Wi-Fi<br><gr>brcmfmac<i class="fa fa-status"></i></gr></a><i class="fa fa-wifi"></i>' );
		} else {
			$( '#wlan' ).prop( 'checked', false );
			$( '#wl' )
				.removeAttr( 'class' )
				.addClass( 'col-l single' )
				.html( 'Wi-Fi<i class="fa fa-wifi"></i>' );
		}
		disableSwitch( '#wlan', G.hostapd || G.wlanconnected );
		$( '#i2smodule' ).val( 'none' );
		$( '#i2smodule option' ).filter( function() {
			var $this = $( this );
			return $this.text() === G.audiooutput && $this.val() === G.audioaplayname;
		} ).prop( 'selected', true );
		$( '#i2smodule' ).selectric( 'refresh' );
		var i2senabled = $( '#i2smodule' ).val() === 'none' ? false : true;
		$( '#divi2smodulesw' ).toggleClass( 'hide', i2senabled );
		$( '#divi2smodule' ).toggleClass( 'hide', !i2senabled );
		$( '#lcdchar' ).prop( 'checked', G.lcdchar );
		$( '#setting-lcdchar' ).toggleClass( 'hide', !G.lcdchar );
		$( '#lcd' ).prop( 'checked', G.lcd );
		$( '#setting-lcd' ).toggleClass( 'hide', !G.lcd );
		$( '#powerbutton' ).prop( 'checked', G.powerbutton );
		$( '#setting-powerbutton' ).toggleClass( 'hide', !G.powerbutton );
		var powerbuttonconf = G.powerbuttonconf.split( ' ' );
		$( '#helpswpin' ).text( powerbuttonconf[ 0 ] );
		$( '#helpledpin' ).text( powerbuttonconf[ 1 ] );
		$( '#relays' ).prop( 'checked', G.relays );
		$( '#setting-relays' ).toggleClass( 'hide', !G.relays );
		$( '#onboardaudio' ).prop( 'checked', G.onboardaudio );
		$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		$( '#setting-soundprofile' ).toggleClass( 'hide', !G.soundprofile );
		$( '#hostname' ).val( G.hostname );
		$( '#timezone' )
			.val( G.timezone )
			.selectric( 'refresh' );
		[ 'bluetoothctl', 'configtxt', 'iw', 'journalctl', 'powerbutton', 'rfkill', 'soundprofile' ].forEach( function( id ) {
			codeToggle( id, 'status' );
		} );
		resetLocal();
		showContent();
	} );
}
refreshData();
//---------------------------------------------------------------------------------------
$( '.enable' ).click( function() {
	var idname = {
		  bluetooth    : 'On-board Bluetooth'
		, lcd          : 'TFT LCD'
		, lcdchar      : 'Character LCD'
		, powerbutton  : 'Power Button'
		, soundprofile : 'Kernel Sound Profile'
	}
	var id = this.id;
	if ( $( this ).prop( 'checked' ) ) {
		$( '#setting-'+ id ).click();
	} else {
		bash( [ id +'disable' ] );
		notify( idname[ id ], 'Disable ...', id );
	}
} );
$( '.enablenoset' ).click( function() {
	var idname = {
		  onboardaudio : 'On-board Audio'
		, relays       : 'GPIO Relay'
	}
	var checked = $( this ).prop( 'checked' );
	var id = this.id;
	notify( idname[ id ], checked, id );
	if ( id !== 'relays' ) rebootText( checked, idname[ id ] );
	bash( [ id, checked, G.reboot.join( '\n' ) ] );
} );

$( '#timezone, #i2smodule' ).selectric( { maxHeight: 400 } );
$( '.selectric-input' ).prop( 'readonly', 1 ); // fix - suppress screen keyboard

$( '.container' ).on( 'click', '.settings', function() {
	location.href = 'settings.php?p='+ $( this ).data( 'setting' );
} );
$( 'body' ).on( 'click touchstart', function( e ) {
	if ( !$( e.target ).closest( '.i2s' ).length && $( '#i2smodule option:selected' ).val() === 'none' ) {
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
	}
} );
$( '#refresh' ).click( function( e ) {
	if ( $( e.target ).hasClass( 'help' ) ) return
	
	var $this = $( this );
	var active = $this.hasClass( 'blink' );
	$this.toggleClass( 'blink', !active );
	if ( active ) {
		clearInterval( intervalcputime );
		bannerHide();
	} else {
		intervalcputime = setInterval( function() {
			bash( '/srv/http/bash/system-data.sh status', function( status ) {
				$.each( status, function( key, val ) {
					G[ key ] = val;
				} );
				$( '#status' ).html( renderStatus );
			}, 'json' );
		}, 10000 );
		banner( 'System Status', 'Refresh every 10 seconds.<br>Click again to stop.', 'sliders', 10000 );
	}
} );
$( '#addnas' ).click( function() {
	infoMount();
} );
$( '#list' ).on( 'click', 'li', function() {
	var $this = $( this );
	var mountpoint = $this.find( '.mountpoint' ).text();
	if ( mountpoint === '/' ) return
	
	if ( mountpoint.slice( 9, 12 ) === 'NAS' ) {
		var icon = 'network';
		var title = 'Network Mount';
	} else {
		var icon = 'usbdrive';
		var title = 'Local Mount';
	}
	var source = $this.find( '.source' ).text();
	if ( !$this.data( 'unmounted' ) ) {
		info( {
			  icon    : icon
			, title   : title
			, message : '<wh>'+ mountpoint +'</wh>'
			, oklabel : 'Unmount'
			, okcolor : orange
			, ok      : function() {
				notify( title, 'Unmount ...', icon )
				bash( [ 'unmount', mountpoint ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
		} );
	} else { // remove / remount
		info( {
			  icon        : icon
			, title       : title
			, message     : '<wh>'+ mountpoint +'</wh>'
			, buttonwidth : 1
			, buttonlabel : 'Remove'
			, buttoncolor : red
			, button      : function() {
				notify( title, 'Remove ...', icon );
				bash( [ 'remove', mountpoint ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
			, oklabel     : 'Remount'
			, ok          : function() {
				notify( title, 'Remount ...', icon );
				bash( [ 'remount', mountpoint, source ], function() {
					refreshData();
					$( '#refreshing' ).addClass( 'hide' );
				} );
				$( '#refreshing' ).removeClass( 'hide' );
			}
		} );
	}
} );
$( '#setting-bluetooth' ).click( function() {
	var checked = [];
	if ( !G.bluetooth || G.btdiscoverable ) checked.push( 0 );
	if ( G.btformat ) checked.push( 1 );
	info( {
		  icon         : 'bluetooth'
		, title        : 'Bluetooth'
		, checkbox     : { 'Discoverable <gr>by senders</gr>': 1, 'Sampling 16bit 44.1kHz <gr>to receivers</gr>': 2 }
		, cchecked     : checked
		, checkchanged : ( G.bluetooth ? [ G.btdiscoverable, G.btformat ] : '' )
		, cancel       : function() {
			$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		}
		, ok           : function() {
			var v = infoVal();
			notify( 'Bluetooth', G.bluetooth ? 'Change ...' : 'Enable ...', 'bluetooth' );
			bash( [ 'bluetoothset', v[ 0 ], v[ 1 ] ] );
		}
	} );
} );
$( '#wlan' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	notify( 'Wi-Fi', checked, 'wifi' );
	bash( [ 'wlan', checked ] );
} );
$( '#i2smodulesw' ).click( function() {
	// delay to show switch sliding
	setTimeout( function() {
		$( '#i2smodulesw' ).prop( 'checked', 0 );
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' )
			.removeClass( 'hide' )
			.find( '.selectric' ).click();
	}, 200 );
} );
$( '#i2smodule' ).change( function() {
	var aplayname = $( this ).val();
	var output = $( this ).find( ':selected' ).text();
	if ( aplayname !== 'none' ) {
		$( '#divi2smodulesw' ).addClass( 'hide' );
		$( '#divi2smodule' ).removeClass( 'hide' );
		rebootText( 1, 'Audio I&#178;S Module' );
		notify( 'Audio I&#178;S', 'Enable ...', 'volume' );
	} else {
		aplayname = 'onboard';
		output = '';
		$( '#divi2smodulesw' ).removeClass( 'hide' );
		$( '#divi2smodule' ).addClass( 'hide' );
		rebootText( 0, 'Audio I&#178;S Module' );
		notify( 'I&#178;S Module', 'Disable ...', 'volume' );
	}
	bash( [ 'i2smodule', aplayname, output, G.reboot.join( '\n' ) ] );
} );
$( '#gpioimgtxt' ).click( function() {
	if ( $( '#gpiopin' ).is( ':hidden' ) && $( '#gpiopin1' ).is( ':hidden' ) ) {
		$( '#gpiopin' ).slideToggle();
		$( '#fliptxt, #close-img' ).toggle();
		$( this ).find( 'i' ).toggleClass( 'fa-chevron-down fa-chevron-up' )
	} else {
		$( '#gpiopin, #gpiopin1' ).css( 'display', 'none' );
		$( '#fliptxt' ).hide();
		$( this ).find( 'i' )
			.removeAttr( 'class' )
			.addClass( 'fa fa-chevron-down' );
	}
} );
$( '#gpiopin, #gpiopin1' ).click( function() {
	$( '#gpiopin, #gpiopin1' ).toggle();
} );
var infolcdchar = heredoc( function() { /*
	<div class="infotextlabel" style="margin-top: -4px">
		<a class="infolabel">Size</a>
		<a class="infolabel">&emsp;Character Map</a>
		<a class="infolabel">Interface</a>
		<div class="i2c">
			<a class="infolabel">Address</a>
			<a class="infolabel">I&#178;C Chip</a>
		</div>
		<div class="gpio">
			<a class="infolabel">pin_rs</a>
			<a class="infolabel">pin_rw</a>
			<a class="infolabel">pin_e</a>
			<a class="infolabel">pins_data</a>
		</div>
	</div>
	<div class="infotextbox lcdradio">
		<div id="cols" class="infocontent infohtml lcd">
			<label><input type="radio" name="cols" value="16"> 16x2</label>
			<label><input type="radio" name="cols" value="20"> 20x4</label>
			<label><input type="radio" name="cols" value="40"> 40x4</label>
		</div>
		<div id="charmap" class="infocontent infohtml lcd">
			<label><input type="radio" name="charmap" value="A00"> A00</label>
			<label><input type="radio" name="charmap" value="A02"> A02</label>
		</div>
		<div id="inf" class="infocontent infohtml lcd">
			<label><input type="radio" name="inf" value="i2c"> I&#178;C</label>
			<label><input type="radio" name="inf" value="gpio"> GPIO</label>
		</div>
		<div class="i2c">
			<div id="i2caddress" class="infocontent infohtml lcd">
			</div>
			<select id="i2cchip" class="infocontent infohtml">
				<option value="PCF8574"> PCF8574</option>
				<option value="MCP23008"> MCP23008</option>
				<option value="MCP23017"> MCP23017</option>
			</select>
		</div>
		<div class="gpio">
			<input type="text" id="pin_rs" class="infoinput infocontent infohtml">
			<input type="text" id="pin_rw" class="infoinput infocontent infohtml">
			<input type="text" id="pin_e" class="infoinput infocontent infohtml">
			<input type="text" id="pins_data" class="infoinput infocontent infohtml">
		</div>
		<label><input id="backlight" type="checkbox"> Backlight off <gr>(stop 1 m.)</gr></label>
	</div>
*/ } );
$( '#setting-lcdchar' ).click( function() {
	var val = G.lcdcharconf || '20 A00 0x27 PCF8574 False';
	var val = val.split( ' ' );
	// i2c : cols charmap | inf | i2caddress i2cchip | backlight
	// gpio: cols charmap | inf | pin_rs pin_rw pin_e pins_data | backlight
	var backlight = val.pop() === 'True';
	if ( val.length < 6 ) { // inset inf
		var i2c = true;
		var v = [ ...val.slice( 0, 2 ), 'i2c', ...val.slice( 2 ), 15, 18, 16, '21,22,23,24', backlight ]
	} else {
		var i2c = false;
		var v = [ ...val.slice( 0, 2 ), 'gpio', '0x27', 'PCF8574', ...val( 2 ), backlight ];
	}
	// v: 0cols 1charmap 2inf 3i2caddress 4i2cchip 5pin_rs 6pin_rw 7pin_e 8pins_data 9backlight 
	var lcdcharaddr = G.lcdcharaddr || '27 3F';
	var addr = lcdcharaddr.split( ' ' );
	var opt = '';
	addr.forEach( function( el ) {
		opt += '<label><input type="radio" name="address" value="0x'+ el +'"> 0x'+ el +'</label>';
	} );
	info( {
		  icon          : 'lcdchar'
		, title         : 'Character LCD'
		, content       : infolcdchar
		, boxwidth      : 180
		, nofocus       : 1
		, checkchanged  : ( G.lcdchar ? v : '' )
		, preshow       : function() {
			$( '#i2caddress' ).html( opt );
			
			$( '#cols input' ).val( [ v[ 0 ] ] );
			$( '#charmap input' ).val( [ v[ 1 ] ] );
			$( '#inf input' ).val( [ v[ 2 ] ] );
			$( '#i2caddress input' ).val( [ v[ 3 ] ] );
			$( '#i2cchip' ).val( v[ 4 ] );
			$( '#pin_rs' ).val( v[ 5 ] );
			$( '#pin_rw' ).val( v[ 6 ] );
			$( '#pin_e' ).val( v[ 7 ] );
			$( '#pins_data' ).val( v[ 8 ] );
			$( '#backlight' ).prop( 'checked', v[ 9 ] );
			
			$( '.lcdradio' ).width( 230 );
			$( '.lcd label' ).width( 75 );
			$( '.i2c' ).toggleClass( 'hide', !i2c );
			$( '.gpio' ).toggleClass( 'hide', i2c );
			$( '#inf' ).change( function() {
				i2c = $( '#inf input:checked' ).val() === 'i2c';
				$( '.i2c' ).toggleClass( 'hide', !i2c );
				$( '.gpio' ).toggleClass( 'hide', i2c );
			} );
		}
		, buttonwidth   : 1
		, cancel        : function() {
			$( '#lcdchar' ).prop( 'checked', G.lcdchar );
		}
		, buttonlabel   : [ '<i class="fa fa-plus-r"></i>Logo', '<i class="fa fa-power"></i>Off' ]
		, buttoncolor   : [ '#448822', red ]
		, button        : !G.lcdchar ? '' : [ 
			  function() { bash( '/srv/http/bash/lcdchar.py' ) }
			, function() { bash( '/srv/http/bash/lcdchar.py off' ) }
		]
		, buttonnoreset : 1
		, ok            : function() {
			var values = infoVal();
			var lcdcharconf = values.join( ' ' );
			var cmd = [ 'lcdcharset', lcdcharconf ];
			if ( values[ 2 ] === 'i2c' ) {
				rebootText( 1, 'Character LCD' );
				cmd.push( G.reboot.join( '\n' ) );
			}
			bash( cmd );
			notify( 'Character LCD', G.lcdchar ? 'Change ...' : 'Enabled ...', 'lcdchar' );
		}
	} );
} );
$( '#setting-powerbutton' ).click( function() {
	var val = G.powerbuttonconf.split( ' ' );
	var swpin = val[ 0 ];
	var ledpin = val[ 1 ];
	var pins = [ 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 32, 33, 35, 36, 37, 38, 40 ];
	if ( G.relayspins ) {
		pins = pins.filter( function( i ) {
			return G.relayspins.indexOf( i ) === -1;
		} );
	}
	var optionpin = '';
	pins.forEach( function( p ) { 
		optionpin += '<option value='+ p +'>'+ p +'</option>';
	} );
	var infopowerbutton = heredoc( function() { /*
	GPIO pins <gr>(J8 numbering)</gr>:<br>
	<div class="infotextlabel">
		<a class="infolabel">On <gr>(fixed)</gr></a>
		<a class="infolabel">Off</a>
		<a class="infolabel">LED</a>
	</div>
	<div class="infotextbox lcdradio">
		<select id="onpin" disabled><option value="5">5</option></select>
		<select id="swpin"></select>
		<select id="ledpin"></select>
	</div>
*/ } );
	info( {
		  icon         : 'power'
		, title        : 'Power Button'
		, content      : infopowerbutton
		, boxwidth     : 80
		, checkchanged : ( G.powerbutton ? [ 5, swpin, ledpin ] : '' )
		, preshow      : function() {
			$( '#swpin, #ledpin' ).html( optionpin );
			$( '#swpin' ).val( swpin );
			$( '#ledpin' ).val( ledpin );
		}
		, cancel       : function() {
			$( '#powerbutton' ).prop( 'checked', G.powerbutton );
		}
		, ok           : function() {
			var values = infoVal();
			notify( 'Power Button', G.powerbutton ? 'Change ...' : 'Enable ...', 'power' );
			bash( [ 'powerbuttonset', values[ 1 ], values[ 2 ] ] );
		}
	} );
} );
$( '#setting-relays' ).click( function() {
	location.href = '/settings/relays.php';
} );
$( '#setting-lcd' ).click( function() {
	info( {
		  icon         : 'lcd'
		, title        : 'TFT 3.5" LCD'
		, selectlabel  : 'Type'
		, select       : {
			  'Generic'               : 'tft35a'
			, 'Waveshare (A)'         : 'waveshare35a'
			, 'Waveshare (B)'         : 'waveshare35b'
			, 'Waveshare (B) Rev 2.0' : 'waveshare35b-v2'
			, 'Waveshare (C)'         : 'waveshare35c'
		}
		, schecked     : G.lcdmodel
		, checkchanged : ( G.lcd ? [ G.lcdmodel ] : '' )
		, boxwidth     : 200
		, buttonlabel  : 'Calibrate'
		, button       : function() {
			info( {
				  icon    : 'lcd'
				, title   : 'TFT LCD'
				, message : 'Calibrate touchscreen?'
								+'<br>(Get stylus ready.)'
				, ok      : function() {
					notify( 'Calibrate Touchscreen', 'Start ...', 'lcd' );
					bash( [ 'lcdcalibrate' ] );
				}
			} );
		}
		, cancel    : function() {
			$( '#lcd' ).prop( 'checked', G.lcd );
		}
		, ok           : function() {
			var lcdmodel = infoVal();
			notify( 'TFT 3.5" LCD', G.lcd ? 'Change ...' : 'Enable ...', 'lcd' );
			rebootText( 1, 'TFT 3.5" LCD' );
			bash( [ 'lcdset', lcdmodel, G.reboot.join( '\n' ) ] );
		}
	} );
} );
$( '#hostname' ).on( 'mousedown touchdown', function() {
	info( {
		  icon         : 'plus-r'
		, title        : 'Player Name'
		, textlabel    : 'Name'
		, textvalue    : G.hostname
		, checkchanged : [ G.hostname ]
		, preshow      : function() {
			$( '#infoTextBox' ).keyup( function() {
				$( '#infoTextBox' ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
			} );
		}
		, ok           : function() {
			var hostname = infoVal();
			notify( 'Name', 'Change ...', 'plus-r' );
			bash( [ 'hostname', hostname ] );
		}
	} );
} );
$( '#timezone' ).change( function( e ) {
	notify( 'Timezone', 'Change ...', 'globe' );
	bash( [ 'timezone', $( this ).val() ] );
} );
$( '#setting-regional' ).click( function() {
	var textvalue = [ G.ntp, G.regdom || '00' ];
	info( {
		  icon         : 'globe'
		, title        : 'Regional Settings'
		, textlabel    : [ 'NTP server', 'Regulatory domain' ]
		, textvalue    : textvalue
		, boxwidth     : 200
		, footer       : '<px70/><px60/>00 - common for all regions'
		, checkchanged : textvalue
		, ok           : function() {
			var values = infoVal();
			notify( 'Regional Settings', 'Change ...', 'globe' );
			bash( [ 'regional', values[ 0 ], values[ 1 ] ] );
		}
	} );
} );
$( '#setting-soundprofile' ).click( function() {
	var textlabel = [
		  'kernel.sched_latency_ns <gr>(ns)</gr>'
		, 'vm.swappiness'
		, 'eth0 mtu <gr>(byte)</gr>'
		, 'eth0 txqueuelen'
	];
	var radio = {
		  _Default  : '18000000 60 1500 1000'
		, RuneAudio : '1500000 0 1500 1000'
		, _ACX      : '850000 0 1500 4000'
		, Orion     : '500000 20 1000 4000'
		, _OrionV2  : '120000 0 1000 4000'
		, OrionV3   : '1500000 0 1000 4000'
		, _OrionV4  : '145655 60 1000 4000'
		, Um3ggh1U  : '500000 0 1500 1000'
		, _Custom   : '0'
	}
	var textvalue = G.soundprofileval.split( ' ' );
	if ( textvalue.length < 3 ) { // no eth0
		textlabel = textlabel.slice( 0, 2 );
		$.each( radio, function( k, v ) {
			radio[ k ] = v.split( ' ' ).splice( 0, 2 ).join( ' ' );
		} );
	}
	var radioval = Object.values( radio );
	var rchecked = radioval.indexOf( G.soundprofileval ) !== -1 ? G.soundprofileval : '0';
	var checkevalues = G.soundprofileval.split( ' ' );
	checkevalues.push( G.soundprofileval );
	var iL = textlabel.length;
	info( {
		  icon         : 'sliders'
		, title        : 'Kernel Sound Profile'
		, textlabel    : textlabel
		, textvalue    : textvalue
		, boxwidth     : 110
		, radio        : radio
		, rchecked     : rchecked
		, checkchanged : checkevalues
		, preshow      : function() {
			$( '#infoRadio input' ).last().prop( 'disabled', true );
			$( '.infoinput' ).keyup( function() {
				var values = '';
				$( '.infoinput' ).each( function() {
					values += $( this ).val() +' ';
				} );
				values = values.trimEnd();
				if ( radioval.indexOf( values ) === -1 ) values = 0;
				$( '#infoRadio input[value="'+ values +'"]' ).prop( 'checked', true )
			} );
			$( '#infoRadio' ).change( function() {
				var soundprofileval = $( '#infoRadio input:checked' ).val();
				var val = soundprofileval.split( ' ' );
				for ( i = 0; i < iL; i++ ) $( '.infoinput' ).eq( i ).val( val[ i ] );
			} );
		}
		, cancel       : function() {
			$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		}
		, ok           : function() {
			var soundprofileval = infoVal().slice( 0, 4 ).join( ' ' );
			bash( [ 'soundprofileset', soundprofileval ] );
			notify( 'Kernel Sound Profile', G.soundprofile ? 'Change ...' : 'Enable ...', 'volume' );
		}
	} );
} );
$( '#backup' ).click( function() {
	var backuptitle = 'Backup Settings';
	var icon = 'sd';
	notify( backuptitle, 'Process ...', 'sd blink' );
	bash( [ 'databackup' ], function( data ) {
		if ( data == 1 ) {
			notify( backuptitle, 'Download ...', icon );
			fetch( '/data/tmp/backup.gz' )
				.then( response => response.blob() )
				.then( blob => {
					var url = window.URL.createObjectURL( blob );
					var a = document.createElement( 'a' );
					a.style.display = 'none';
					a.href = url;
					a.download = 'backup.gz';
					document.body.appendChild( a );
					a.click();
					setTimeout( () => {
						a.remove();
						window.URL.revokeObjectURL( url );
						bannerHide();
					}, 1000 );
				} ).catch( () => {
					info( {
						  icon    : icon
						, title   : backuptitle
						, message : '<wh>Warning!</wh><br>File download failed.'
					} );
					bannerHide();
				} );
		} else {
			info( {
				  icon    : icon
				, title   : backuptitle
				, message : 'Backup failed.'
			} );
			bannerHide();
		}
	} );
	$( '#backup' ).prop( 'checked', 0 );
} );
$( '#restore' ).click( function() {
	var icon = 'sd-restore';
	info( {
		  icon        : icon
		, title       : 'Restore Settings'
		, message     : 'Restore from:'
		, radio       : {
			  'Backup file <code>*.gz</code>' : 'restore'
			, 'Reset to default'              : 'reset'
		}
		, rchecked    : 'restore'
		, fileoklabel : 'Restore'
		, filetype    : '.gz'
		, filefilter  : 1
		, preshow     : function() {
			$( '#infoRadio input' ).click( function() {
				if ( $( '#infoRadio input:checked' ).val() !== 'restore' ) {
					$( '#infoFilename' ).empty()
					$( '#infoFileBox' ).val( '' );
					$( '#infoFileLabel' ).addClass( 'hide infobtn-primary' );
					$( '#infoOk' ).removeClass( 'hide' );
				} else {
					$( '#infoOk' ).addClass( 'hide' );
					$( '#infoFileLabel' ).removeClass( 'hide' );
				}
			} );
		}
		, ok          : function() {
			notify( 'Restore Settings', 'Restore ...', 'sd' );
			var checked = infoVal();
			console.log(checked);return
			if ( checked === 'reset' ) {
				bash( '/srv/http/bash/datareset.sh', bannerHide );
			} else {
				var file = $( '#infoFileBox' )[ 0 ].files[ 0 ];
				var formData = new FormData();
				formData.append( 'cmd', 'datarestore' );
				formData.append( 'file', file );
				$.ajax( {
					  url         : 'cmd.php'
					, type        : 'POST'
					, data        : formData
					, processData : false  // no - process the data
					, contentType : false  // no - contentType
					, success     : function( data ) {
						if ( data == -1 ) {
							info( {
								  icon    : icon
								, title   : 'Restore Settings'
								, message : 'File upload failed.'
							} );
							bannerHide();
							loader( 'hide' );
						}
					}
				} );
			}
			setTimeout( loader, 0 );
		}
	} );
	$( '#restore' ).prop( 'checked', 0 );
} );
$( '.listtitle' ).click( function() {
	var $this = $( this );
	var $chevron = $this.find( 'i' );
	var $list = $this.next();
	if ( $list.hasClass( 'hide' ) ) {
		$chevron
			.removeClass( 'fa-chevron-down' )
			.addClass( 'fa-chevron-up' );
		if ( $list.html() ) {
			$list.removeClass( 'hide' );
		} else {
			bash( 'pacman -Qq', function( list ) {
				var list = list.split( '\n' );
				pkghtml = '';
				list.forEach( function( pkg ) {
					pkghtml += '<bl>'+ pkg +'</bl><br>';
				} );
				$list
					.html( pkghtml.slice( 0, -4 ) )
					.removeClass( 'hide' );
			} );
		}
	} else {
		$chevron
			.removeClass( 'fa-chevron-up' )
			.addClass( 'fa-chevron-down' );
		$list.addClass( 'hide' );
	}
} );
$( '.list' ).on( 'click', 'bl', function() {
	if ( localhost ) return
	
	var pkg = $( this ).text();
	if ( [ 'bluez-alsa', 'hfsprogs', 'matchbox-window-manager', 'mpdscribble', 'snapcast', 'upmpdcli' ].indexOf( pkg ) !== -1 ) {
		pkg = pkg.replace( 'bluez-alsa', 'bluez-alsa-git' );
		window.open( 'https://aur.archlinux.org/packages/'+ pkg );
	} else {
		pkg = pkg.replace( '-pushstream', '' );
		window.open( 'https://archlinuxarm.org/packages/aarch64/'+ pkg );
	}
} );

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
