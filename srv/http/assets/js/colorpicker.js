function colorPicker() {
	var pick = {
		  gradient : () => {
			V.ctx.base.save();
			V.ctx.base.translate( box0, box0 );
			for( var i = 0; i <= box_wh; i++ ){
				var gradient       = V.ctx.base.createLinearGradient( 0, 0, box_wh, 0 );
				var iy             = i / box_wh * 100;
				gradient.addColorStop( 0, 'hsl(0,0%,'+ iy +'%)' );                     // hsl( 0, 0%,   0% ) --- hsl( h, 100%,  0% )
				gradient.addColorStop( 1, 'hsl('+ hsl.h +',100%,'+ ( iy / 2 ) +'%)' ); // hsl( 0, 0%, 100% ) --- hsl( h, 100%, 50% )
				V.ctx.base.fillStyle = gradient;
				V.ctx.base.fillRect( 0, box_wh - i, box_wh, 1 );
			}
			V.ctx.base.restore();
		}
		, hsl      : ( x, y, move ) => {
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
			hsl = { h: h, s: s, l: l }
			if ( ! V.hue || hsl.h === 0 ) return
			
			if ( move ) pick.point( hsl.h, 'hue' );
			pick.gradient();
		}
		, pixelData : ( x, y ) => V.ctx.base.getImageData( x, y, 1, 1 ).data
		, point     : ( x, y ) => {
			if ( y === 'hue' ) {
				var c   = V.ctx.hue;
				var r   = wheel_w / 2;
				var rad = hsl.h * Math.PI / 180;
				x       = c0 + Math.cos( rad ) * wheel_rc;
				y       = c0 + Math.sin( rad ) * wheel_rc;
			} else {
				var c   = V.ctx.sat;
				var r   = wheel_w / 4;
			}
			c.clearRect( 0, 0, canvasW, canvasW );
			c.beginPath();
			c.arc( x, y, r, 0, 2 * Math.PI );
			c.stroke();
		}
		, wheel   : ( id, wh ) => {
			$( id ).html( '<canvas width="'+ wh +'" height="'+ wh +'"></canvas>' );
			var canvas = $( id ).find( 'canvas' )[ 0 ];
			var ctx    = canvas.getContext( '2d', { willReadFrequently: true } );
			var c0     = canvas.width / 2;
			for ( var i = 0; i < 360; i += 0.25 ) {
				var rad         = i * Math.PI / 180;
				ctx.beginPath();
				ctx.moveTo( c0, c0 );
				ctx.lineTo( c0 + c0 * Math.cos( rad ), c0 + c0 * Math.sin( rad ) );
				ctx.strokeStyle = 'hsl('+ i +', 100%, 50%)';
				ctx.stroke();
			}
			return ctx
		}
	}
	
	var canvasW  = 230;
	var c0       = canvasW / 2;
	var box_wh   = 120;
	var box0     = ( canvasW - box_wh ) / 2;
	var box_br   = box0 + box_wh;
	var wheel_ri = 95;
	var wheel_w  = canvasW / 2 - wheel_ri;
	var wheel_rc = wheel_ri + wheel_w / 2;
	var hsl      = $( ':root' ).css( '--cm' ).replace( /[^0-9,]/g, '' ).split( ',' );
	hsl          = { h: +hsl[ 0 ], s: +hsl[ 1 ], l: +hsl[ 2 ] };
	V.ctx        = { base: pick.wheel( '#colorpick', canvasW ) };
	[ 'hue', 'sat' ].forEach( id => {
		$( '#colorpick' ).prepend( '<canvas id="'+ id +'" style="position: absolute; cursor: crosshair;" width="'+ canvasW +'" height="'+ canvasW +'"></canvas>' );
		V.ctx[ id ]             = $( '#'+ id )[ 0 ].getContext( '2d' );
		V.ctx[ id ].lineWidth   = 2;
		V.ctx[ id ].strokeStyle = '#fff';
	} );
	$( '#colorpick' ).on( 'touchstart mousedown', 'canvas', e => {
		V.drag = true;
		var x  = e.offsetX;
		var y  = e.offsetY;
		V.hue  =  x < box0 || x > box0 + box_wh || y < box0 || y >  + box_wh;
//		V.start = { x: x, y: y }
		V.ctx[ V.hue ? 'hue' : 'sat' ].clearRect( 0, 0, canvasW, canvasW );
		if ( V.hue ) pick.hsl( x, y, 'move' );
	} ).on( 'mousemove', 'canvas', e => {
		if ( ! V.drag ) return
		
		if ( V.hue ) pick.hsl( e.offsetX, e.offsetY, 'move' );
	} ).on( 'touchend mouseup', 'canvas', e => {
		V.drag = false;
		if ( ! V.hue ) pick.point( e.offsetX, e.offsetY );
		console.log(hsl)
	} );
	V.ctx.base.fillStyle = '#000';
	V.ctx.base.beginPath();
	V.ctx.base.arc( c0, c0, wheel_ri, 0, 2 * Math.PI );
	V.ctx.base.fill();
	// wheel point
	pick.gradient();
	pick.point( hsl.h, 'hue' );
	// box point
	var a, b, g, k, l, p, r, r_g_b, v, x, y;
	l = hsl.l / 100;
	a = hsl.s / 100 * Math.min( l, 1 - l );
	[ r, g, b ] = ( () => {
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
}
$( '#banner' ).after( '<div id="colorpick"></div>' );
colorPicker();
