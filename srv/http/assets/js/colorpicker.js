var COLOR = {
	  picker : () => {
		var pick = {
			  gradient  : hue => {
				if ( ! hue ) hue = hsl.h;
				V.ctx.base.save();
				V.ctx.base.translate( box0, box0 );
				for( var i = 0; i <= box_w; i++ ){
					var gradient = V.ctx.base.createLinearGradient( 0, 0, box_w, 0 );
					var iy       = i / box_w * 100;
					gradient.addColorStop( 0, 'hsl(0,0%,'+ iy +'%)' );                   // hsl( 0, 0%,   0% ) --- hsl( h, 100%,  0% )
					gradient.addColorStop( 1, 'hsl('+ hue +',100%,'+ ( iy / 2 ) +'%)' ); // hsl( 0, 0%, 100% ) --- hsl( h, 100%, 50% )
					V.ctx.base.fillStyle = gradient;
					V.ctx.base.fillRect( 0, box_w - i, box_w, 1 );
				}
				V.ctx.base.restore();
			}
			, hueRotate : ( x, y ) => {
				var rad = Math.atan2( x - cxy.x, y - cxy.y );
				V.hue   = Math.round( ( rad * ( 180 / Math.PI ) * -1 ) + 90 );
				pick.gradient( V.hue );
				$( '#hue' ).css( 'transform', 'rotate( '+ V.hue +'deg )' );
				COLOR.set( V.hue, hsl.s, hsl.l );
			}
			, pixelData : ( x, y ) => V.ctx.base.getImageData( x, y, 1, 1 ).data
			, point     : ( x, y ) => {
				var c = V.ctx.sat;
				c.clearRect( 0, 0, canvas_w, canvas_w );
				c.beginPath();
				c.arc( x, y, wheel_w / 4, 0, 2 * Math.PI );
				c.stroke();
			}
			, satMove   : ( x, y ) => { // pixel > rgb > hsl
				var b, d, f, g, h, l, m, p, r, s;
				p = pick.pixelData( x, y );
				r = p[ 0 ] / 255;
				g = p[ 1 ] / 255;
				b = p[ 2 ] / 255;
				m = Math.max( r, g, b );
				d = m - Math.min( r, g, b );
				f = 1 - Math.abs( m + m - d - 1 ); 
				h = 0;
				s = 0;
				l = Math.round( ( m + m - d ) / 2 * 100 );
				if ( d ) {
					h = m === r
							? ( g - b ) / d
							: ( ( m === g )
									? 2 + ( b - r ) / d
									: 4 + ( r - g ) / d );
					h = Math.round( ( h < 0 ? h + 6 : h ) * 60 );
				}
				if ( f ) s = Math.round( d / f * 100 );
				COLOR.set( h, s, l );
				hsl = { h: h, s: s, l: l }
			}
		}
		
		var canvas_w = 230;
		var canvas_o = canvas_w / 2;
		var box_w    = 120;
		var box0     = ( canvas_w - box_w ) / 2;
		var box_br   = box0 + box_w;
		var wheel_r  = 95;
		var wheel_w  = canvas_w / 2 - wheel_r;
		var hsl      = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' );
		hsl          = { h: +hsl[ 0 ], s: +hsl[ 1 ], l: +hsl[ 2 ] };
		
		$( '.page:not( .hide ) .list:not( .hide ) li' ).eq( 0 ).addClass( 'active' );
		$( 'body' ).css( 'overflow', 'hidden' );
		
		$( '#lyrics' ).after( `
<div id="colorpicker">
<div id="divcolor">
<i id="colorcancel" class="i-close"></i>
<canvas id="canvascolor"></canvas>
<div id="hue"><div></div></div>
<a id="colorreset" class="infobtn ${ D.color ? '' : 'hide' }"><i class="i-set0"></i> Default</a><a id="colorok" class="infobtn infobtn-primary">OK</a>
</div>
</div>
` );
		V.ctx        = { base: COLOR.wheel( '#canvascolor', 230 ) };
		[ 'hue', 'sat' ].forEach( id => {
			$( '#canvascolor' ).before( '<canvas id="'+ id +'" width="'+ canvas_w +'" height="'+ canvas_w +'"></canvas>' );
			V.ctx[ id ]             = $( '#'+ id )[ 0 ].getContext( '2d' );
			V.ctx[ id ].lineWidth   = 2;
			V.ctx[ id ].strokeStyle = '#fff';
		} );
		V.ctx.base.fillStyle = '#000';
		V.ctx.base.beginPath();
		V.ctx.base.arc( canvas_o, canvas_o, wheel_r, 0, 2 * Math.PI );
		V.ctx.base.fill();
		pick.gradient();
		// hue point
		V.ctx.hue.beginPath();
		V.ctx.hue.arc( canvas_w - wheel_w / 2, canvas_o, wheel_w / 2, 0, 2 * Math.PI );
		V.ctx.hue.stroke();
		$( '#hue' ).css( 'transform', 'rotate( '+ hsl.h +'deg )' );
		// sat point
		var a, b, g, k, l, p, r, r_g_b, v, x, y;
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
		for ( y = box0; y < box_br; y++ ) { // find pixel with rgb +/- 1
			for ( x = box0; x < box_br; x++ ) {
				p = pick.pixelData( x, y );
				if ( Math.abs( r - p[ 0 ] ) < 2
				  && Math.abs( g - p[ 1 ] ) < 2
				  && Math.abs( b - p[ 2 ] ) < 2
				) {
					pick.point( x, y );
					break;
				}
			}
		}
		var tl  = $( '#canvascolor' ).position();
		var cxy = { x: tl.left + canvas_w /2, y: tl.top + canvas_w / 2 }
		$( '#colorpicker canvas' ).on( 'touchstart mousedown', e => {
			var x   = tl.left + e.offsetX;
			var y   = tl.top + e.offsetY;
			var hue =  x < box0 || x > box0 + box_w || y < box0 || y >  + box_w;
			if ( hue ) {
				var p = pick.pixelData( x, y );
				if ( p[ 0 ] || p[ 1 ] || p[ 2 ] ) pick.hueRotate( x, y );
			} else {
				V.sat = true;
				V.ctx.sat.clearRect( 0, 0, canvas_w, canvas_w );
			}
		} ).on( 'mousemove', e => {
			if ( 'hue' in V ) {
				pick.hueRotate( tl.left + e.offsetX, tl.top + e.offsetY );
			} else if ( 'sat' in V ) {
				pick.satMove( e.offsetX, e.offsetY );
			}
		} ).on( 'touchend mouseup', e => {
			if ( 'hue' in V ) {
				hsl.h = Math.round( V.hue );
				if ( hsl.h < 0 ) hsl.h += 360;
				delete V.hue;
			} else if ( 'sat' in V ) {
				pick.point( e.offsetX, e.offsetY );
				delete V.sat;
			}
		} );
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
	, save   : hsl => BASH( [ 'color', Object.values( hsl ).join( ' ' ), 'CMD HSL' ] )
	, set    : ( h, s, l ) => {
		var css = { '--h': h, '--s': s +'%' };
		V.color.ml.forEach( v => { css[ '--ml'+ v ] = ( l + v - 35 ) +'%' } );
		$( ':root' ).css( css );
	}
	, wheel  : ( el, wh ) => {
		$( el ).attr( { width: wh, height: wh } );
		var canvas   = $( el )[ 0 ];
		var ctx      = canvas.getContext( '2d', { willReadFrequently: true } );
		var canvas_o = canvas.width / 2;
		for ( var i = 0; i < 360; i += 0.25 ) {
			var rad         = i * Math.PI / 180;
			ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
			ctx.beginPath();
			ctx.moveTo( canvas_o, canvas_o );
			ctx.lineTo( canvas_o + canvas_o * Math.cos( rad ), canvas_o + canvas_o * Math.sin( rad ) );
			ctx.stroke();
		}
		return ctx
	}
}
