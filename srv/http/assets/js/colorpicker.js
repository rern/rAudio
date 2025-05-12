var COLOR = {
	  picker : () => {
		$( '.page:not( .hide ) .list:not( .hide ) li' ).eq( 0 ).addClass( 'active' );
		$( 'body' ).css( 'overflow', 'hidden' );
		$( '#lyrics' ).after(  `
<div id="colorpicker">
	<div id="divcolor">
		<i id="colorcancel" class="i-close"></i>
		<div id="pickhue"></div><div id="picknone"></div><div id="picksat"></div>
		<div id="wheel"></div><div id="hue"><div></div></div><div id="sat"></div><canvas id="base"></canvas>
		<a id="colorreset" class="infobtn ${ D.color ? '' : 'hide' }"><i class="i-set0"></i>Default</a>
		<a id="colorok" class="infobtn infobtn-primary ${ D.color ? '' : 'disabled' }">OK</a>
	</div>
</div>
` );
// common
		var canvas_w = $( '#hue' ).width();
		var canvas_c = canvas_w / 2;
		var sat_w    = canvas_w - 110;
		var sat_tl   = ( canvas_w - sat_w ) / 2;
		var sat_br   = sat_tl + sat_w;
		var hue_r    = sat_w - 25;
		var hue_w    = canvas_w / 2 - hue_r;
		var [ h, s, l ] = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' ).map( Number );
		var hsl      = { h, s, l }
		
		$( '#base' ).attr( { width: canvas_w, height: canvas_w } );
		$( '#hue' ).css( 'transform', 'rotate( '+ hsl.h +'deg )' );
// function
		var pick     = {
			  gradient : () => {
				ctx.save();
				ctx.translate( sat_tl, sat_tl );
				for( var i = 0; i <= sat_w; i++ ){                                         // each line
					var gradient = ctx.createLinearGradient( 0, 0, sat_w, 0 );             // 0                  ---               width
					var iy       = i / sat_w * 100;
					gradient.addColorStop( 0, 'hsl(0,0%,'+ iy +'%)' );                     // hsl( 0, 0%,   0% ) --- hsl( h, 100%,  0% )
					gradient.addColorStop( 1, 'hsl('+ hsl.h +',100%,'+ ( iy / 2 ) +'%)' ); // hsl( 0, 0%, 100% ) --- hsl( h, 100%, 50% )
					ctx.fillStyle = gradient;
					ctx.fillRect( 0, sat_w - i, sat_w, 1 );
				}
				ctx.restore();
			}
			, hue      : ( x, y ) => {
				var ori = canvas_w /2;
				var rad = Math.atan2( x - ori, y - ori );
				hsl.h   = Math.round( ( rad * ( 180 / Math.PI ) * -1 ) + 90 );
				pick.gradient();
				$( '#hue' )
					.css( 'transform', 'rotate( '+ hsl.h +'deg )' )
					.toggleClass( 'dark', hsl.h > 45 && hsl.h < 180 );
				COLOR.set( hsl );
			}
			, pixelRgb : ( x, y ) => ctx.getImageData( x, y, 1, 1 ).data
			, sat      : ( x, y ) => {
				x    += sat_tl;
				y    += sat_tl;
				var b, d, f, g, l, m, r, s;
				[ r, g, b ] = pick.pixelRgb( x, y );
				if ( r + g + b === 0 ) return
				 // rgb > s l
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
			, satPoint : ( x, y ) => {
				$( '#sat' )
					.css( { left: ( x - 5 ) +'px', top: ( y - 5 ) +'px' } )
					.removeClass( 'hide' );
			}
			, satClear : () => $( '#sat' ).addClass( 'hide' )
			, xy       : ( e, hue_sat, clear ) => {
				if ( clear ) pick.satClear();
				var x = e.offsetX || e.changedTouches[ 0 ].pageX - tl[ hue_sat ].x;
				var y = e.offsetY || e.changedTouches[ 0 ].pageY - tl[ hue_sat ].y;
				pick[ hue_sat ]( x, y );
			}
		}
// hue ring
		var ctx      = COLOR.wheel( '#base' ); // hue wheel
		ctx.fillStyle = '#000';
		ctx.beginPath();
		ctx.arc( canvas_c, canvas_c, hue_r, 0, 2 * Math.PI );
		ctx.fill();
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
		match:
		for ( y = sat_tl; y < sat_br; y++ ) { // find pixel with rgb +/- 1
			for ( x = sat_tl; x < sat_br; x++ ) {
				[ pr, pg, pb ] = pick.pixelRgb( x, y );
				if ( Math.abs( r - pr ) < 2 && Math.abs( g - pg ) < 2 && Math.abs( b - pb ) < 2 ) {
					pick.satPoint( x, y );
					break match;
				}
			}
		}
// pick - get base_xy after all set
		var base_xy = $( '#base' )[ 0 ].getBoundingClientRect();
		var tl      = { // e.changedTouches[ 0 ].pageX/Y - tl[ x ].x/y = e.offsetX/Y
			  hue : { x: base_xy.x,          y: base_xy.y }
			, sat : { x: base_xy.x + sat_tl, y: base_xy.y + sat_tl }
		}
		var hue, sat, satout, sat_xy;
		$( '#pickhue' ).on( 'touchstart mousedown', e => {
			hue = true;
			pick.xy( e, 'hue' );
			$( '#pickhue' ).css( 'border-radius', 0 );     // drag outside #pickhue
			$( '#picknone, #picksat' ).addClass( 'hide' ); // drag inside
			$( '#colorok' ).removeClass( 'disabled' );
		} ).on( 'touchmove mousemove', e => {
			if ( hue ) pick.xy( e, 'hue' );
		} ).on( 'touchend mouseup', () => {
			if ( ! hue ) return
			
			hue = false;
			if ( hsl.h < 0 ) hsl.h += 360;
			$( '#pickhue' ).css( 'border-radius', '' );
			$( '#picknone, #picksat' ).removeClass( 'hide' );
		} );
		$( '#picksat' ).on( 'touchstart mousedown', e => {
			sat = true;
			pick.xy( e, 'sat', 'clear' );
			$( '#colorok' ).removeClass( 'disabled' );
		} ).on( 'touchmove', e => {
			if ( ! sat  ) return
			
			var et = e.touches[ 0 ];
			if ( 'picksat' === document.elementFromPoint( et.clientX, et.clientY ).id ) {
				pick.xy( e, 'sat', satout );
				if ( satout ) satout = false;
			} else {
				satout = true;
				pick.satPoint( sat_xy.x, sat_xy.y );
			}
		} ).on( 'mousemove', e => {
			if ( sat ) pick.xy( e, 'sat' );
		} ).on( 'mouseleave', () => {
			if ( sat ) pick.satPoint( sat_xy.x, sat_xy.y );
		} ).on( 'mouseenter', () => {
			if ( sat ) pick.satClear();
		} );
		$( '#colorpicker' ).on( 'touchend mouseup', () => { // drag stop both inside and outside #picksat
			if ( ! sat ) return
			
			sat = false;
			pick.satPoint( sat_xy.x, sat_xy.y );
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
