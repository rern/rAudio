var COLOR = {
	  gradient : () => {
		var c  = V.color.ctx;
		var tl = V.color.sat.tl;
		var w  = V.color.sat.w;
		c.save();
		c.translate( tl, tl );
		for( var i = 0; i <= w; i++ ){                                         // each line
			var gradient = c.createLinearGradient( 0, 0, w, 0 );             // 0                  ---               width
			var iy       = i / w * 100;
			gradient.addColorStop( 0, 'hsl(0,0%,'+ iy +'%)' );                     // hsl( 0, 0%,   0% ) --- hsl( h, 100%,  0% )
			gradient.addColorStop( 1, 'hsl('+ V.color.hsl.h +',100%,'+ ( iy / 2 ) +'%)' ); // hsl( 0, 0%, 100% ) --- hsl( h, 100%, 50% )
			c.fillStyle = gradient;
			c.fillRect( 0, w - i, w, 1 );
		}
		c.restore();
	}
	, pick   : {
		  hue      : ( x, y ) => {
			var c   = V.color.canvas.c;
			var rad = Math.atan2( x - c, y - c );
			var h   = Math.round( ( rad * ( 180 / Math.PI ) * -1 ) + 90 );
			$( '#hue' )
				.css( 'transform', 'rotate( '+ h +'deg )' )
				.toggleClass( 'dark', h > 45 && h < 180 );
			V.color.hsl.h = h;
			COLOR.gradient();
			COLOR.set( V.color.hsl );
		}
		, sat      : ( x, y ) => {
			x    += V.color.sat.tl;
			y    += V.color.sat.tl;
			var b, d, f, g, m, r;
			[ r, g, b ] = V.color.ctx.getImageData( x, y, 1, 1 ).data;
			if ( r + g + b === 0 ) return
			 // rgb > s l
			r    /= 255;
			g    /= 255;
			b    /= 255;
			m     = Math.max( r, g, b );
			d     = m - Math.min( r, g, b );
			f     = 1 - Math.abs( m + m - d - 1 ); 
			V.color.hsl.l = Math.round( ( m + m - d ) / 2 * 100 );
			V.color.hsl.s = f ? Math.round( d / f * 100 ) : 0;
			COLOR.set( V.color.hsl );
			V.color.sat.x = x;
			V.color.sat.y = y;
		}
	}
	, picker : () => {
// common
		var canvas_w  = 230;
		var sat_w     = canvas_w - 110;
		var sat_tl    = ( canvas_w - sat_w ) / 2;
		var [ h, s, l ] = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' ).map( Number );
		V.color       = {
			  ...V.color
			, canvas : {
				  w : canvas_w
				, c : canvas_w / 2
			}
			, ctx    : COLOR.wheel( '#base' )
			, hsl    : { h, s, l }
			, hue    : { r: sat_w - 25 }
			, sat    : {
				  br : sat_tl + sat_w
				, tl : sat_tl
				, w  : canvas_w - 110
			}
		}
		
		$( '.page:not( .hide ) .list:not( .hide ) li' ).eq( 0 ).addClass( 'active' );
		$( 'body' ).css( 'overflow', 'hidden' );
		$( '#hue' ).css( 'transform', 'rotate( '+ V.color.hsl.h +'deg )' );
		$( '#colorreset' ).toggleClass( 'hide', ! D.color );
		$( '#colorok' ).toggleClass( 'disabled', ! D.color );
// hue ring
		var ctx       = V.color.ctx;
		ctx.fillStyle = '#000';
		ctx.beginPath();
		ctx.arc( V.color.canvas.c, V.color.canvas.c, V.color.hue.r, 0, 2 * Math.PI );
		ctx.fill();
// sat box
		COLOR.gradient();

		var b, g, k, pb, pg, pr, r, rgb, v, x, y;
		var l         = V.color.hsl.l / 100;
		var a         = V.color.hsl.s / 100 * Math.min( l, 1 - l );
		[ r, g, b ]   = ( () => { // hsl > rgb
			rgb = [];
			[ 0, 8, 4 ].forEach( n => {
				k = ( n + V.color.hsl.h / 30 ) % 12;
				v = l - a * Math.max( Math.min( k - 3, 9 - k, 1 ), -1 );
				rgb.push( Math.round( v * 255 ) );
			} );
			return rgb
		} )();
		match:
		for ( y = V.color.sat.tl; y < V.color.sat.br; y++ ) { // find pixel with rgb +/- 1
			for ( x = V.color.sat.tl; x < V.color.sat.br; x++ ) {
				[ pr, pg, pb ] = V.color.ctx.getImageData( x, y, 1, 1 ).data;
				if ( Math.abs( r - pr ) < 2 && Math.abs( g - pg ) < 2 && Math.abs( b - pb ) < 2 ) {
					COLOR.satPoint( x, y );
					$( '#colorpicker' ).removeClass( 'hide' );
					break match;
				}
			}
		}
// pick - get base_xy after all set
		var base_xy = $( '#base' )[ 0 ].getBoundingClientRect();
		V.color.tl  = { // e.changedTouches[ 0 ].pageX/Y - tl[ x ].x/y = e.offsetX/Y
			  hue : { x: base_xy.x,                  y: base_xy.y }
			, sat : { x: base_xy.x + V.color.sat.tl, y: base_xy.y + V.color.sat.tl }
		}
	}
	, remove : () => {
		$( '#colorpicker' ).addClass( 'hide' );
		$( 'body' ).css( 'overflow', '' );
		delete V.color;
	}
	, satPoint : ( x, y ) => {
		$( '#sat' )
			.css( { left: ( x - 5 ) +'px', top: ( y - 5 ) +'px' } )
			.removeClass( 'hide' );
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
	, xy       : ( e, hue_sat, clear ) => {
		if ( clear ) $( '#sat' ).addClass( 'hide' )
		var x = e.offsetX || e.changedTouches[ 0 ].pageX - V.color.tl[ hue_sat ].x;
		var y = e.offsetY || e.changedTouches[ 0 ].pageY - V.color.tl[ hue_sat ].y;
		COLOR.pick[ hue_sat ]( x, y );
	}
}
