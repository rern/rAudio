var X;

graph.flowchart = () => {
	var w0      = 1;   // box w
	var h0      = 0.5; // box h
	
	var p0      = w0 * 0.1    // frame padding; box border-radius p/2; arrow w: 2p h:p
	var x0      = 0 + w0 / 2; // box x-pos: margin-left w/2 (box @ 0, frame @  -p)
	var y0      = 0 - p0 * 2; // box y-pos: padding-top -2p (box @ 0, frame @ -2p)
	X           = {
		  W : $( '#pipeline' ).width()
		, w : w0
		, h : h0
		, p : p0
		, x : x0
		, y : y0
		, a : new Array( DEV.capture.channels ).fill( -x0 ) // arrow line x-pos: each channel
		, color  : {
			  Filter   : color.md
			, Capture  : '#000'
			, Mixer    : color.rd
			, Playback : color.gd
		}
		, box   : []
		, text  : []
		, arrow : []
	}
	var d3svg   = d3
					.select( $( '#pipeline' )[ 0 ] )
					.append( 'svg' )
					.attr( 'class',   'flowchart' )
					.lower();
//---------------------------------------------------------------------------------
	X.type      = 'Capture';
	add();
	X.x += X.w * 2;
//---------------------------------------------------------------------------------
	var pipL    = PIP.length;
	for ( var k = 0; k < pipL; k++ ) {
		var pip = PIP[ k ];
		X.type  = pip.type;
		if ( X.type === 'Filter' ) {
			pip.names.forEach( name => {
				pip.channels.forEach( ch => {
					addBox( name, X.h * 2 * ch, ch ); // y > down - each channel
				} );
				X.x += X.w * 2;                       // x > right
			} );
		} else {
			cL          = Math.max( ...Object.values( MIX[ pip.name ].channels ) );
			addFrame( pip.name, cL );
			var same_ch = false;
			var chs     = [];
			MIX[ pip.name ].mapping.forEach( m => {
				m.sources.forEach( s => {
					ch     = s.channel;
					if ( chs.includes( ch ) ) {
						same_ch = true;
						return
					}
					
					addBox( 'ch '+ ch, X.h * 2 * ch, ch ); // y > down - each channel
					chs.push( ch );
					if ( m.sources.length < 2 || ch === m.dest ) return
					
					var l  = X.arrow[ X.arrow.length - 1 ];
					var y0 = X.h / 2;
					var y1 = X.h * 2.5;
					[ [ y0, y1 ], [ y1, y0 ] ].forEach( y => { // cross arrow
						X.arrow.push( {
							  a0 : [ l.a0[ 0 ], y[ 0 ] ]
							, a1 : [ l.a1[ 0 ], y[ 1 ] ]
						} );
					} );
				} );
				if ( ! same_ch ) X.x += X.w * 2;           // x > right
			} );
		}
	}
//---------------------------------------------------------------------------------
	X.type      = 'Playback';
	add();
//---------------------------------------------------------------------------------
	var d3scale = d3
					.scaleLinear()
					.domain( [ 0, X.x + X.w + X.w / 2 ] ) // base  : last x + last box + margin
					.range(  [ 0, X.W ] );                // target: div width
	var d3arrow = d3
					.linkHorizontal()
					.source( d => [ d3scale( d.a0[ 0 ] ), d3scale( d.a0[ 1 ] ) ] )
					.target( d => [ d3scale( d.a1[ 0 ] ), d3scale( d.a1[ 1 ] ) ] );
	var a_h     = d3scale( X.p );
	var a_w     = a_h * 2;
	var a_pos   = [ [ 0, 0 ], [ 0, a_h ], [ a_w, a_h / 2 ] ];
	d3svg // arrow line
		.append( 'defs' )
		.append( 'marker' )
		.attr( 'id',          'head' )
		.attr( 'refX',         a_w )
		.attr( 'refY',         a_h / 2 )
		.attr( 'markerWidth',  a_w )
		.attr( 'markerHeight', a_h )
		.attr( 'fill',         color.w )
		.attr( 'stroke',       color.w )
		.append( 'path' )                // line
		.attr( 'd',            d3.line()( a_pos ) );
	d3svg // box
		.selectAll( 'rect' )
		.data( X.box )
		.enter()
		.append( 'rect' )
		.attr( 'x',       d => d3scale( d.x ) )
		.attr( 'y',       d => d3scale( d.y ) )
		.attr( 'width',   d => d3scale( d.w ) )
		.attr( 'height',  d => d3scale( d.h ) )
		.attr( 'rx',      d => d3scale( d.r ) )
		.style( 'fill',   d => d.f )
		.style( 'stroke', d => d.stroke );
	d3svg // arrow head
		.selectAll( null )
		.data( X.arrow )
		.join( 'path' )
		.attr( 'd',           d3arrow )
		.attr( 'marker-end', 'url(#head)' )
		.attr( 'fill',       'none' )
		.attr( 'stroke',      color.w );
	d3svg // text
		.selectAll( 'text' )
		.data( X.text )
		.enter()
		.append( 'text' )
		.text( d => d.t )
		.attr( 'font-family',       'Inconsolata' )
		.attr( 'fill',               color.wl )
		.attr( 'dominant-baseline', 'central' )
		.attr( 'transform',          d => 'translate('+ d3scale( d.x ) +', '+ d3scale( d.y ) +')' )
		.style( 'text-anchor',      'middle' );
	var $svg    = $( '#pipeline svg' );
	var y       = { 
		  top : $svg[ 0 ].getBoundingClientRect().top + 20
		, min : X.W
		, max : 0
	}
	$svg.find( 'text, rect' ).each( ( i, el ) => {
		y.el = el.getBoundingClientRect();
		if ( y.el.top < y.min ) y.min = y.el.top;
		if ( y.el.bottom > y.max ) y.max = y.el.bottom;
	} );
	y.h         = y.max - y.min + 40;
	$svg.attr( {
		  viewBox : '0 '+ ( y.min - y.top ) +' '+ X.W +' '+ y.h
		, width   : X.W
		, height  : y.h
	} ).css( 'margin', '10px 0' );
}

function add() {
	var cL = DEV[ X.type.toLowerCase() ].channels;
	addFrame( X.type, cL );
	for ( var ch = 0; ch < cL; ch++ ) addBox( 'ch '+ ch, X.h * 2 * ch, ch );
}
function addBox( lbl, y, ch ) {
	X.box.push( {
		  x : X.x
		, y : y
		, w : X.w
		, h : X.h
		, r : X.p / 2
		, f : X.color[ X.type ]
	} );
	var a0     = X.a[ ch ];
	X.a[ ch ] = a0 + X.w * 2;
	y         += X.h / 2;
	X.text.push( {
		  x : X.x + X.w / 2
		, y : y
		, t : lbl
	} );
	if ( X.type === 'Capture' ) return
	
	X.arrow.push( {
		  a0 : [ a0,  y ]
		, a1 : [ X.x, y ]
	} );
}
function addFrame( lbl, ch ) {
	X.box.push( {
		  x : X.x - X.p
		, y : -X.p
		, w : X.w + X.p * 2
		, h : X.h * ( ch * 2 - 1 ) + X.p * 2
		, r : X.p
		, f : color.gr
	} );
	X.text.push( {
		  x : X.x + X.w / 2
		, y : -X.h / 2 - X.p
		, t : lbl
	} );
}
