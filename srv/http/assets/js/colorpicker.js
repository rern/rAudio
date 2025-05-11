var COLOR = {
	  picker : () => {
// function
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
				var ori = canvas_w /2;
				var rad = Math.atan2( x - ori, y - ori );
				V.hue   = Math.round( ( rad * ( 180 / Math.PI ) * -1 ) + 90 );
				pick.gradient( V.hue );
				$( '#hue' ).css( 'transform', 'rotate( '+ V.hue +'deg )' );
				COLOR.set( V.hue, hsl.s, hsl.l );
			}
			, pixelData : ( x, y ) => V.ctx.base.getImageData( x, y, 1, 1 ).data.slice( 0, 3 )
			, point     : ( x, y ) => {
				var c = V.ctx.sat;
				c.clearRect( 0, 0, canvas_w, canvas_w );
				c.beginPath();
				c.arc( x, y, wheel_w / 4, 0, 2 * Math.PI );
				c.stroke();
			}
			, satMove   : ( x, y ) => { // pixel > rgb > hsl
				var b, d, f, g, l, m, r, s;
				[ r, g, b ] = pick.pixelData( x, y );
				r  /= 255;
				g  /= 255;
				b  /= 255;
				m   = Math.max( r, g, b );
				d   = m - Math.min( r, g, b );
				f   = 1 - Math.abs( m + m - d - 1 ); 
				l   = Math.round( ( m + m - d ) / 2 * 100 );
				s   = f ? Math.round( d / f * 100 ) : 0;
				hsl = { h: hsl.h, s: s, l: l }
				COLOR.set( hsl.h, s, l );
			}
			, xy        : e => {
				if ( ! e.offsetX ) e = e.changedTouches[ 0 ];
				return [ e.offsetX, e.offsetY ]
			}
		}
// common
		var canvas_w = 230;
		var canvas_o = canvas_w / 2;
		var box_w    = 120;
		var box0     = ( canvas_w - box_w ) / 2;
		var box_br   = box0 + box_w;
		var wheel_r  = 95;
		var wheel_w  = canvas_w / 2 - wheel_r;
		var [ h, s, l ] = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' );
		hsl          = { h: +h, s: +s, l: +l };
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
// hue wheel
		V.ctx        = { base: COLOR.wheel( '#base' ) };
		
		[ 'hue', 'sat' ].forEach( id => {
			V.ctx[ id ]             = $( '#'+ id )[ 0 ].getContext( '2d' );
			V.ctx[ id ].lineWidth   = 2;
			V.ctx[ id ].strokeStyle = '#fff';
		} );
		V.ctx.base.fillStyle = '#000';
		V.ctx.base.beginPath();
		V.ctx.base.arc( canvas_o, canvas_o, wheel_r, 0, 2 * Math.PI );
		V.ctx.base.fill();
// sat box
		pick.gradient();
// point - hue
		V.ctx.hue.beginPath();
		V.ctx.hue.arc( canvas_w - wheel_w / 2, canvas_o, wheel_w / 2, 0, 2 * Math.PI );
		V.ctx.hue.stroke();
		$( '#hue' ).css( 'transform', 'rotate( '+ hsl.h +'deg )' );
// point - sat
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
		for ( y = box0; y < box_br; y++ ) { // find pixel with rgb +/- 1
			for ( x = box0; x < box_br; x++ ) {
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
			if ( x < box0 || x > box_br || y < box0 || y > box_br ) {
				var [ r, g, b ] = pick.pixelData( x, y );
				if ( r || g || b ) pick.hueRotate( x, y );
			} else {
				V.sat = true;
				V.ctx.sat.clearRect( 0, 0, canvas_w, canvas_w );
				pick.satMove( x, y );
			}
		} ).on( 'touchmove mousemove', e => {
			var [ x, y ] = pick.xy( e );
			if ( 'hue' in V ) {
				pick.hueRotate( x, y );
			} else if ( 'sat' in V ) {
				pick.satMove( x, y );
			}
		} ).on( 'touchend mouseup', e => {
			if ( 'hue' in V ) {
				hsl.h = Math.round( V.hue );
				if ( hsl.h < 0 ) hsl.h += 360;
				delete V.hue;
			} else if ( 'sat' in V ) {
				var [ x, y ] = pick.xy( e );
				pick.point( x, y );
				delete V.sat;
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
