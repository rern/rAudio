var FL = {
	  width  : 635
	, height : 300
	, color : {
		  filter : color.md
		, in     : '#000'
		, mixer  : color.rd
		, out    : color.gd
	}
}

function appendBlock( label, x, y, fill ) { // box
	var wx     = 1.4;         // common scale
	var offset = wx/2 + 0.05; // offset arrow line
	FL.labels.push( {
		  x     : x
		, y     : y + 0.1
		, text  : label
		, fill  : color.wl
		, size  : 0.3
		, angle : 0
	} );
	FL.boxes.push( {
		  x      : x - wx/2
		, y      : y - wx/4
		, width  : wx
		, height : wx/2
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
		, angle : 0
	} );
	FL.boxes.push( {
		  x      : x - 0.7 * 1.5
		, y      : -height / 2
		, width  : 1.5 * 1.4
		, height : height
		, fill   : color.gr
	} );
}
function appendLink( source, dest, label ) { // line
	if ( label ) { // less value = move left/up
		if ( dest.y <= source.y ) { // flat line
			var x = ( 2 * source.x ) / 3 + dest.x / 3 + 0.2;
			var y = ( 2 * source.y ) / 3 + dest.y / 3 - 0.1;
		} else { // slope line
			var x = source.x / 3 + ( 2 * dest.x ) / 3;
			var y = source.y / 3 + ( 2 * dest.y ) / 3 - 0.4;
		}
		FL.labels.push( {
			  x     : x
			, y     : y
			, text  : label
			, fill  : color.r
			, size  : 0.25
			, angle : 0
		} );
	}
	FL.links.push( {
		  source : [ source.x, source.y ]
		, target : [ dest.x, dest.y ]
	} );
}
function deviceText( device ) {
	if ( 'device' in device ) {
		var key = 'device';
	} else if ( 'filename' in device) {
		var key = 'filename';
	} else {
		var key = 'type';
	}
	return device[ key ]
}
function createPipelinePlot() {
	var ch               = DEV.capture.channels > DEV.playback.channels ? DEV.capture.channels : DEV.playback.channels;
	var vb_h             = FL.height / 4 * ch;            // boxH - @ ch/box = 1/4 h
	var vb               = { x: 30, y: ( FL.height - vb_h - 20 ) / 2, w: FL.width - 90, h: vb_h } // top  - move up: ( h - boxH - textH ) / 2
	$( '#divpipeline .entries.main' ).before(
		'<svg class="flowchart" xmlns="http://www.w3.org/2000/svg" viewBox="'+ vb.x +' '+ vb.y +' '+ vb.w +' '+ vb.h +'"></svg>'
	);
	var d3svg            = d3.select( $( '#pipeline .flowchart' )[ 0 ] );
	
	FL.boxes             = [];
	FL.labels            = [];
	FL.links             = [];
	var spacing_h        = 2.75; // space between boxes
	var spacing_v        = 1;
	var stages           = [];
	var channels         = [];
	var active_channels  = DEV.capture.channels;
	var max_v;
	appendFrame(
		deviceText( DEV.capture )
		, 0
		, spacing_v * active_channels
	);
	for ( n = 0; n < active_channels; n++ ) {
		var io_points = appendBlock(
			  'ch '+ n
			, 0
			, spacing_v * ( -active_channels / 2 + 0.5 + n )
			, FL.color.in
		);
		channels.push( [ io_points ] );
	}
	stages.push( channels );
	max_v                = active_channels / 2 + 1;
	// loop through pipeline
	var total_length     = 0;
	var stage_start      = 0;
	for ( n = 0; n < PIP.length; n++ ) {
		var step = PIP[ n ];
		if ( step.type === 'Mixer' ) {
			total_length     += 1;
			var mixername     = step.name;
			var mixconf       = MIX[ mixername ];
			active_channels   = mixconf.channels.out;
			var mixerchannels = [];
			var x             = spacing_h * total_length + 0.75;
			appendFrame(
				mixername
				, x
				, spacing_v * active_channels
				);
			for ( m = 0; m < active_channels; m++ ) {
				mixerchannels.push( [] );
				var io_points = appendBlock(
					  'ch '+ m
					, x
					, spacing_v * ( -active_channels / 2 + 0.5 + m )
					, FL.color.mixer
				);
				mixerchannels[ m ].push( io_points );
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
					var dest_p = mixerchannels[ dest_ch ][ 0 ].input;
					appendLink( src_p, dest_p, label );
				}
			}
			stages.push( mixerchannels );
			stage_start = total_length;
			max_v       = Math.max( max_v, active_channels / 2 + 1 );
		} else if ( step.type === 'Filter' ) {
			step.channels.forEach( ch_nbr => {
				for ( m = 0; m < step.names.length; m++ ) {
					var ch_step   = stage_start + stages[ stages.length - 1 ][ ch_nbr ].length;
					total_length  = Math.max( total_length, ch_step );
					var io_points = appendBlock(
						  step.names[ m ]
						, ch_step * spacing_h
						, spacing_v * ( -active_channels / 2 + 0.5 + ch_nbr )
						, FL.color.filter
					);
					var src_list  = stages[ stages.length - 1 ][ ch_nbr ];
					var src_p     = src_list[ src_list.length - 1 ].output;
					var dest_p    = io_points.input;
					stages[ stages.length - 1 ][ ch_nbr ].push( io_points );
					appendLink( src_p, dest_p );
				}
			} );
		}
	}
	var playbackchannels = [];
	total_length         = total_length + 1;
	var max_h            = ( total_length + 1 ) * spacing_h;
	appendFrame(
		  deviceText( DEV.playback )
		, spacing_h * total_length
		, spacing_v * active_channels
	);
	for ( n = 0; n < active_channels; n++ ) {
		var io_points = appendBlock(
			  'ch '+ n
			, spacing_h * total_length
			, spacing_v * (-active_channels / 2 + 0.5 + n)
			, FL.color.out
		);
		playbackchannels.push( [ io_points ] );
		var srclen    = stages[ stages.length - 1 ][ n ].length;
		var src_p     = stages[ stages.length - 1 ][ n ][ srclen - 1 ].output;
		var dest_p    = io_points.input;
		appendLink( src_p, dest_p );
	}
	stages.push( playbackchannels );
	max_v = max_h > 4 * max_v ? max_h / 4 : max_h = 4 * max_v
	var yScale           = d3
							.scaleLinear()
							.domain( [ -max_v, max_v ] )
							.range( [ 0, FL.height ] );
	var xScale           = d3
							.scaleLinear()
							.domain( [ -2, max_h ] )
							.range( [ 0, FL.width ] );
	var linkGen          = d3
							.linkHorizontal()
							.source( d => [ xScale( d.source[ 0 ] ), yScale( d.source[ 1 ] ) ] )
							.target( d => [ xScale( d.target[ 0 ] ), yScale( d.target[ 1 ] ) ] );
	var markerBoxWidth   = 9;
	var markerBoxHeight  = 6;
	var refX             = markerBoxWidth - 2;
	var refY             = markerBoxHeight / 2;
	var arrowPoints      = [
		  [ 0, 0 ]
		, [ 0, markerBoxHeight ]
		, [ markerBoxWidth, markerBoxHeight / 2 ]
	];
	d3svg
		.append( 'defs' )
		.append( 'marker' )
		.attr( 'id', 'arrow' )
		// @ts-ignore
		.attr( 'refX', refX )
		.attr( 'refY', refY )
		.attr( 'markerWidth', markerBoxWidth )
		.attr( 'markerHeight', markerBoxHeight )
		.attr( 'orient', 'auto-start-reverse' )
		.attr( 'fill', color.w )
		.attr( 'stroke', color.w )
		.append( 'path' )
		// @ts-ignore
		.attr( 'd', d3.line()( arrowPoints ) );
	var rects = d3svg
					.selectAll( 'rect' )
					.data( FL.boxes )
					.enter()
					.append( 'rect' );
	rects
		.attr( 'x', d => xScale( d.x ) )
		.attr( 'y', d => yScale( d.y ) )
		.attr( 'rx', xScale( 0.1 ) - xScale( 0 ) )
		.attr( 'ry', yScale( 0.1 ) - yScale( 0 ) )
		.attr( 'width', d => xScale( d.width ) - xScale( 0 ) )
		.attr( 'height', d => yScale( d.height ) - yScale( 0 ) )
		.style( 'fill', d => d.fill )
		.style( 'stroke', d => d.stroke )
	var text = d3svg
					.selectAll( 'text' )
					.data( FL.labels )
					.enter()
					.append( 'text' );
	//Add SVG Text Element Attributes
	text
		.text( d => d.text )
		.attr( 'font-size', d => yScale( d.size ) - yScale( 0 ) +'px' )
		.attr( 'fill', d => d.fill )
		.style( 'text-anchor', 'middle' )
		.attr( 'transform', d => 'translate('+ xScale( d.x ) +', '+ yScale( d.y ) +'), rotate('+ d.angle +')' )
	d3svg
		.selectAll( null )
		.data( FL.links )
		.join( 'path' )
		// @ts-ignore
		.attr( 'd', linkGen )
		.attr( 'marker-end', 'url(#arrow)' )
		.attr( 'fill', 'none' )
		.attr( 'stroke', color.w );
	if ( $( '.flowchart rect' ).eq( 0 ).width() > 85 ) $( '.flowchart' ).css( 'width', '80%' );
}
