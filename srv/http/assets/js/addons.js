function sendcommand() {
	j++;
	if ( j < olength ) {
		getoptions();
	} else {
		postcmd();
	}
}
// post submit with temporary form
function postcmd() {
	var form = '<form id="formtemp" action="/settings/addons-progress.php" method="post">';
	var optL = opt.length;
	for ( i = 0; i < optL; i++ ) { // [ branch, alias, type, opt1, opt2, ... ]
		form += '<input type="hidden" name="sh[]" value="'+ opt[ i ] +'">'
	}
	form += '</form>';
	$( 'body' ).append( form );
	$( '#formtemp' ).submit();
	banner( 'Addons', 'Download files ...', 'jigsaw blink', -1 );
}
//---------------------------------------------------------------------------
data = {}
$( '#close' ).click( function() {
	location.href = '/';
} );
// revision show/hide
$( '.revision' ).click( function(e) {
	e.stopPropagation();
	$( this ).parent().parent().next().toggle();
	$( this ).toggleClass( 'revisionup' );
} );
// sroll up click
$( '#list li' ).click( function() {
	var alias = this.getAttribute( 'alias' );
	$( 'html, body' ).scrollTop( $( '#'+ alias ).offset().top - 50 );
} );
// sroll top
$( 'legend' ).click( function() {
	$( 'html, body' ).scrollTop( 0 );
} );

// branch test
function branchtest( alias, type, message, install ) {
	info( {
		  icon      : 'jigsaw'
		, title     : title
		, message   : message
		, textlabel : 'Tree #/Branch'
		, textvalue : 'UPDATE'
		, boxwidth  : 'max'
		, ok        : function() {
			opt = [ alias, type, $( '#infoTextBox' ).val() ];
			option = addons[ alias ].option;
			j = 0;
			if ( install && option ) {
				getoptions();
			} else {
				postcmd();
			}
		}
	} );
}
$( '.boxed-group .btn' ).on( 'taphold', function () {
	$this = $( this );
	alias = $this.parent().attr( 'alias' );
	title = addons[ alias ].title.replace( / *\**$/, '' );
	type = $this.text();
	rollback = addons[ alias ].rollback || '';
	if ( rollback ) {
		info( {
			  icon      : 'jigsaw'
			, title     : title
			, message   : 'Upgrade / Downgrade ?'
			, radiohtml : '<label><input type="radio" name="inforadio" value="1" checked>&ensp;Rollback to previous version</label><br>'
						 +'<label><input type="radio" name="inforadio" value="Branch">&ensp;Tree # / Branch ...</label>'
			, ok        : function() {
				if ( $( '#infoRadio input:checked').val() == 1 ) {
					opt = [ alias, type, rollback ];
					postcmd();
				} else {
					branchtest( alias, type, 'Upgrade / Downgrade to ?' );
				}
			}
		} );
	} else if ( type === 'Install' ) {
		branchtest( alias, type, 'Install version?', 'install' );
	} else {
		branchtest( alias, type, 'Install version?' );
	}
} ).on( 'click', function () {
	$this = $( this );
	if ( $this.hasClass( 'disabled' ) ) return
	
	alias = $this.parent().attr( 'alias' );
	title = addons[ alias ].title.replace( / *\**$/, '' );
	type = $this.text();
	opt = [ alias, type, 'main' ];
	if ( $this.attr( 'warning' ) ) {
		info( {
			  icon    : 'jigsaw'
			, title   : title
			, message : $( this ).attr( 'warning' )
		} );
		return
	}
	
	option = addons[ alias ].option;
	j = 0;
	if ( option && type !== 'Update' && type !== 'Uninstall' ) {
		getoptions();
	} else {
		info( {
			  icon    : 'jigsaw'
			, title   : title
			, message : type +'?'
			, ok      : function () {
				( option && type !== 'Update' && type !== 'Uninstall' ) ? getoptions() : postcmd();
			}
		} );
	}
} );
$( '.thumbnail' ).click( function() {
	$sourcecode = $( this ).prev().find('form a').attr( 'href');
	if ( $sourcecode ) window.open( $sourcecode, '_self' );
} );

