var currentlyrics = '';
var lyrics = '';
var lyricsArtist = '';
var lyricsTitle = '';
var lyricshtml = '';

$( function() { //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

$( '#lyricsartist' ).click( function() {
	getBio( $( this ).text() );
} );
$( '#song, #guide-lyrics' ).tap( function() {
	var artist = G.status.Artist;
	var title = G.status.Title;
	if ( !artist || !title ) return;
	
	if ( artist === lyricsArtist && title === lyricsTitle && lyrics ) {
		lyricsShow();
		return
	}
	
/*	var file = G.status.file;
	if ( G.status.player === 'mpd' && file.slice( 0, 4 ) === 'http' ) {
		if ( title.indexOf( ': ' ) !== -1 ) {
			var artist_title = title.split( ': ' );
		} else {
			var artist_title = title.split( ' - ' );
		}
		var artist = artist_title[ 0 ].trim();
		var title = artist_title[ 1 ].trim();
	}*/
	artist = artist.replace( /(["`])/g, '\\$1' );
	title = title.replace( /(["`])/g, '\\$1' );
	bash( [ 'lyrics', artist, title, 'local' ], function( data ) {
		if ( data ) {
			var lyrics_title = data.split( '^^' );
			lyricsTitle = lyrics_title[ 0 ];
			lyricsArtist = artist;
			lyricsShow( lyrics_title[ 1 ] );
			return
		}
		
		var infojson = {
			  icon        : 'lyrics'
			, title       : 'Bio / Lyrics'
			, width       : 500
			, textlabel   : [ '<i class="fa fa-artist wh"></i>', '<i class="fa fa-music wh"></i>' ]
			, textvalue   : [ artist, title ]
			, textalign   : 'center'
			, boxwidth    : 'max'
			, buttonwidth : 1
			, buttonlabel : '<i class="fa fa-bio wh"></i>Bio'
			, button      : function() {
				if ( $( '#bio legend' ).text() != G.status.Artist ) {
					getBio( $( '#infoTextBox' ).val() );
				} else {
					$( '#bar-top, #bar-bottom' ).addClass( 'hide' );
					$( '#bio' ).removeClass( 'hide' );
					loader( 'hide' );
				}
			}
			, oklabel     : '<i class="fa fa-lyrics wh"></i>Lyrics'
			, ok          : function() {
				lyricsArtist = $( '#infoTextBox' ).val();
				lyricsTitle = $( '#infoTextBox1' ).val();
				getLyrics();
			}
		}
		if ( title.slice( -1 ) === ')' ) {
			querytitle = title.replace( / $| \(.*$/, '' );
			infojson.textvalue = [ artist, querytitle ];
			infojson.checkbox  = { 'Title with parentheses content': 0 }
			infojson.preshow   = function() {
				$( '#infoCheckBox input' ).change( function() {
					$( '#infoTextBox1' ).val( $( this ).prop( 'checked' ) ? title : querytitle );
				} );
			}
		}
		info( infojson );
	} );
} );
$( '#lyricstextarea' ).on( 'input', function() {
	$( '#lyricsundo, #lyricssave' ).removeClass( 'hide' );
	$( '#lyricsback' ).addClass( 'hide' );
} );
$( '#lyricsedit' ).click( function() {
	var lyricstop = $( '#lyricstext' ).scrollTop();
	if ( !currentlyrics ) currentlyrics = lyrics;
	$( '#lyricseditbtngroup' ).removeClass( 'hide' );
	$( '#lyricsedit, #lyricstextoverlay' ).addClass( 'hide' );
	if ( lyrics !== '(Lyrics not available.)' ) {
		$( '#lyricstextarea' ).val( currentlyrics ).scrollTop( lyricstop );
	} else {
		$( '#lyricstextarea' ).val( '' );
	}
} );
$( '#lyricsclose' ).click( function() {
	if ( $( '#lyricstextarea' ).val() === currentlyrics || $( '#lyricstextarea' ).val() === '' ) {
		lyricsHide();
	} else {
		info( {
			  icon     : 'lyrics'
			, title    : 'Lyrics'
			, message  : 'Discard changes made to this lyrics?'
			, ok       : lyricsHide
		} );
	}
} );
$( '#lyricsback' ).click( function() {
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyricsedit, #lyricstextoverlay' ).removeClass( 'hide' );
} );
$( '#lyricsundo' ).click( function() {
	info( {
		  icon     : 'lyrics'
		, title    : 'Lyrics'
		, message  : 'Discard changes made to this lyrics?'
		, ok       : function() {
			$( '#lyricstextarea' ).val( currentlyrics );
			$( '#lyricsundo, #lyricssave' ).addClass( 'hide' );
			$( '#lyricsback' ).removeClass( 'hide' );
		}
	} );
} );
$( '#lyricssave' ).click( function() {
	if ( $( '#lyricstextarea' ).val() === currentlyrics ) return;
	
	info( {
		  icon     : 'lyrics'
		, title    : 'Lyrics'
		, message  : 'Save this lyrics?'
		, ok       : function() {
			var newlyrics = $( '#lyricstextarea' ).val();
			var artist = $( '#lyricsartist' ).text();
			var title = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'save', newlyrics.replace( /\n/g, '^' ) ] ); // keep lirics single line
			lyricstop = $( '#lyricstextarea' ).scrollTop();
			currentlyrics = newlyrics;
			lyricsShow( newlyrics );
			$( '#lyricseditbtngroup' ).addClass( 'hide' );
			$( '#lyricsedit, #lyricstextoverlay' ).removeClass( 'hide' );
		}
	} );
} );	
$( '#lyricsdelete' ).click( function() {
	info( {
		  icon    : 'lyrics'
		, title   : 'Lyrics'
		, message : 'Delete this lyrics?'
		, oklabel : '<i class="fa fa-minus-circle"></i>Delete'
		, okcolor : red
		, ok      : function() {
			var artist = $( '#lyricsartist' ).text();
			var title = $( '#lyricstitle' ).text();
			bash( [ 'lyrics', artist, title, 'delete' ] );
			lyrics = '';
			currentlyrics = '';
			lyricsHide();
		}
	} );
} );

} ); //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

htmlEscape = function( str ) {
	return str
		.trim()
		.replace( /'|"/g, '' );
}
getLyrics = function() {
	bash( [ 'lyrics', lyricsArtist, lyricsTitle ], function( data ) {
		lyricsShow( data );
	} );
	banner( 'Lyrics', 'Fetch ...', 'search blink', 20000 );
}
lyricsShow = function( data ) {
	currentlyrics = data;
	var lyricshtml = data ? data.replace( /\n/g, '<br>' ) +'<br><br><br>·&emsp;·&emsp;·' : '(Lyrics not available.)';
	$( '#lyricstitle' ).text( lyricsTitle );
	$( '#lyricsartist' ).text( lyricsArtist );
	$( '#lyricstext' ).html( lyricshtml );
	var bars = G.status ? G.bars : !$( '#bar-top' ).hasClass( 'hide' );
	$( '#lyrics' )
		.css( {
			  top    : ( bars ? '' : 0 )
			, height : ( bars ? '' : '100vh' )
		} )
		.removeClass( 'hide' );
	$( '#lyricstext' ).scrollTop( 0 );
	if ( bars ) $( '#bar-bottom' ).addClass( 'lyrics-bar-bottom' );
	bannerHide();
}
lyricsHide = function() {
	currentlyrics = '';
	$( '#lyricstext' ).empty();
	$( '#lyricstextarea' ).val( '' );
	$( '#lyricsedit, #lyricstextoverlay' ).removeClass( 'hide' );
	$( '#lyricseditbtngroup' ).addClass( 'hide' );
	$( '#lyrics' ).addClass( 'hide' );
	if ( G.bars || !$( '#bar-top' ).hasClass( 'hide' ) ) $( '#bar-bottom' ).removeClass( 'lyrics-bar-bottom' );
}
