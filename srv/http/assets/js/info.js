/*
simple usage: 
info( 'message' );

normal usage:
info( {                                     // default
	width         : N                       // 400            (info width)
	icon          : 'NAME'                  // 'question'     (top icon)
	title         : 'TITLE'                 // 'Information'  (top title)
	nox           : 1                       // (show)         (no top 'X' close button)
	nobutton      : 1                       // (show)         (no button)
	nofocus       : 1                       // (input box)    (no focus at input box)
	boxwidth      : N                       // 200            (input text/password width - 'max' to fit)
	autoclose     : N                       // (disabled)     (auto close in ms)
	preshow       : FUNCTION                // (none)         (function before show)
	
	content       : 'HTML'                  //                (replace whole '#infoContent' html)
	message       : 'MESSAGE'               // (blank)        (message under title)
	msgalign      : 'CSS'                   // 'center'       (message under title)
	
	textlabel     : [ 'LABEL', ... ]        // (blank)        (label array input label)
	textvalue     : [ 'VALUE', ... ]        // (blank)        (pre-filled array input value)
	textsuffix    : [ 'LABEL', ... ]        // (blank)        (inputbox suffix array)
	textrequired  : [ N, ... ]              // (none)         (required fields disable ok button if blank)
	textalign     : 'CSS'                   // 'left'         (input text alignment)
	
	passwordlabel : 'LABEL'                 // (blank)        (password input label)
	pwdrequired   : 1                       // (none)         (password required)
	
	filelabel     : 'LABEL'                 // 'Browse'       (browse button label)
	fileoklabel   : 'LABEL'                 // 'OK'           (upload button label)
	fileokdisable : 1                       // (enable)       (disable file button after select)
	filetype      : 'TYPE'                  // (none)         (filter and verify filetype)
	filetypecheck : 1                       // (no)           (check matched filetype)
	                                                          ( var file = $( '#infoFileBox' )[ 0 ].files[ 0 ]; )
	
	radio         : { LABEL: 'VALUE', ... } //                ( var value = $( '#infoRadio input:checked' ).val(); )
	checked       : N                       // 0              (pre-select input index)
	radiohr       : 1                       // (none)         (horizontal line after)
	
	select        : { LABEL: 'VALUE', ... } //                ( var value = $( '#infoSelectBox').val(); )
	selectlabel   : 'LABEL'                 // (blank)        (select input label)
	checked       : N                       // 0              (pre-select option index)
	
	checkbox      : { LABEL: 'VALUE', ... } //                ( var value = [];
	                                                            $( '#infoCheckBox input:checked' ).each( function() {
	                                                                value.push( this.value );
	                                                            } ); )
	checked       : [ N, ... ]              // (none)         (pre-select array input indexes - single can be  N)
	checkboxhr    : 1                       // (none)         (horizontal line after)
	
	footer        : 'FOOTER'                // (blank)        (footer above buttons)
	footalign     : 'CSS'                   // (blank)        (footer text alignment)
	oklabel       : 'LABEL'                 // 'OK'           (ok button label)
	okcolor       : 'COLOR'                 // '#0095d8'      (ok button color)
	ok            : FUNCTION                // (reset)        (ok click function)
	cancellabel   : 'LABEL'                 // 'Cancel'       (cancel button label)
	cancelcolor   : 'COLOR'                 // '#34495e'      (cancel button color)
	cancelbutton  : 1                       // (hide)         (cancel button color)
	cancel        : FUNCTION                // (reset)        (cancel click function)
	
	buttonlabel   : [ 'LABEL', ... ]        //                (label array)
	button        : [ FUNCTION, ... ]       //                (function array)
	buttoncolor   : [ 'COLOR', ... ]        // '#34495e'      (color array)
	buttonwidth   : 1                       // (none)         (equal buttons width)
} );
Note:
- No default - must be specified.
- Single value/function - no need to be array
- select requires Selectric.js
*/
function heredoc( fn ) {
	return fn.toString().match( /\/\*\s*([\s\S]*?)\s*\*\//m )[ 1 ];
};
var containerhtml = heredoc( function() { /*
<div id="infoOverlay" class="hide" tabindex="1">
	<div id="infoBox">
		<div id="infoTopBg">
			<div id="infoTop">
				<i id="infoIcon"></i>&emsp;<a id="infoTitle"></a>
			</div>
			<i id="infoX" class="fa fa-times hide"></i>
			<div style="clear: both"></div>
		</div>
		<div id="infoContent">
		</div>
		<div id="infoButtons">
			<div id="infoFile" class="hide">
				<span id="infoFilename"></span>
				<input type="file" class="infoinput" id="infoFileBox">
			</div>
			<a id="infoFileLabel" class="filebtn infobtn-primary">Browse</a>
			<a id="infoCancel" class="infobtn infobtn-default"></a>
			<a id="infoOk" class="infobtn infobtn-primary"></a>
		</div>
	</div>
</div>
*/ } );
infocontenthtml = heredoc( function() { /*
			<i class="fa fa-arrow-left infoarrowleft hide"></i><i class="fa fa-arrow-right infoarrowright hide"></i>
			<p id="infoMessage" class="infomessage hide"></p>
			<div id="infoText" class="infocontent hide">
				<div id="infotextlabel"></div>
				<div id="infotextbox"></div>
				<div id="infotextsuffix"></div>
			</div>
			<div id="infoRadio" class="infocontent infocheckbox infohtml"></div>
			<div id="infoCheckBox" class="infocontent infocheckbox infohtml"></div>
			<div id="infoSelect" class="infocontent">
				<a id="infoSelectLabel" class="infolabel"></a><select class="infohtml" id="infoSelectBox"></select>
			</div>
			<div id="infoRange" class="infocontent inforange infohtml">
				<div class="value"></div>
				<a class="min">0</a><input type="range" min="0" max="100"><a class="max">100</a>
			</div>
			<p id="infoFooter" class="infomessage hide"></p>
*/ } );
var infoscroll = 0;
var splitcols = 0;
G = {}

$( 'body' ).prepend( containerhtml );

$( '#infoOverlay' ).keydown( function( e ) {
	var key = e.key;
	
	if ( $( '#infoOverlay' ).is( ':visible' ) ) {
		if ( key == 'Enter' && !$( '#infoOk' ).hasClass( 'disabled' ) && !$( 'textarea' ).is( ':focus' ) ) {
			$( '#infoOk' ).click();
		} else if ( e.keyCode === 32 && $( '.infocheckbox input.active' ).length ) {
			e.preventDefault();
			$( '.infocheckbox input.active' ).click();
		} else if ( key === 'Escape' ) {
			local(); // suppress settings
			$( '#infoCancel' ).click();
		} else if ( [ 'ArrowUp', 'ArrowDown' ].indexOf( key ) !== -1 ) {
			e.preventDefault();
			if ( $( '#infoCheckBox' ).hasClass( 'hide' ) && $( '#infoRadio' ).hasClass( 'hide' ) ) return
			
			var $el = $( '.infocheckbox input:not(:disabled)' );
			if ( $el.length === 1 ) return
			
			var $elactive = $( '.infocheckbox input.active' );
			if ( !$elactive.length ) {
				$el.eq( 0 ).addClass( 'active' );
			} else {
				var ellast = $el.length - 1;
				var elindex;
				$.each( $el, function( i, el ) {
					if ( $( el ).hasClass( 'active' ) ) {
						elindex = i;
						return false
					}
				} );
				if ( key === 'ArrowUp' ) {
					var i = elindex !== 0 ? elindex - 1 : ellast;
					var $next = $el.eq( i );
				} else {
					var i = elindex !== ellast ? elindex + 1 : 0;
					var $next = $el.eq( i );
				}
				$elactive.removeClass( 'active' );
				$next.addClass( 'active' );
			}
		} else if ( [ 'ArrowLeft', 'ArrowRight' ].indexOf( key ) !== -1 ) {
			var $btn = $( '.infobtn:not( .hide )' );
			if ( $btn.length === 1 ) return
			
			var $btnactive = $( '.infobtn.active' );
			if ( !$btnactive.length ) {
				$btn.eq( 0 ).addClass( 'active' );
			} else {
				if ( key === 'ArrowLeft' ) {
					var $next = $btnactive.prev( '.infobtn:not( .hide )' );
				} else {
					var $next = $btnactive.next( '.infobtn:not( .hide )' );
				}
				if ( $next.length ) {
					$btnactive.removeClass( 'active' );
					$next.eq( 0 ).addClass( 'active' );
				}
			}
		}
	}
} );
$( '#infoContent' ).on( 'click', '.fa-eye', function() {
	var $this = $( this );
	var i = $( '#infotextsuffix i' ).index( $this );
	var $pwd = $( '#infoPasswordBox'+ ( i || '' ) );
	if ( $pwd.prop( 'type' ) === 'text' ) {
		$this.removeClass( 'eyeactive' );
		$pwd.prop( 'type', 'password' );
	} else {
		$this.addClass( 'eyeactive' );
		$pwd.prop( 'type', 'text' );
	}
} );

function infoReset() {
	if ( !G.arrow ) $( '#infoOverlay' ).addClass( 'hide' );
	G.arrow = 0;
	$( '#infoBox' ).css( {
		  margin     : ''
		, visibility : 'hidden'
	} );
	$( '#infoContent' ).html( infocontenthtml );
	$( '#infoX' ).removeClass( 'hide' );
	$( '.infocontent, .infoarrowleft, .infoarrowright, .infomessage, .infolabel, .infoinput, .infohtml, .filebtn, .infobtn, #infoFile' ).addClass( 'hide' );
	$( '.infomessage, .infoinput, #infoFooter' ).css( 'text-align', '' );
	$( '#infoBox, .infolabel, #infotextbox, .infoinput, .selectric, .selectric-wrapper' ).css( 'width', '' );
	$( '.selectric-items' ).css( 'min-width', '' );
	$( '#infoMessage, .infolabel' ).off( 'click' );
	$( '.filebtn, .infobtn' ).removeClass( 'active' ).css( 'background', '' ).off( 'click' );
	$( '#infoIcon' ).removeAttr( 'class' ).empty();
	$( '#infoFileBox' ).val( '' ).removeAttr( 'accept' );
	$( '#infoFilename' ).empty();
	$( '#infoFileLabel' ).addClass( 'infobtn-primary' )
	$( '#infoOk, #infoFileLabel' ).removeClass( 'disabled' );
	$( '.extrabtn, #infoContent hr' ).remove();
//	$( '#loader' ).addClass( 'hide' ); // for 'X' click
	if ( infoscroll ) {
		$( 'html, body' ).scrollTop( infoscroll );
		infoscroll = 0;
	}
}

function info( O ) {
	infoReset();
	infoscroll = $( window ).scrollTop();
	setTimeout( function() { // fix: wait for infoReset() on 2nd info
	///////////////////////////////////////////////////////////////////
	// simple use as info( 'message' )
	if ( typeof O !== 'object' ) {
		$( '#infoIcon' ).addClass( 'fa fa-info-circle' );
		$( '#infoTitle' ).text( 'Info' );
		$( '#infoX' ).addClass( 'hide' );
		$( '#infoContent' ).prepend( '<p class="message">'+ O +'</p>' );
		$( '#infoOk' ).removeClass( 'hide' );
		$( '#infoOverlay' ).removeClass( 'hide' );
		$( '#infoOk' ).html( 'OK' ).click( infoReset );
		alignVertical();
		return;
	}
	
	// title
	var width = 'width' in O ? O.width : '';
	if ( width ) {
		$( '#infoBox' ).css( 'width', width +'px' );
	}
	if ( 'icon' in O ) {
		if ( O.icon.charAt( 0 ) !== '<' ) {
			$( '#infoIcon' ).addClass( 'fa fa-'+ O.icon );
		} else {
			$( '#infoIcon' ).html( O.icon );
		}
	} else {
		$( '#infoIcon' ).addClass( 'fa fa-question-circle' );
	}
	var title = 'title' in O ? O.title : 'Information';
	$( '#infoTitle' ).html( title );
	if ( 'nox' in O ) $( '#infoX' ).addClass( 'hide' );
	if ( 'autoclose' in O ) {
		setTimeout( function() {
			$( '#infoCancel' ).click();
		}, O.autoclose );
	}
	
	// buttons
	if ( !( 'nobutton' in O ) || !O.nobutton ) {
		$( '#infoOk' )
			.html( 'oklabel' in O ? O.oklabel : 'OK' )
			.css( 'background-color', O.okcolor || '' )
			.removeClass( 'hide' );
			if ( typeof O.ok === 'function' ) $( '#infoOk' ).click( O.ok );
		if ( 'cancel' in O ) {
			$( '#infoCancel' )
				.html( 'cancellabel' in O ? O.cancellabel : 'Cancel' )
				.css( 'background-color', 'cancelcolor' in O ? O.cancelcolor : '' );
			if ( 'cancelbutton' in O || 'cancellabel' in O ) $( '#infoCancel' ).removeClass( 'hide' );
		}
		if ( 'button' in O && O.button ) {
			var button = 'button' in O ? O.button : '';
			var buttonlabel = 'buttonlabel' in O ? O.buttonlabel : '';
			var buttoncolor = 'buttoncolor' in O ? O.buttoncolor : '';
			if ( typeof button !== 'object' ) button = [ button ];
			if ( typeof buttonlabel !== 'object' ) buttonlabel = [ buttonlabel ];
			if ( typeof buttoncolor !== 'object' ) buttoncolor = [ buttoncolor ];
			var iL = button.length;
			for ( i = 0; i < iL; i++ ) {
				var iid = i || '';
				$( '#infoOk' ).before( '<a id="infoButton'+ iid +'" class="infobtn extrabtn infobtn-default">'+ buttonlabel[ i ] +'</a>' );
				$( '#infoButton'+ iid )
									.css( 'background-color', buttoncolor[ i ] || '' )
									.click( button[ i ] );
			}
		}
		if ( 'buttonnoreset' in O ) {
			$( '#infoOk, #infoCancel' ).click( infoReset );
		} else {
			$( '.infobtn' ).click( infoReset );
		}
	}
	$( '#infoX, #infoCancel' ).click( function() {
		$( '#infoOverlay' ).addClass( 'hide' );
		if ( 'cancel' in O && typeof O.cancel === 'function' ) {
			O.cancel();
		} else {
			infoReset();
		}
	} );
	
	if ( 'content' in O ) {
		// custom html content
		$( '#infoContent' ).html( O.content );
	} else {
		// arrow
		if ( 'arrowleft' in O ) $( '.infoarrowleft' )
									.removeClass( 'hide' )
									.click( function() {
										O.arrowleft();
										G.arrow = 1;
									} );
		if ( 'arrowright' in O ) $( '.infoarrowright' )
									.removeClass( 'hide' )
									.click( function() {
										O.arrowright();
										G.arrow = 1;
									} );
		// message
		if ( 'message' in O && O.message ) $( '#infoMessage' ).html( O.message ).removeClass( 'hide' );
		if ( 'msgalign' in O ) $( '#infoMessage' ).css( 'text-align', O.msgalign );
		if ( 'msghr' in O ) $( '#infoMessage' ).after( '<hr>' );
		if ( 'footer' in O && O.footer ) {
			$( '#infoFooter' ).html( O.footer ).removeClass( 'hide' );
			if ( 'footalign' in O ) $( '#infoFooter' ).css( 'text-align', O.footalign );
		}
		// inputs
		if ( 'textlabel' in O || 'textvalue' in O ) {
			var textlabel = 'textlabel' in O ? O.textlabel : '';
			var textvalue = 'textvalue' in O ? O.textvalue : '';
			var textsuffix = 'textsuffix' in O ? O.textsuffix : '';
			if ( textlabel && typeof textlabel !== 'object' ) textlabel = [ textlabel ];
			if ( textvalue && typeof textvalue !== 'object' ) textvalue = [ textvalue ];
			if ( textsuffix && typeof textsuffix !== 'object' ) textsuffix = [ textsuffix ];
			var labelhtml = '';
			var boxhtml = '';
			var suffixhtml = '';
			var iL = textlabel.length > textvalue.length ? textlabel.length : textvalue.length;
			for ( i = 0; i < iL; i++ ) {
				var iid = i || '';
				var labeltext = textlabel[ i ] || '';
				labelhtml += '<a class="infolabel">'+ labeltext +'</a>';
				boxhtml += '<input type="text" class="infoinput input" id="infoTextBox'+ iid +'"';
				if ( textvalue ) boxhtml += textvalue[ i ] !== '' ? ' value="'+ textvalue[ i ].toString().replace( /"/g, '&quot;' ) +'"' : '';
				boxhtml += ' spellcheck="false">';
				if ( textsuffix ) suffixhtml += textsuffix[ i ] !== '' ? '<gr>'+ textsuffix[ i ] +'</gr>' : '<gr>&nbsp;</gr>';
			}
			if ( textsuffix.length ) $( '#infotextbox' ).css( 'width', 'fit-content' );
			$( '#infotextlabel' ).html( labelhtml );
			$( '#infotextbox' ).html( boxhtml );
			$( '#infotextsuffix' ).html( suffixhtml );
			$( '#infoText' ).removeClass( 'hide' );
			if ( 'textalign' in O ) $( '.infoinput' ).css( 'text-align', O.textalign );
			if ( 'textrequired' in O ) {
				if ( typeof O.textrequired !== 'object' ) O.textrequired = [ O.textrequired ];
				O.textrequired.forEach( function( e ) {
					$( '.infoinput' ).eq( e ).addClass( 'required' );
				} );
				checkRequired();
				$( '.infoinput' ).on( 'input', checkRequired );
			}
		}
		if ( 'passwordlabel' in O ) {
			var passwordlabel = typeof O.passwordlabel !== 'object' ? [ O.passwordlabel ] : O.passwordlabel;
			var labelhtml = '';
			var boxhtml = '';
			var suffixhtml = '';
			var iL = passwordlabel.length;
			for ( i = 0; i < iL; i++ ) {
				var iid = i || '';
				var labeltext = passwordlabel[ i ];
				labelhtml += '<a class="infolabel">'+ passwordlabel[ i ] +'</a>';
				boxhtml += '<input type="password" class="infoinput input" id="infoPasswordBox'+ iid +'">';
				suffixhtml += '<i class="fa fa-eye fa-lg"></i><br>';
			}
			$( '#infotextlabel' ).append( labelhtml );
			$( '#infotextbox' ).append( boxhtml );
			$( '#infotextsuffix' ).append( suffixhtml.slice( 0, -4 ) );
			$( '#infoText' ).removeClass( 'hide' );
		}
		if ( 'fileoklabel' in O ) {
			$( '#infoOk' )
				.html( O.fileoklabel )
				.addClass( 'hide' );
			if ( 'filelabel' in O ) $( '#infoFileLabel' ).html( O.filelabel );
			$( '#infoFileLabel' ).click( function() {
				$( '#infoFileBox' ).click();
			} );
			$( '#infoFile, #infoFileLabel' ).removeClass( 'hide' );
			if ( 'filetype' in O ) $( '#infoFileBox' ).attr( 'accept', O.filetype );
			$( '#infoFileBox' ).change( function() {
				var file = this.files[ 0 ];
				if ( !file ) return
				
				var filename = file.name;
				var ext = filename.split( '.' ).pop();
				if ( 'filefilter' in O && O.filetype.indexOf( ext ) === -1 ) {
					info( {
						  icon    : 'warning'
						, title   : O.title
						, message : 'File extension must be: <code>'+ O.filetype +'</code>'
						, ok      : function() {
							info( {
								  title       : title
								, message     : message
								, fileoklabel : O.fileoklabel
								, filetype    : O.filetype
								, ok          : function() {
									info( O );
								}
							} );
						}
					} );
					return;
				}
				
				$( '#infoOk' ).removeClass( 'hide' );
				$( '#infoFileLabel' ).removeClass( 'infobtn-primary' )
				if ( 'fileokdisable' in O ) $( '#infoFileLabel' ).addClass( 'disabled' );
				$( '#infoFilename' ).html( '<code>'+ filename +'</code>' );
			} );
		}
		if ( 'radio' in O ) {
			if ( typeof O.radio !== 'object' ) {
				var html = O.radio;
			} else {
				var html = '';
				var cl, label, br;
				$.each( O.radio, function( key, val ) {
					if ( key[ 0 ] === '_' ) {
						splitcols = 1;
						cl = ' class="splitl"';
						label = key.substring( 1 );
						br = '';
					} else {
						cl = ' class="splitr"';
						label = key;
						br = '<br>';
					}
					// <label> for clickable label
					html += '<label'+ cl +'><input type="radio" name="inforadio" value="'
							+ val.toString().replace( /"/g, '&quot;' )+'">&ensp;'+ label +'</label>'+ br;
				} );
			}
			if ( 'radiohr' in O ) $( '#infoRadio' ).after( '<hr>' );
			renderOption( $( '#infoRadio' ), html, 'checked' in O ? O.checked : '' );
		}
		if ( 'checkbox' in O ) {
			if ( typeof O.checkbox !== 'object' ) {
				var html = O.checkbox;
			} else {
				var html = '';
				var cl, label, br;
				$.each( O.checkbox, function( key, val ) {
					if ( key[ 0 ] === '_' ) {
						splitcols = 1;
						cl = ' class="splitl"';
						label = key.substring( 1 );
						br = '';
					} else {
						cl = ' class="splitr"';
						label = key;
						br = '<br>';
					}
					html += '<label'+ cl +'><input type="checkbox" name="'+ val +'" value="'
							+ val.toString().replace( /"/g, '&quot;' )+'">&ensp;'+ label +'</label>'+ br;
				} );
			}
			if ( 'checkboxhr' in O ) $( '#infoCheckBox' ).after( '<hr>' );
			if ( 'checked' in O ) {
				if ( typeof O.checked !== 'object' ) O.checked = [ O.checked ];
			} else {
				O.checked = '';
			}
			renderOption( $( '#infoCheckBox' ), html, O.checked );
		}
		if ( 'select' in O ) {
			$( '#infoSelectLabel' ).html( 'selectlabel' in O ? O.selectlabel : '' );
			if ( typeof O.select !== 'object' ) {
				var html = O.select;
			} else {
				var html = '';
				$.each( O.select, function( key, val ) {
					html += '<option value="'+ val.toString().replace( /"/g, '&quot;' ) +'">'+ key +'</option>';
				} );
			}
			renderOption( $( '#infoSelectBox' ), html, 'checked' in O ? O.checked : '' );
			$( '#infoSelect, #infoSelectLabel, #infoSelectBox' ).removeClass( 'hide' );
		}
		if ( 'rangevalue' in O ) {
			$( '#infoRange .value' ).text( O.rangevalue );
			$( '#infoRange input' ).val( +O.rangevalue );
			$( '#infoRange' ).removeClass( 'hide' );
		}
	}

	if ( 'preshow' in O ) O.preshow();
	$( '#infoOverlay' )
		.removeClass( 'hide' )
		.focus(); // enable e.which keypress (#infoOverlay needs tabindex="1")
	alignVertical();
	
	$( '#infoOverlay' ).addClass( 'noclick' );
	setTimeout( function() { // prevent click OK on consecutive info
		$( '#infoOverlay' ).removeClass( 'noclick' );
		var $input = $( '#infotextbox input[type=text]:eq( 0 )' );
		if ( !$input.length ) $input = $( '#infotextbox input[type=password]:eq( 0 )' );
		if ( !$input.length || 'nofocus' in O ) return
		
		var L = $input.val().length;
		$input.focus();
		$input[ 0 ].setSelectionRange( L, L );
	}, 300 );
	if ( 'boxwidth' in O ) {
		var maxW = window.innerWidth * 0.98;
		var infoW = width || parseInt( $( '#infoBox' ).css( 'width' ) );
		var calcW = maxW < infoW ? maxW : infoW;
		var labelW = 0;
		$( '.infolabel' ).each( function() {
			var thisW = $( this ).width();
			if ( thisW > labelW ) labelW = thisW;
		} );
		var boxW = O.boxwidth !== 'max' ? O.boxwidth : calcW - 70 - labelW;
		setTimeout( function() {
			$( '.infoinput, #infoOverlay .selectric, #infoOverlay .selectric-wrapper' ).css( 'width', boxW +'px' );
			$( '.selectric-items' ).css( 'min-width', boxW +'px' );
		}, 0 );
	}
	if ( 'buttonwidth' in O ) {
		var widest = 0;
		var w;
		$.each( $( '#infoButtons a' ), function() {
			w = $( this ).outerWidth();
			if ( w > widest ) widest = w;
		} );
		$( '.infobtn, .filebtn' ).css( 'min-width', widest +'px' );
	}
	if ( $( '#infoContent option' ).length ) $( '#infoContent select' ).selectric();
	/////////////////////////////////////////////////////////////////////////////
	}, 0 );
}

function alignVertical() { // make infoBox scrollable
	setTimeout( function() {
		var boxH = $( '#infoBox' ).height();
		var wH = window.innerHeight;
		var top = boxH < wH ? ( wH - boxH ) / 2 : 20;
		$( '#infoBox' ).css( {
			  'margin-top' : top +'px'
			, 'visibility' : 'visible'
		} );
		$( 'html, body' ).scrollTop( 0 );
	}, 0 );
}
function checkRequired() {
	var $empty = $( '.infoinput.required' ).filter( function() {
		return !$( this ).val();
	} );
	$( '#infoOk' ).toggleClass( 'disabled', $empty.length > 0 );
}
function renderOption( $el, htm, chk ) {
	$el.html( htm ).promise().done( function() {
		$el.removeClass( 'hide' );
		if ( $el.prop( 'id' ) === 'infoCheckBox' ) { // by index
			if ( chk ) {
				chk.forEach( function( val ) {
					$el.find( 'input' ).eq( val ).prop( 'checked', true );
				} );
			}
		} else {                                    // by value
			var opt = $el.prop( 'id' ) === 'infoSelectBox' ? 'option' : 'input';
			if ( chk === '' ) { // undefined
				$el.find( opt ).eq( 0 ).prop( 'checked', true );
			} else {
				$el.find( opt +'[value="'+ chk +'"]' ).prop( opt === 'option' ? 'selected' : 'checked', true );
			}
		}
		if ( !splitcols ) return
	
		setTimeout( function() {
			var types = []
			if ( $( '#infoRadio label' ).length ) types.push( 'Radio' );
			if ( $( '#infoCheckBox label' ).length ) types.push( 'CheckBox' );
			types.forEach( function( type ) {
				[ 'splitl', 'splitr' ].forEach( function( cl ) {
					var $el = $( '#info'+ type +' label.'+ cl );
					var widest = 0;
					var pad = cl === 'splitl' ? 20 : 5;
					$el.each( function() {
						w = $( this ).width();
						if ( w > widest ) widest = w;
					} );
					$el.width( widest + pad );
				} );
			} );
		}, 0 );
	} );
}
function verifyPassword( title, pwd, fn ) {
	info( {
		  title         : title
		, message       : 'Please retype'
		, passwordlabel : 'Password'
		, ok            : function() {
			if ( $( '#infoPasswordBox' ).val() === pwd ) {
				fn();
				return;
			}
			
			info( {
				  title   : title
				, message : 'Passwords not matched. Please try again.'
				, ok      : function() {
					verifyPassword( title, pwd, fn )
				}
			} );
		}
	} );
}
function blankPassword( title, message, label, fn ) {
	info( {
		  title   : title
		, message : 'Blank password not allowed.'
		, ok      : function() {
			info( {
				  title         : title
				, message       : message
				, passwordlabel : 'Password'
				, ok            : function() {
					var pwd = $( '#infoPasswordBox' ).val();
					if ( !pwd ) {
						blankPassword( title, message, label, fn );
					} else {
						verifyPassword( title, pwd, fn )
					}
				}
			} );
		}
	} );
}
