var FL = {
	  unit   : 1.4 // base unit: 1 = 40px
	, width  : 635
	, height : 300
	, color : {
		  filter : color.md
		, in     : '#000'
		, mixer  : color.rd
		, out    : color.gd
	}
}

graph.flowchart = () => {
	var ch         = Math.max( DEV.capture.channels, DEV.playback.channels );
	var vb_h       = FL.height / 4 * ch;            // boxH - @ ch/box = 1/4 h
	var vb         = { x: 25, y: ( FL.height - vb_h ) / 2, w: FL.width - 65, h: vb_h } // top  - move up: ( h - boxH - textH ) / 2
	var d3svg      = d3
						.select( $( '#pipeline' )[ 0 ] )
						.append( 'svg' )
						.attr( 'class',  'flowchart' )
						.lower()
						.attr( 'viewBox', vb.x +' '+ vb.y +' '+ vb.w +' '+ vb.h );
	FL.boxes       = [];
	FL.labels      = [];
	FL.links       = [];
	var spacing_h  = 2.75; // space between boxes
	var spacing_v  = 1;
	var stages     = [];
	var channels   = [];
	var c_channels = DEV.capture.channels;
	var max_v;
/**/appendFrame(
		  'Capture'
		, 0
		, spacing_v * c_channels
	);
	for ( n = 0; n < c_channels; n++ ) {
/**/	var io_points = appendBlock(
			  'ch '+ n
			, 0
			, spacing_v * ( -c_channels / 2 + 0.5 + n )
			, FL.color.in
		);
		channels.push( [ io_points ] );
	}
	stages.push( channels );
	max_v                = c_channels / 2 + 1;
	// loop through pipeline
	var pip_length = 0;
	var start      = 0;
	for ( n = 0; n < PIP.length; n++ ) {
		var step = PIP[ n ];
		if ( step.type === 'Mixer' ) {
			pip_length  += 1;
			var mixername  = step.name;
			var mixconf    = MIX[ mixername ];
			var o_channels = mixconf.channels.out;
			var m_channels = [];
			var x          = spacing_h * pip_length + 0.75;
/**/		appendFrame(
				mixername
				, x
				, spacing_v * o_channels
				);
			for ( m = 0; m < o_channels; m++ ) {
				m_channels.push( [] );
/**/			var io_points = appendBlock(
					  'ch '+ m
					, x
					, spacing_v * ( -o_channels / 2 + 0.5 + m )
					, FL.color.mixer
				);
				m_channels[ m ].push( io_points );
			}
			for ( m = 0; m < mixconf.mapping.length; m++ ) {
				var mapping = mixconf.mapping[ m ];
				var dest_ch = mapping.dest;
				for ( p = 0; p < mapping.sources.length; p++ ) {
					var src    = mapping.sources[ p ];
					var src_ch = src.channel;
					var label  = src.gain +'dB'+ ( src.inverted ? ' inv.' : '' );
					var srclen = stages[ stages.length - 1 ][ src_ch ].length;
					var src_p  = stages[ stages.length - 1 ][ src_ch ][ srclen - 1 ].output;
					var dest_p = m_channels[ dest_ch ][ 0 ].input;
/**/				appendLink( src_p, dest_p, label );
				}
			}
			stages.push( m_channels );
			start          = pip_length;
			max_v          = Math.max( max_v, o_channels / 2 + 1 );
		} else if ( step.type === 'Filter' ) {
			step.channels.forEach( ch_nbr => {
				for ( m = 0; m < step.names.length; m++ ) {
					var ch_step   = start + stages[ stages.length - 1 ][ ch_nbr ].length;
					pip_length  = Math.max( pip_length, ch_step );
/**/				var io_points = appendBlock(
						  step.names[ m ]
						, ch_step * spacing_h
						, spacing_v * ( -c_channels / 2 + 0.5 + ch_nbr )
						, FL.color.filter
					);
					var src_list  = stages[ stages.length - 1 ][ ch_nbr ];
					var src_p     = src_list[ src_list.length - 1 ].output;
					var dest_p    = io_points.input;
					stages[ stages.length - 1 ][ ch_nbr ].push( io_points );
/**/				appendLink( src_p, dest_p );
				}
			} );
		}
	}
	var p_channels = [];
	pip_length     = pip_length + 1;
	var max_h      = ( pip_length + 1 ) * spacing_h;
/**/appendFrame(
		  'Playback'
		, spacing_h * pip_length + 0.5
		, spacing_v * c_channels
	);
	for ( n = 0; n < c_channels; n++ ) {
/**/	var io_points = appendBlock(
			  'ch '+ n
			, spacing_h * pip_length + 0.5
			, spacing_v * (-c_channels / 2 + 0.5 + n)
			, FL.color.out
		);
		p_channels.push( [ io_points ] );
		var srclen    = stages[ stages.length - 1 ][ n ].length;
		var src_p     = stages[ stages.length - 1 ][ n ][ srclen - 1 ].output;
		var dest_p    = io_points.input;
/**/	appendLink( src_p, dest_p );
	}
	stages.push( p_channels );
	max_v          = max_h > 4 * max_v ? max_h / 4 : max_h = 4 * max_v
	var yScale     = d3
						.scaleLinear()
						.domain( [ -max_v, max_v ] )
						.range( [ 0, FL.height + 20 ] );
	var xScale     = d3
						.scaleLinear()
						.domain( [ -2, max_h ] )
						.range( [ 0, FL.width ] );
	var linkGen    = d3
						.linkHorizontal()
						.source( d => [ xScale( d.source[ 0 ] ), yScale( d.source[ 1 ] ) ] )
						.target( d => [ xScale( d.target[ 0 ] ), yScale( d.target[ 1 ] ) ] );
	var markerW    = 10;
	var markerH    = 6;
	var arrow_pos  = [
		  [ 0, 0 ]
		, [ 0, markerH ]
		, [ markerW, markerH / 2 ]
	];
	d3svg
		.append( 'defs' )
		.append( 'marker' )
		.attr( 'id',          'arrow' )
		.attr( 'refX',         markerW - 2 )
		.attr( 'refY',         markerH / 2 )
		.attr( 'markerWidth',  markerW )
		.attr( 'markerHeight', markerH )
		.attr( 'orient',       'auto-start-reverse' )
		.attr( 'fill',         color.w )
		.attr( 'stroke',       color.w )
		.append( 'path' )
		.attr( 'd', d3.line()( arrow_pos ) );
	d3svg
		.selectAll( 'rect' )
		.data( FL.boxes )
		.enter()
		.append( 'rect' )
		.attr( 'x',       d => xScale( d.x ) )
		.attr( 'y',       d => yScale( d.y ) )
		.attr( 'rx',      xScale( 0.1 ) - xScale( 0 ) )
		.attr( 'ry',      yScale( 0.1 ) - yScale( 0 ) )
		.attr( 'width',   d => xScale( d.width ) - xScale( 0 ) )
		.attr( 'height',  d => yScale( d.height ) - yScale( 0 ) )
		.style( 'fill',   d => d.fill )
		.style( 'stroke', d => d.stroke )
	d3svg
		.selectAll( null )
		.data( FL.links )
		.join( 'path' )
		.attr( 'd',          linkGen )
		.attr( 'marker-end', 'url(#arrow)' )
		.attr( 'fill',       'none' )
		.attr( 'stroke',      color.w );
	d3svg
		.selectAll( 'text' )
		.data( FL.labels )
		.enter()
		.append( 'text' )
		.text( d => d.text )
		.attr( 'font-family', 'Inconsolata' )
		.attr( 'font-size',    d => yScale( d.size ) - yScale( 0 ) +'px' )
		.attr( 'fill',         d => d.fill )
		.attr( 'transform',    d => 'translate('+ xScale( d.x ) +', '+ yScale( d.y ) +')' )
		.style( 'text-anchor', 'middle' )
	if ( $( '.flowchart rect' ).eq( 0 ).width() > 100 ) $( '.flowchart' ).css( 'width', '80%' );
}
function appendBlock( label, x, y, fill ) { // box
	var offset = FL.unit / 2; // offset arrow line
	FL.labels.push( {
		  x     : x
		, y     : y + 0.01
		, text  : label
		, fill  : color.wl
		, size  : 0.3
	} );
	FL.boxes.push( {
		  x      : x - FL.unit / 2
		, y      : y - FL.unit / 4
		, width  : FL.unit
		, height : FL.unit / 2.5
		, fill   : fill
	} );
	return {
		  output : { x: x + offset, y: y } // line out
		, input  : { x: x - ( offset + 0.05 ), y: y } // line in (arrow head)
	}
}
function appendFrame( label, x, height ) { // in, mixer, out container
	FL.labels.push( {
		  x     : x
		, y     : -height / 2 - 0.2
		, text  : label
		, fill  : color.wl
		, size  : 0.3
	} );
	FL.boxes.push( {
		  x      : x - 0.7 * 1.5
		, y      : -height / 2
		, width  : FL.unit * 1.5
		, height : height - 0.1
		, fill   : color.gr
	} );
}
function appendLink( source, dest, label ) { // line
	if ( label ) { // less value = move left/up
		if ( dest.y <= source.y ) { // flat line
			var x = ( 2 * source.x ) / 3 + dest.x / 3;
			var y = ( 2 * source.y ) / 3 + dest.y / 3 - 0.2;
		} else { // slope line
			var x = source.x / 3 + ( 2 * dest.x ) / 3;
			var y = source.y / 3 + ( 2 * dest.y ) / 3;
		}
		FL.labels.push( {
			  x     : x
			, y     : y
			, text  : label
			, fill  : color.r
			, size  : 0.25
		} );
	}
	FL.links.push( {
		  source : [ source.x, source.y - 0.08 ]
		, target : [ dest.x, dest.y - 0.08 ]
	} );
}
