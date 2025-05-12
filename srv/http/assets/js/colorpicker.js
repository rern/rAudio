var COLOR = {
	  picker : () => {
		$( '.page:not( .hide ) .list:not( .hide ) li' ).eq( 0 ).addClass( 'active' );
		$( 'body' ).css( 'overflow', 'hidden' );
		$( '#lyrics' ).after(  `
<div id="colorpicker">
	<div id="divcolor">
		<i id="colorcancel" class="i-close"></i>
		<div id="pickhue"></div><div id="picknone"></div><div id="picksat"></div>
		<canvas id="hue"></canvas><canvas id="sat"></canvas><canvas id="base"></canvas>
		<a id="colorreset" class="infobtn ${ D.color ? '' : 'hide' }"><i class="i-set0"></i>Default</a>
		<a id="colorok" class="infobtn infobtn-primary ${ D.color ? '' : 'disabled' }">OK</a>
	</div>
</div>
` );
	// function
		var pick     = {
			  gradient  : () => {
				ctx.base.save();
				ctx.base.translate( sat_tl, sat_tl );
				for( var i = 0; i <= sat_w; i++ ){
					var gradient = ctx.base.createLinearGradient( 0, 0, sat_w, 0 );
					var iy       = i / sat_w * 100;
					gradient.addColorStop( 0, 'hsl(0,0%,'+ iy +'%)' );                     // hsl( 0, 0%,   0% ) --- hsl( h, 100%,  0% )
					gradient.addColorStop( 1, 'hsl('+ hsl.h +',100%,'+ ( iy / 2 ) +'%)' ); // hsl( 0, 0%, 100% ) --- hsl( h, 100%, 50% )
					ctx.base.fillStyle = gradient;
					ctx.base.fillRect( 0, sat_w - i, sat_w, 1 );
				}
				ctx.base.restore();
			}
			, hueRotate : ( x, y ) => {
				var ori = canvas_w /2;
				var rad = Math.atan2( x - ori, y - ori );
				hsl.h   = Math.round( ( rad * ( 180 / Math.PI ) * -1 ) + 90 );
				pick.gradient();
				$( '#hue' ).css( 'transform', 'rotate( '+ hsl.h +'deg )' );
				COLOR.set( hsl );
			}
			, pixelData : ( x, y ) => ctx.base.getImageData( x, y, 1, 1 ).data.slice( 0, 3 )
			, satMove   : ( x, y ) => { // pixel > rgb > hsl
				x    += sat_tl;
				y    += sat_tl;
				var b, d, f, g, l, m, r, s;
				[ r, g, b ] = pick.pixelData( x, y );
				if ( r + g + b === 0 ) return
				
				r    /= 255;
				g    /= 255;
				b    /= 255;
				m     = Math.max( r, g, b );
				d     = m - Math.min( r, g, b );
				f     = 1 - Math.abs( m + m - d - 1 ); 
				hsl.l = Math.round( ( m + m - d ) / 2 * 100 );
				hsl.s = f ? Math.round( d / f * 100 ) : 0;
				COLOR.set( hsl );
				sat_xy = { x: x, y: y }
			}
			, satPoint  : ( x, y ) => {
				[ r, g, b ] = pick.pixelData( x, y );
				pick.satClear();
				ctx.sat.beginPath();
				ctx.sat.arc( x, y, hue_w / 4, 0, 2 * Math.PI );
				ctx.sat.stroke();
			}
			, satClear  : () => ctx.sat.clearRect( 0, 0, canvas_w, canvas_w )
			, xy        : e => {
				var x = e.offsetX || e.changedTouches[ 0 ].pageX - canvas_b.x;
				var y = e.offsetY || e.changedTouches[ 0 ].pageY - canvas_b.y;
				pick[ hue ? 'hueRotate' : 'satMove' ]( x, y );
			}
		}
// common
		var canvas_w = 230;
		var canvas_c = canvas_w / 2;
		var sat      = false;
		var sat_w    = 120;
		var sat_tl   = ( canvas_w - sat_w ) / 2;
		var sat_br   = sat_tl + sat_w;
		var hue      = false;
		var hue_r    = 95;
		var hue_w    = canvas_w / 2 - hue_r;
		var [ h, s, l ] = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' ).map( Number );
		var hsl      = { h, s, l }
		
		$( '#divcolor canvas' ).attr( { width: canvas_w, height: canvas_w } );
// context
		var ctx      = { base: COLOR.wheel( '#base' ) }; // hue wheel
		[ 'hue', 'sat' ].forEach( id => {
			ctx[ id ]             = $( '#'+ id )[ 0 ].getContext( '2d' );
			ctx[ id ].lineWidth   = 2;
			ctx[ id ].strokeStyle = '#fff';
		} );
// hue ring
		ctx.base.fillStyle = '#000';
		ctx.base.beginPath();
		ctx.base.arc( canvas_c, canvas_c, hue_r, 0, 2 * Math.PI );
		ctx.base.fill();
// hue point
		ctx.hue.beginPath();
		ctx.hue.arc( canvas_w - hue_w / 2, canvas_c, hue_w / 2 - 1, 0, 2 * Math.PI );
		ctx.hue.stroke();
		$( '#hue' ).css( 'transform', 'rotate( '+ hsl.h +'deg )' );
// sat box
		pick.gradient();
// sat point
		var a, b, g, k, l, pb, pg, pr, r, rgb, v, x, y;
		l = hsl.l / 100;
		a = hsl.s / 100 * Math.min( l, 1 - l );
		[ r, g, b ] = ( () => { // hsl > rgb
			rgb = [];
			[ 0, 8, 4 ].forEach( n => {
				k = ( n + hsl.h / 30 ) % 12;
				v = l - a * Math.max( Math.min( k - 3, 9 - k, 1 ), -1 );
				rgb.push( Math.round( v * 255 ) );
			} );
			return rgb
		} )();
		for ( y = sat_tl; y < sat_br; y++ ) { // find pixel with rgb +/- 1
			for ( x = sat_tl; x < sat_br; x++ ) {
				[ pr, pg, pb ] = pick.pixelData( x, y );
				if ( Math.abs( r - pr ) < 2
				  && Math.abs( g - pg ) < 2
				  && Math.abs( b - pb ) < 2
				) {
					pick.satPoint( x, y );
					break;
				}
			}
		}
// pick - get canvas_b after all set : e.changedTouches[ 0 ].pageX/Y - canvas_b.x/y = e.offsetX/Y
		var canvas_b = $( '#base' )[ 0 ].getBoundingClientRect();
		var sat_xy;
		$( '#pickhue' ).on( 'touchstart mousedown', e => {
			hue = true;
			pick.xy( e );
			$( '#pickhue' ).css( 'border-radius', 0 );     // allow outside drag
			$( '#picknone, #picksat' ).addClass( 'hide' ); // allow inside drag
			$( '#infoOk' ).removeClass( 'disabled' );
		} ).on( 'touchmove mousemove', e => {
			if ( hue ) pick.xy( e );
		} ).on( 'touchend mouseup', () => {
			if ( hsl.h < 0 ) hsl.h += 360;
			$( '#pickhue' ).css( 'border-radius', '' );
			$( '#picknone, #picksat' ).removeClass( 'hide' );
			hue = false;
		} );
		$( '#picksat' ).on( 'touchstart mousedown', e => {
			sat = true;
			pick.satClear();
			pick.xy( e );
			$( '#infoOk' ).removeClass( 'disabled' );
		} ).on( 'touchmove mousemove', e => {
			if ( sat ) pick.xy( e );
		} ).on( 'touchleave mouseleave', () => {
			if ( sat ) pick.satPoint( sat_xy.x, sat_xy.y );
		} ).on( 'touchenter mouseenter', () => {
			if ( sat ) pick.satClear();
		} );
		$( '#colorpicker' ).on( 'touchend mouseup', () => { // allow stop both inside and outside of #picksat
			if ( ! sat ) return
			
			pick.satPoint( sat_xy.x, sat_xy.y );
			sat = false;
		} );
// action
		$( '#colorok' ).on( 'click', function() {
			COLOR.save( hsl );
			COLOR.remove();
		} );
		$( '#colorreset' ).on( 'click', function() {
			COLOR.set( V.color.cd );
			BASH( [ 'color', true, 'CMD RESET' ] );
			COLOR.remove();
		} );
		$( '#colorcancel' ).on( 'click', function() {
			COLOR.remove();
			$( 'html' ).removeAttr( 'style' );
			if ( S.player === 'mpd' ) {
				if ( V.playlist ) PLAYLIST.render.scroll();
			} else {
				UTIL.switchPage( 'playback' );
			}
		} );
	}
	, remove : () => {
		$( '#colorpicker' ).remove();
		$( 'body' ).css( 'overflow', '' );
		delete V.color;
	}
	, save   : hsl => BASH( [ 'color', Object.values( hsl ).join( ' ' ), 'CMD HSL' ] )
	, set    : hsl => {
		var css = { '--h': hsl.h, '--s': hsl.s +'%' };
		V.color.ml.forEach( v => { css[ '--ml'+ v ] = ( hsl.l + v - 35 ) +'%' } );
		$( ':root' ).css( css );
	}
	, wheel  : el => { // for picker and color menu
		var canvas   = $( el )[ 0 ];
		var ctx      = canvas.getContext( '2d', { willReadFrequently: el === '#base' } );
		var canvas_c = canvas.width / 2;
		for ( var i = 0; i < 360; i += 0.25 ) {
			var rad         = i * Math.PI / 180;
			ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
			ctx.beginPath();
			ctx.moveTo( canvas_c, canvas_c );
			ctx.lineTo( canvas_c + canvas_c * Math.cos( rad ), canvas_c + canvas_c * Math.sin( rad ) );
			ctx.stroke();
		}
		return ctx // for picker
	}
}
