$( function() { // document ready start >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

function dataBackup( netctl ) {
	var backuptitle = 'Backup Settings';
	var icon = 'sd';
	notify( backuptitle, 'Process ...', 'sd blink' );
	bash( [ 'databackup', netctl ], function( data ) {
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
	var status = G.cpuload.replace( / /g, ' <gr>&bull;</gr> ' )
		+'<br>'+ ( G.cputemp < 80 ? G.cputemp +' °C' : '<red><i class="fa fa-warning blink red"></i>&ensp;'+ G.cputemp +' °C</red>' )
		+'<br>'+ G.time.replace( ' ', ' <gr>&bull;</gr> ' ) +'&emsp;<grw>'+ G.timezone.replace( '/', ' · ' ) +'</grw>'
		+'<br>'+ G.uptime +'<span class="wide">&emsp;<gr>since '+ G.uptimesince.replace( ' ', ' &bull; ' ) +'</gr></span>'
		+'<br>'+ G.startup.replace( ' ', ' <gr class="wide">(kernel)</gr> + ' ) +' <gr class="wide">(userspace)</gr>';
	if ( G.throttled ) { // https://www.raspberrypi.org/documentation/raspbian/applications/vcgencmd.md
		var bits = parseInt( G.throttled ).toString( 2 ); // 20 bits: 19..0 ( hex > decimal > binary )
		if ( bits.slice( -1 ) == 1 ) {                    // bit# 0  - undervoltage now
			status += '<br><i class="fa fa-warning blink red"></i>&ensp;Voltage under 4.7V - currently detected.'
		} else if ( bits.slice( -19, 1 ) == 1 ) {         // bit# 19 - undervoltage occured
			status += '<br><i class="fa fa-warning blink"></i>&ensp;Voltage under 4.7V - occurred.';
		}
	}
	return status
}

refreshData = function() {
	bash( '/srv/http/bash/system-data.sh', function( list ) {
		var list2G = list2JSON( list );
		if ( !list2G ) return
		
		if ( G.ip ) {
			var pad = '<span>';
			var ip = G.ip.split( ',' );
			var iplist = '';
			ip.forEach( function( el ) {
				var val = el.split( ' ' ); // [ interface, mac, ip ]
				if ( val[ 2 ] ) {
					iplist += '<i class="fa fa-'+ ( val[ 0 ] === 'eth0' ? 'lan' : 'wifi' ) +' gr"></i>&ensp;';
					iplist += val[ 1 ] +'<span class="wide">&emsp;<gr>'+ val[ 2 ] +'</gr></span><br>';
					systemlabel += '<br>';
					if ( !G.streamingip ) G.streamingip = val[ 1 ];
					pad += '<br>';
				}
			} );
		}
		$( '#systemlabel span' ).remove();
		$( '#systemlabel' ).append( pad +'Sources</span>' );
		systemlabel += '<span class="settings" data-setting="sources">Sources<i class="fa fa-gear"></i></span>';
		var sourcelist = '';
		$.each( G.sources.list, function( i, val ) {
			sourcelist += '<i class="fa fa-'+ val.icon +' gr"></i>&ensp;'+ val.mountpoint.replace( '/mnt/MPD/USB/', '' );
			sourcelist += ( val.size ? ' <gr>&bull;</gr> ' + val.size : '' ) +'<br>';
			systemlabel += '<br>';
		} );
		var mpdstats = '';
		if ( G.mpdstats ) {
		var counts = G.mpdstats.split( ' ' );
		var mpdstats = '<span class="wide">&emsp;<i class="fa fa-music gr"></i>&nbsp;'+ Number( counts[ 0 ] ).toLocaleString()
					  +'&ensp;<i class="fa fa-album gr"></i>&ensp;'+ Number( counts[ 1 ] ).toLocaleString()
					  +'&ensp;<i class="fa fa-artist gr"></i> '+ Number( counts[ 2 ] ).toLocaleString() +'</span>';
		}
		var soc = '<span class="wide">'+ G.soc +' <gr>&bull;</gr> </span>';
		soc += G.rpi01 ? '' : '4 ';
		soc += G.soccpu +' <gr>@</gr> ';
		soc += G.socspeed < 1000 ? G.socspeed +'MHz' : G.socspeed / 1000 +'GHz';
		soc += ' <gr>&bull;</gr> '+ G.socram;
		$( '#systemvalue' ).html(
			  'rAudio '+ G.version +' <gr>&bull; '+ G.versionui +'</gr><br>'
			+ G.rpimodel.replace( /(Rev.*)$/, '<gr>$1</gr>' ) +'<br>'
			+ soc +'<br>'
			+ '<span id="output">'+ G.audiooutput +'</span><br>'
			+ G.kernel +'<br>'
			+ G.mpd + mpdstats
			+'<br>'
			+ iplist
			+ sourcelist
		);
		$( '#status' ).html( renderStatus );
		$( '#throttled' ).toggleClass( 'hide', $( '#status .fa-warning' ).length === 0 );
		$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		$( '#setting-bluetooth' ).toggleClass( 'hide', !G.bluetooth );
		$( '#onboardwlan' ).prop( 'checked', G.onboardwlan );
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
		$( '#relays' ).prop( 'checked', G.relays );
		$( '#setting-relays' ).toggleClass( 'hide', !G.relays );
		$( '#hostname' ).val( G.hostname );
		$( '#timezone' )
			.val( G.timezone )
			.selectric( 'refresh' );
		[ 'bluetoothctl', 'ifconfig', 'configtxt', 'journalctl', 'soundprofile' ].forEach( function( id ) {
			codeToggle( id, 'status' );
		} );
		$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		$( '#setting-soundprofile' ).toggleClass( 'hide', !G.soundprofile );
		resetLocal();
		showContent();
	} );
}
refreshData();
//---------------------------------------------------------------------------------------
$( '.enable' ).click( function() {
	var idname = {
		  bluetooth    : 'On-board Bluetooth'
		, lcdchar      : 'Character LCD'
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
		  lcd    : 'TFT LCD'
		, relays : 'GPIO Relay'
	}
	var checked = $( this ).prop( 'checked' );
	var id = this.id;
	notify( idname[ id ], checked, id );
	if ( id !== 'relays' ) rebootText( checked, id );
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
$( '#setting-bluetooth' ).click( function() {
	info( {
		  icon     : 'bluetooth'
		, title    : 'On-board Bluetooth'
		, checkbox : { Discoverable: 1 }
		, checked  : ( !G.bluetooth || G.btdiscoverable ? 0 : 1 )
		, preshow  : function() {
			if ( G.bluetooth ) {
				$( '#infoCheckBox' ).change( function() {
					$( '#infoOk' ).toggleClass( 'disabled', $( '#infoCheckBox input' ).prop( 'checked' ) === G.btdiscoverable );
				} );
			}
		}
		, cancel  : function() {
			$( '#bluetooth' ).prop( 'checked', G.bluetooth );
		}
		, ok       : function() {
			checked = $( '#infoCheckBox input' ).prop( 'checked' );
			notify( ( G.bluetooth ? 'Bluetooth Discoverable' : 'Bluetooth' ), checked, 'bluetooth' );
			rebootText( true, 'on-board Bluetooth' );
			bash( [ 'bluetoothset', checked, G.reboot.join( '\n' ) ] );
		}
	} );
} );
$( '#onboardwlan' ).click( function() {
	var checked = $( this ).prop( 'checked' );
	if ( !$( '#system .fa-wifi' ).length ) {
		notify( 'On-board Wi-Fi', checked, 'wifi' );
		bash( [ 'onboardwlan', checked ] );
	} else {
		info( {
			  icon    : 'wifi'
			, title   : 'On-board Wi-Fi'
			, message : 'This will disconnect Wi-Fi from router.'
						+'<br>Continue?'
			, cancel  : function() {
				$( '#onboardwlan' ).prop( 'checked', 1 );
			}
			, ok      : function() {
				notify( 'On-board Wi-Fi', false, 'wifi' );
				bash( [ 'onboardwlan', false ] );
			}
		} );
	}
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
var infolcdchar = heredoc( function() { /*
	<div class="infotextlabel">
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
	<div class="infotextbox lcdradio" style="width: 250px">
		<div id="cols" class="infocontent infohtml lcd">
			<label><input type="radio" name="size" value="16"> 16x2</label>
			<label><input type="radio" name="size" value="20"> 20x4</label>
			<label><input type="radio" name="size" value="40"> 40x4</label>
		</div>
		<div id="charmap" class="infocontent infohtml lcd">
			<label><input type="radio" name="charmap" value="A00"> A00</label>
			<label><input type="radio" name="charmap" value="A02"> A02</label>
		</div>
		<div id="inf" class="infocontent infohtml lcd">
			<label><input type="radio" name="interface" value="i2c"> I&#178;C</label>
			<label><input type="radio" name="interface" value="gpio"> GPIO</label>
		</div>
		<div class="i2c">
			<div id="address" class="infocontent infohtml lcd">
			</div>
			<select id="chip" class="infocontent infohtml">
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
	</div>
*/ } );
$( '#setting-lcdchar' ).click( function() {
	var lcdcharconf;
	info( {
		  icon          : 'lcdchar'
		, title         : 'Character LCD'
		, content       : infolcdchar
		, boxwidth      : 180
		, nofocus       : 1
		, preshow       : function() {
			var val;
			function optHtml() {
				var lcdcharaddr = G.lcdcharaddr || '27 3F';
				var addr = lcdcharaddr.split( ' ' );
				var opt = '';
				addr.forEach( function( el ) {
					opt += '<label><input type="radio" name="address" value="0x'+ el +'"> 0x'+ el +'</label>';
				} );
				$( '#address' ).html( opt );
			}
			function setValues( inf, val ) {
				if ( !val ) val = inf === 'i2c' ? '20 A00 0x27 PCF8574' : '20 A00 15 18 16 21,22,23,24';
				var v = val.split( ' ' );
				if ( v.length === 4 ) {
					var cols = v[ 0 ];
					var charmap = v[ 1 ];
					var i2caddress = v[ 2 ];
					var i2cchip = v[ 3 ];
					optHtml();
					$( '#inf input' ).val( [ 'i2c' ] );
					$( '#address input' ).val( [ i2caddress ] );
					$( '#chip input' ).val( [ i2cchip ] );
					$( '.i2c' ).removeClass( 'hide' );
					$( '.gpio' ).addClass( 'hide' );
				} else {
					var cols = v[ 0 ];
					var charmap = v[ 1 ];
					var pin_rs = v[ 2 ];
					var pin_rw = v[ 3 ];
					var pin_e = v[ 4 ];
					var pins_data = v[ 5 ];
					$( '#inf input' ).val( [ 'gpio' ] );
					$( '#pin_rs' ).val( pin_rs );
					$( '#pin_rw' ).val( pin_rw );
					$( '#pin_e' ).val( pin_e );
					$( '#pins_data' ).val( pins_data );
					$( '.i2c' ).addClass( 'hide' );
					$( '.gpio' ).removeClass( 'hide' );
				}
				$( '#cols input' ).val( [ cols ] );
				$( '#charmap input' ).val( [ charmap ] );
				$( '.lcd label' ).width( 80 );
			}
			var inf = !G.lcdcharconf ? 'i2c' : ( G.lcdcharconf.split( ' ' ).length === 4 ? 'i2c' : 'gpio' );
			if ( inf === 'i2c' ) optHtml();
			setValues( inf, G.lcdcharconf );
			$( '#inf' ).change( function() {
				var i = $( '#inf input:checked' ).val();
				$( '.i2c' ).toggleClass( 'hide', i === 'gpio' );
				$( '.gpio' ).toggleClass( 'hide', i === 'i2c' );
				var val = i === inf ? G.lcdcharconf : '';
				setValues( i, val );
			} );
			// verify changes
			if ( G.lcdchar ) $( '#infoOk' ).addClass( 'disabled' );
			$( '#cols, #inf, #charmap, #address, #chip' ).change( function() {
				lcdcharconf = $( '#cols input:checked' ).val();
				lcdcharconf += ' '+ $( '#charmap input:checked' ).val();
				if ( $( '#inf input:checked' ).val() === 'i2c' ) {
					lcdcharconf += ' '+ $( '#address input:checked' ).val();
					lcdcharconf += ' '+ $( '#chip option:selected' ).val();
				}
				if ( G.lcdchar ) $( '#infoOk' ).toggleClass( 'disabled', lcdcharconf === G.lcdcharconf );
			} );
			$( '.gpio input' ).keyup( function() {
				var i = $( this ).index();
				var $this = $( this );
				var val = $this.val();
				if ( i < 3 ) {
					$this.val( val.replace( /[^0-9]/, '' ) );
					var count = true
				} else {
					$this.val( val.replace( /[^0-9,]/, '' ) );
					var count = val.split( ',' ).length === 4;
				}
				lcdcharconf = $( '#cols input:checked' ).val();
				lcdcharconf += ' '+ $( '#charmap input:checked' ).val();
				for ( i = 0; i < 4; i++ ) lcdcharconf += ' '+ $( '.gpio input' ).eq( i ).val();
				if ( G.lcdchar ) $( '#infoOk' ).toggleClass( 'disabled', !val || lcdcharconf === G.lcdcharconf || !count );
			} );
		}
		, cancel        : function() {
			$( '#lcdchar' ).prop( 'checked', G.lcdchar );
		}
		, buttonlabel   : [ 'Splash', 'Off' ]
		, buttoncolor   : [ '#448822',       '#de810e' ]
		, button        : !G.lcdchar ? '' : [ 
			  function() { bash( '/srv/http/bash/lcdchar.py rr' ) }
			, function() { bash( '/srv/http/bash/lcdchar.py off' ) }
		]
		, buttonnoreset : 1
		, ok            : function() {
			if ( $( '#inf input:checked' ).val() === 'i2c' ) {
				if ( !lcdcharconf || lcdcharconf.split( ' ' ).length !== 4 ) lcdcharconf = '20 A00 0x27 PCF8574';
				if ( !G.lcdchar ) {
					rebootText( 1, 'Character LCD' );
					bash( [ 'lcdcharset', lcdcharconf, G.reboot.join( '\n' ) ] );
				} else {
					bash( [ 'lcdcharset', lcdcharconf ] );
				}
			} else {
				if ( lcdcharconf.split( ' ' ).length !== 6 ) lcdcharconf = '20 A00 15 18 16 21,22,23,24';
				bash( [ 'lcdchargpioset', lcdcharconf ] );
			}
			notify( 'Character LCD', G.lcdchar ? 'Change ...' : 'Enabled ...', 'lcdchar' );
		}
	} );
} );
$( '#setting-lcd' ).click( function() {
	info( {
		  icon        : 'lcd'
		, title       : 'TFT LCD'
		, message     : 'Calibrate touchscreen?'
						+'<br>(Get stylus ready.)'
		, oklabel     : 'Start'
		, ok          : function() {
			notify( 'Calibrate Touchscreen', 'Start ...', 'lcd' );
			bash( [ 'lcdcalibrate' ] );
		}
	} );
} );
$( '#setting-relays' ).click( function() {
	location.href = '/settings/relays.php';
} );
$( '#hostname' ).on( 'mousedown touchdown', function() {
	info( {
		  icon      : 'plus-r'
		, title     : 'Player Name'
		, textlabel : 'Name'
		, textvalue : G.hostname
		, preshow   : function() {
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoTextBox' ).keyup( function() {
				$( '#infoTextBox' ).val( $( this ).val().replace( /[^a-zA-Z0-9-]+/g, '' ) );
				$( '#infoOk' ).toggleClass( 'disabled', $( '#infoTextBox' ).val() === G.hostname );
			} );
		}
		, ok        : function() {
			notify( 'Name', 'Change ...', 'plus-r' );
			bash( [ 'hostname', $( '#infoTextBox' ).val() ] );
		}
	} );
} );
$( '#timezone' ).change( function( e ) {
	notify( 'Timezone', 'Change ...', 'globe' );
	bash( [ 'timezone', $( this ).val() ] );
} );
$( '#setting-regional' ).click( function() {
	info( {
		  icon      : 'globe'
		, title     : 'Regional Settings'
		, textlabel : [ 'NTP server', 'Regulatory domain' ]
		, textvalue : [ G.ntp, G.regdom || '00' ]
		, boxwidth  : 200
		, footer    : '<px70/><px60/>00 - common for all regions'
		, preshow   : function() {
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoTextBox, #infoTextBox1' ).keyup( function() {
				var changed = $( '#infoTextBox' ).val() !== G.ntp || $( '#infoTextBox1' ).val() !== G.regdom;
				$( '#infoOk' ).toggleClass( 'disabled', !changed );
			} );
		}
		, ok        : function() {
			var ntp = $( '#infoTextBox' ).val();
			var regdom = $( '#infoTextBox1' ).val();
			G.ntp = ntp;
			G.regdom = regdom;
			notify( 'Regional Settings', 'Change ...', 'globe' );
			bash( [ 'regional', ntp, regdom ] );
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
	var textvalue = G.soundprofileval.split( ' ' );
	if ( G.rpi01 ) {
		var lat = [ 1500000, 850000, 500000, 120000, 500000, 145655, 6000000, 1500000 ];
	} else {
		var lat = [ 4500000, 3500075, 1000000, 2000000, 3700000, 145655, 6000000, 1500000 ];
	}
	if ( textvalue.length > 2 ) {
		var defaultval = '18000000 60 1500 1000';
		var radio = {
			  _Default  : defaultval
			, RuneAudio : lat[ 0 ] +' 0 1500 1000'
			, _ACX      : lat[ 1 ] +' 0 1500 4000'
			, Orion     : lat[ 2 ] +' 20 1000 4000'
			, _OrionV2  : lat[ 3 ] +' 0 1000 4000'
			, OrionV3   : lat[ 4 ] +' 0 1000 4000'
			, _OrionV4  : lat[ 5 ] +' 60 1000 4000'
			, Um3ggh1U  : lat[ 6 ] +' 0 1500 1000'
		}
		var radioval = Object.values( radio );
		radio._Custom   = radioval.indexOf( G.soundprofileval ) === -1 ? G.soundprofileval : 0;
	} else {
		textlabel = textlabel.slice( 0, 2 );
		var defaultval = '18000000 60';
		var radio = {
			  _Default  : defaultval
			, RuneAudio : lat[ 0 ] +' 0'
			, _ACX      : lat[ 1 ] +' 0'
			, Orion     : lat[ 2 ] +' 20'
			, _OrionV2  : lat[ 3 ] +' 0 '
			, OrionV3   : lat[ 4 ] +' 0'
			, _OrionV4  : lat[ 5 ] +' 60'
			, Um3ggh1U  : lat[ 6 ] +' 0'
		}
		var radioval = Object.values( radio );
		radio._Custom   = radioval.indexOf( G.soundprofileval ) === -1 ? G.soundprofileval : 0;
	}
	var iL = textlabel.length;
	info( {
		  icon      : 'sliders'
		, title     : 'Kernel Sound Profile'
		, textlabel : textlabel
		, textvalue : textvalue
		, boxwidth  : 110
		, radio     : radio
		, checked   : G.soundprofileval
		, preshow   : function() {
			$( '#infoRadio input' ).last().prop( 'disabled', radio._Custom === 0 );
			// verify changes + interactive values
			$( '#infoOk' ).addClass( 'disabled' );
			$( '#infoRadio' ).change( function() {
				var soundprofileval = $( '#infoRadio input:checked' ).val();
				var val = soundprofileval.split( ' ' );
				for ( i = 0; i < iL; i++ ) $( '.infoinput' ).eq( i ).val( val[ i ] );
				$( '#infoOk' ).toggleClass( 'disabled', soundprofileval === G.soundprofileval );
				
			} );
			$( '.infoinput' ).keyup( function() {
				var soundprofileval = $( '#infoTextBox' ).val();
				for ( i = 1; i < iL; i++ ) soundprofileval += ' '+ $( '#infoTextBox'+ i ).val();
				$( '#infoRadio input' ).val( [ textvalue.indexOf( soundprofileval ) !== -1 ? soundprofileval : G.soundprofileval ] );
				$( '#infoOk' ).toggleClass( 'disabled', soundprofileval === G.soundprofileval );
				$( '#infoRadio input' ).last().prop( 'checked', radioval.indexOf( soundprofileval ) === -1 );
			} );
		}
		, cancel    : function() {
			$( '#soundprofile' ).prop( 'checked', G.soundprofile );
		}
		, ok        : function() {
			var soundprofileval = $( '#infoTextBox' ).val();
			for ( i = 1; i < iL; i++ ) soundprofileval += ' '+ $( '#infoTextBox'+ i ).val();
			var custom = radioval.indexOf( soundprofileval ) !== -1 ? false : true;
			bash( [ 'soundprofileset', soundprofileval ] );
			var action = !G.soundprofile ? 'Enabled ...' : ( soundprofileval !== defaultval ? 'Change ...' : 'Default ...' );
			notify( 'Kernel Sound Profile', action, 'volume' );
		}
	} );
} );
$( '#backup' ).click( function() {
	bash( 'ls -p /etc/netctl | grep -v /', function( data ) {
		if ( !data ) {
			dataBackup();
		} else {
			var netctl = data.slice( 0, -1 ).split( '\n' );
			var radio = { 'None': '' }
			netctl.forEach( function( el ) {
				radio[ el ] = el;
			} );
			info( {
				  icon    : 'sd'
				, title   : 'Backup Settings'
				, message : 'Select Wi-Fi connection to backup:'
				, radio   : radio 
				, oklabel : 'Backup'
				, ok      : function() {
					dataBackup( $( '#infoRadio input:checked' ).val() )
				}
			} );
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
		, checked     : 'restore'
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
			var checked = $( '#infoRadio input:checked' ).val();
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

} ); // document ready end <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
