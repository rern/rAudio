const width  = 565;
const height = 300;
const bg     = {
	  filter : color.md
	, in     : '#000'
	, mixer  : color.rd
	, out    : color.gd
}
let boxes    = [];
let labels   = [];
let links    = [];

function appendBlock( label, x, y, fill ) { // box
/**/const wx     = 1.4;         // common scale
/**/const offset = wx/2 + 0.05; // offset arrow line
	labels.push( {
		  x     : x
		, y     : y + 0.1
		, text  : label
		, fill  : color.wl
		, size  : 0.3
		, angle : 0
	} );
	boxes.push( {
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
	labels.push( {
		  x     : x
		, y     : -height / 2 - 0.2
		, text  : label
		, fill  : color.wl
		, size  : 0.3
		, angle : 0
	} );
	boxes.push( {
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
		labels.push( {
			  x     : x
			, y     : y
			, text  : label
			, fill  : color.r
			, size  : 0.25
			, angle : 0
		} );
	}
	links.push( {
		  source : [ source.x, source.y ]
		, target : [ dest.x, dest.y ]
	} );
}
function deviceText( device ) {
	var key = 'type';
	if ( 'device' in device ) {
		key = 'device';
	} else if ( 'filename' in device) {
		key = 'filename';
	}
	return device [ key ]
}
function makeShapes( conf ) {
	const spacing_h     = 2.75; // space between boxes
	const spacing_v     = 1;
	let max_v;
	labels              = [];
	boxes               = [];
	links               = [];
	const stages        = [];
	const channels      = [];
	const capture       = conf.devices.capture;
	let active_channels = capture.channels;
	appendFrame(
		deviceText( capture )
		, 0
		, spacing_v * active_channels
	);
	for ( let n = 0; n < active_channels; n++ ) {
		const io_points = appendBlock(
			  'ch '+ n
			, 0
			, spacing_v * ( -active_channels / 2 + 0.5 + n )
			, bg.in
		);
		channels.push( [ io_points ] );
	}
	stages.push( channels );
	max_v               = active_channels / 2 + 1;
	// loop through pipeline
	let total_length    = 0;
	let stage_start     = 0;
	for ( let n = 0; n < conf.pipeline.length; n++ ) {
		const step = conf.pipeline[ n ];
		if ( step.type === 'Mixer' ) {
			total_length       += 1;
			const mixername     = step.name;
			const mixconf       = conf.mixers[ mixername ];
			active_channels     = mixconf.channels.out;
			const mixerchannels = [];
			const x             = spacing_h * total_length + 0.75;
			appendFrame(
				mixername
				, x
				, spacing_v * active_channels
				);
			for ( let m = 0; m < active_channels; m++ ) {
				mixerchannels.push( [] );
				const io_points = appendBlock(
					  'ch '+ m
					, x
					, spacing_v * ( -active_channels / 2 + 0.5 + m )
					, bg.mixer
				);
				mixerchannels[ m ].push( io_points );
			}
			for ( let m = 0; m < mixconf.mapping.length; m++ ) {
				const mapping = mixconf.mapping[ m ];
				const dest_ch = mapping.dest;
				for ( let p = 0; p < mapping.sources.length; p++ ) {
					const src    = mapping.sources[ p ];
					const src_ch = src.channel;
					const label  = src.gain +'dB'+ ( src.inverted ? ' inv.' : '' );
					const srclen = stages[ stages.length - 1 ][ src_ch ].length;
					const src_p  = stages[ stages.length - 1 ][ src_ch ][ srclen - 1 ].output;
					const dest_p = mixerchannels[ dest_ch ][ 0 ].input;
					appendLink( src_p, dest_p, label );
				}
			}
			stages.push( mixerchannels );
			stage_start = total_length;
			max_v       = Math.max( max_v, active_channels / 2 + 1 );
		} else if ( step.type === 'Filter' ) {
			step.channels.forEach( ch_nbr => {
				for ( let m = 0; m < step.names.length; m++ ) {
					const ch_step   = stage_start + stages[ stages.length - 1 ][ ch_nbr ].length;
					total_length    = Math.max( total_length, ch_step );
					const io_points = appendBlock(
						  step.names[ m ]
						, ch_step * spacing_h
						, spacing_v * ( -active_channels / 2 + 0.5 + ch_nbr )
						, bg.filter
					);
					const src_list  = stages[ stages.length - 1 ][ ch_nbr ];
					const src_p     = src_list[ src_list.length - 1 ].output;
					const dest_p    = io_points.input;
					stages[ stages.length - 1 ][ ch_nbr ].push( io_points );
					appendLink( src_p, dest_p );
				}
			} );
		}
	}
	const playbackchannels = [];
	total_length           = total_length + 1;
	const max_h            = ( total_length + 1 ) * spacing_h;
	appendFrame(
		  deviceText( conf.devices.playback )
		, spacing_h * total_length
		, spacing_v * active_channels
	);
	for ( let n = 0; n < active_channels; n++ ) {
		const io_points = appendBlock(
			  'ch '+ n
			, spacing_h * total_length
			, spacing_v * (-active_channels / 2 + 0.5 + n)
			, bg.out
		);
		playbackchannels.push( [ io_points ] );
		const srclen    = stages[ stages.length - 1 ][ n ].length;
		const src_p     = stages[ stages.length - 1 ][ n ][ srclen - 1 ].output;
		const dest_p    = io_points.input;
		appendLink( src_p, dest_p );
	}
	stages.push( playbackchannels );
	return { labels, boxes, links, max_h, max_v }
}
function createPipelinePlot() {
	var $flowchart        = $( '#pipeline .flowchart' );
/**/const config          = S.config;
/**/const node            = $flowchart[ 0 ];
	let { labels, boxes, links, max_h, max_v } = makeShapes( config );
	max_v = max_h > 4 * max_v ? max_h / 4 : max_h = 4 * max_v
	const yScale          = d3
					.scaleLinear()
					.domain( [ -max_v, max_v ] )
					.range( [ 0, height ] );
	const xScale          = d3
					.scaleLinear()
					.domain( [ -2, max_h ] )
					.range( [ 0, width ] );
	const linkGen         = d3
					.linkHorizontal()
					.source( d => [ xScale( d.source[ 0 ] ), yScale( d.source[ 1 ] ) ] )
					.target( d => [ xScale( d.target[ 0 ] ), yScale( d.target[ 1 ] ) ] );
	const markerBoxWidth  = 9;
	const markerBoxHeight = 6;
	const refX            = markerBoxWidth - 2;
	const refY            = markerBoxHeight / 2;
	const arrowPoints     = [
		  [ 0, 0 ]
		, [ 0, markerBoxHeight ]
		, [ markerBoxWidth, markerBoxHeight / 2 ]
	];
	d3
		.select( node )
		.append( 'defs' )
		.append( 'marker' )
		.attr( 'id', 'arrow' )
		// @ts-ignore
		.attr( 'viewBox', [ 0, 0, markerBoxWidth, markerBoxHeight + 1 ] )
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
	const rects = d3
					.select( node )
					.selectAll( 'rect' )
					.data( boxes )
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
	const text = d3
					.select( node )
					.selectAll( 'text' )
					.data( labels )
					.enter()
					.append( 'text' );
	//Add SVG Text Element Attributes
	text
		.text( d => d.text )
		.attr( 'font-size', d => yScale( d.size ) - yScale( 0 ) +'px' )
		.attr( 'fill', d => d.fill )
		.style( 'text-anchor', 'middle' )
		.attr( 'transform', d => 'translate('+ xScale( d.x ) +', '+ yScale( d.y ) +'), rotate('+ d.angle +')' )
	d3
		.select( node )
		.selectAll( null )
		.data( links )
		.join( 'path' )
		// @ts-ignore
		.attr( 'd', linkGen )
		.attr( 'marker-end', 'url(#arrow)' )
		.attr( 'fill', 'none' )
		.attr( 'stroke', color.w );
		
	$flowchart.removeAttr( 'style' );
	var wmax = elw = 0;
	$( '.flowchart rect' ).each( ( i, el ) => {
		elw = el.getBoundingClientRect().width;
		if ( elw > wmax ) wmax = elw;
	} );
	if ( wmax > 85 ) $( '.flowchart' ).width( 85 / wmax * 658 );
}