function getoptions() {
	okey = Object.keys( option );
	olength = okey.length;
	oj = okey[ j ];
	oj0 = oj.replace( /[0-9]/, '' ); // remove trailing # from option keys
	switch( oj0 ) {
// -------------------------------------------------------------------------------------------------
		case 'wait': // only 1 'Ok' = continue
			info( {
				  icon    : 'jigsaw'
				, title   : title
				, message : option[ oj ]
				, oklabel : 'Continue'
				, ok      : sendcommand
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'confirm': // 'Cancel' = close
			info( {
				  icon    : 'jigsaw'
				, title   : title
				, message : option[ oj ]
				, oklabel : 'Continue'
				, ok      : sendcommand
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'yesno': // 'Cancel' = 0
			var ojson = option[ oj ];
			info( {
				  icon        : 'jigsaw'
				, title       : title
				, message     : ojson.message
				, buttonlabel : 'No'
				, button      : function() {
					opt.push( 0 );
					sendcommand();
				}
				, ok          : function() {
					opt.push( 1 );
					sendcommand();
				}
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'skip': // 'Cancel' = continue, 'Ok' = skip options
			info( {
				  icon        : 'jigsaw'
				, title       : title
				, message     : option[ oj ]
				, cancellabel : 'No'
				, cancel      : sendcommand
				, oklabel     : 'Yes'
				, ok          : postcmd
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'text':
			var ojson = option[ oj ];
			info( {
				  icon      : 'jigsaw'
				, title     : title
				, message   : ojson.message
				, textlabel : ojson.label
				, textvalue : ojson.value
				, boxwidth  : ojson.width
				, ok        : function() {
					var input = '';
					$( '.infotextbox .infoinput' ).each( function() {
						var input = this.value;
						opt.push( input || 0 );
					} );
					sendcommand();
				}
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'password':
			ojson = option[ oj ];
			info( {
				  icon          : 'jigsaw'
				, title         : title
				, message       : ojson.message
				, passwordlabel : ojson.label
				, ok:          function() {
					var pwd = $( '#infoPasswordBox' ).val();
					if ( pwd ) {
						verifyPassword( title, pwd, function() {
							opt.push( pwd );
							sendcommand();
						} );
					} else {
						if ( !ojson.required ) {
							opt.push( 0 );
							sendcommand();
						} else {
							blankPassword( title, ojson.message, ojson.label, function() {
								opt.push( pwd );
								sendcommand();
							} );
						}
					}
				}
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'radio': // single value
			ojson = option[ oj ];
			info( {
				  icon    : 'jigsaw'
				, title   : title
				, message : ojson.message
				, radio   : ojson.list
				, checked : ojson.checked
				, ok      : function() {
					var radiovalue = $( '#infoRadio input:checked' ).val();
					opt.push( radiovalue );
					sendcommand();
				}
			} );
			$( '#infoRadio input' ).change( function() { // cutom value
				if ( $( this ).val() === '?' ) {
					info( {
						  icon      : 'jigsaw'
						, title     : title
						, message   : ojson.message
						, textlabel : 'Custom'
						, ok        : function() {
							opt.push( $( '#infoTextBox' ).val() );
							sendcommand();
						}
					} );
				}
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'select': // long single value
			ojson = option[ oj ];
			info( {
				  icon        : 'jigsaw'
				, title       : title
				, message     : ojson.message
				, selectlabel : ojson.label
				, select      : ojson.list
				, checked     : ojson.checked
				, boxwidth    : ojson.width
				, preshow     : function() {
					$( '#infoSelectBox').selectric();
				}
				, ok          : function() {
					opt.push( $( '#infoSelectBox').val() );
					sendcommand();
				}
			} );
			$( '#infoSelectBox' ).change( function() { // cutom value
				if ( $( '#infoSelectBox :selected' ).val() === '?' ) {
					info( {
						  icon      : 'jigsaw'
						, title     : title
						, message   : ojson.message
						, textlabel : 'Custom'
						, ok        : function() {
							var input = $( '#infoTextBox' ).val();
							opt.push( input || 0 );
							sendcommand();
						}
					} );
				}
			} );
			break;
// -------------------------------------------------------------------------------------------------
		case 'checkbox': // multiple values
			ojson = option[ oj ];
			info( {
				  icon     : 'jigsaw'
				, title    : title
				, message  : ojson.message
				, checkbox : ojson.list
				, checked  : ojson.checked
				, ok       : function() {
					$( '#infoCheckBox input' ).each( function() {
						opt.push( $( this ).prop( 'checked' ) ? 1 : 0 );
					} );
					sendcommand();
				}
			} );
			break;
// -------------------------------------------------------------------------------------------------
	}
}
