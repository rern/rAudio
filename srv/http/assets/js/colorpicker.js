var COLOR = {
	  picker : () => {
// function
		var pick     = {
			  gradient  : () => {
				ctx.base.save();
				ctx.base.translate( sat_tl, sat_tl );
				for( var i = 0; i <= sat_w; i++ ){
					var gradient = ctx.base.createLinearGradient( 0, 0, sat_w, 0 );
					var iy       = i / sat_w * 100;
					gradient.addColorStop( 0, 'hsl(0,0%,'+ iy +'%)' );                   // hsl( 0, 0%,   0% ) --- hsl( h, 100%,  0% )
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
				COLOR.set( ...Object.values( hsl ) );
			}
			, pixelData : ( x, y ) => ctx.base.getImageData( x, y, 1, 1 ).data.slice( 0, 3 )
			, point     : ( x, y ) => {
				var c = ctx.sat;
				c.clearRect( 0, 0, canvas_w, canvas_w );
				c.beginPath();
				c.arc( x, y, hue_w / 4, 0, 2 * Math.PI );
				c.stroke();
			}
			, satMove   : ( x, y ) => { // pixel > rgb > hsl
				var b, d, f, g, l, m, r, s;
				[ r, g, b ] = pick.pixelData( x, y );
				r    /= 255;
				g    /= 255;
				b    /= 255;
				m     = Math.max( r, g, b );
				d     = m - Math.min( r, g, b );
				f     = 1 - Math.abs( m + m - d - 1 ); 
				hsl.l = Math.round( ( m + m - d ) / 2 * 100 );
				hsl.s = f ? Math.round( d / f * 100 ) : 0;
				COLOR.set( ...Object.values( hsl ) );
			}
			, xy        : e => {
				if ( ! e.offsetX ) e = e.changedTouches[ 0 ];
				return [ e.offsetX, e.offsetY ]
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
		var [ h, s, l ] = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' );
		var hsl      = { h: +h, s: +s, l: +l };
// page background
		$( '.page:not( .hide ) .list:not( .hide ) li' ).eq( 0 ).addClass( 'active' );
		$( 'body' ).css( 'overflow', 'hidden' );
// html
		var canvas   = '';
		[ 'hue', 'sat', 'base' ].forEach( id => canvas += '<canvas id="'+ id +'" width="'+ canvas_w +'" height="'+ canvas_w +'"></canvas>' );
		$( '#lyrics' ).after( `
<div id="colorpicker">
	<div id="divcolor">
		<i id="colorcancel" class="i-close"></i>
		${ canvas }
		<a id="colorreset" class="infobtn ${ D.color ? '' : 'hide' }"><i class="i-set0"></i>Default</a><a id="colorok" class="infobtn infobtn-primary">OK</a>
	</div>
</div>
` );
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
		ctx.hue.arc( canvas_w - hue_w / 2, canvas_c, hue_w / 2, 0, 2 * Math.PI );
		ctx.hue.stroke();
		$( '#hue' ).css( 'transform', 'rotate( '+ hsl.h +'deg )' );
// sat box
		pick.gradient();
// sat point
		var a, b, g, k, l, pb, pg, pr, r, r_g_b, v, x, y;
		l = hsl.l / 100;
		a = hsl.s / 100 * Math.min( l, 1 - l );
		[ r, g, b ] = ( () => { // hsl > rgb
			r_g_b = [];
			[ 0, 8, 4 ].forEach( n => {
				k = ( n + hsl.h / 30 ) % 12;
				v = l - a * Math.max( Math.min( k - 3, 9 - k, 1 ), -1 );
				r_g_b.push( Math.round( v * 255 ) );
			} );
			return r_g_b
		} )();
		for ( y = sat_tl; y < sat_br; y++ ) { // find pixel with rgb +/- 1
			for ( x = sat_tl; x < sat_br; x++ ) {
				[ pr, pg, pb ] = pick.pixelData( x, y );
				if ( Math.abs( r - pr ) < 2
				  && Math.abs( g - pg ) < 2
				  && Math.abs( b - pb ) < 2
				) {
					pick.point( x, y );
					break;
				}
			}
		}
// pick / move
		$( '#divcolor canvas' ).on( 'touchstart mousedown', e => {
			var [ x, y ] = pick.xy( e );
			if ( x < sat_tl || x > sat_br || y < sat_tl || y > sat_br ) {
				hue = true;
				var [ r, g, b ] = pick.pixelData( x, y );
				if ( r || g || b ) pick.hueRotate( x, y );
			} else {
				sat = true;
				ctx.sat.clearRect( 0, 0, canvas_w, canvas_w );
				pick.satMove( x, y );
			}
		} ).on( 'touchmove mousemove', e => {
			var [ x, y ] = pick.xy( e );
			if ( hue ) {
				pick.hueRotate( x, y );
			} else if ( sat ) {
				pick.satMove( x, y );
			}
		} ).on( 'touchend mouseup', e => {
			if ( hue ) {
				if ( hsl.h < 0 ) hsl.h += 360;
				hue = false;
			} else if ( sat ) {
				var [ x, y ] = pick.xy( e );
				pick.point( x, y );
				sat = false;
			}
		} );
// action
		$( '#colorok' ).on( 'click', function() {
			COLOR.save( hsl );
			COLOR.remove();
		} );
		$( '#colorreset' ).on( 'click', function() {
			COLOR.set( ...V.color.cd );
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
	, save   : hsl => BASH( [ 'color', hsl.h +' '+ hsl.s +' '+ hsl.l, 'CMD HSL' ] )
	, set    : ( h, s, l ) => {
		var css = { '--h': h, '--s': s +'%' };
		V.color.ml.forEach( v => { css[ '--ml'+ v ] = ( l + v - 35 ) +'%' } );
		$( ':root' ).css( css );
	}
	, wheel  : el => { // for picker and color menu
		var canvas   = $( el )[ 0 ];
		var ctx      = canvas.getContext( '2d', { willReadFrequently: true } );
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
