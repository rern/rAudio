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
	preshow       : FUNCTION                // (none)         (function after html content - before set width)
	postshow      : FUNCTION                // (none)         (function after values set)
	
	content       : 'HTML'                  //                (replace whole '#infoContent' html)
	message       : 'MESSAGE'               // (blank)        (message under title)
	msgalign      : 'CSS'                   // 'center'       (message under title)
	
	textlabel     : [ 'LABEL', ... ]        // (blank)        (label array input label)
	textrequired  : [ i, ... ]              // (none)         (required text in 'i' of all inputs)
	textlength    : { i: N, ... }           // (none)         (required min N characters in 'i')
	textalign     : 'CSS'                   // 'left'         (input text alignment)
	
	textarea      : 1                       //
	
	passwordlabel : 'LABEL'                 // (blank)        (password input label)
	
	filelabel     : 'LABEL'                 // 'Browse'       (browse button label)
	fileoklabel   : 'LABEL'                 // 'OK'           (upload button label)
	fileokdisable : 1                       // (enable)       (disable file button after select)
	filetype      : 'TYPE'                  // (none)         (filter and verify filetype)
	filetypecheck : 1                       // (no)           (check matched filetype)
	                                                          ( var file = $( '#infoFileBox' )[ 0 ].files[ 0 ]; )
	radio         : { LABEL: 'VALUE', ... }
	
	checkbox      : [ 'LABEL', ... ]
	
	select        : { LABEL: 'VALUE', ... }
	selectlabel   : 'LABEL'                 // (blank)        (select input label)
	
	values        : [ 'VALUE', ... ]        // (none)         (default values - in layout order)
	checkchanged  : 1              .        // (none)         (check values changed)
	
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
	buttonfit     : 1                       // (none)         (fit buttons width to label)
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
				<i id="infoIcon"></i><a id="infoTitle"></a>
			</div>
			<i id="infoX" class="fa fa-times hide"></i>
		</div>
		<div id="infoArrow">
			<i class="fa fa-arrow-left infoarrowleft"></i><i class="fa fa-arrow-right infoarrowright"></i>
		</div>
		<div id="infoContent">
		</div>
		<div id="infoButtons">
			<div id="infoFile" class="hide">
				<span id="infoFilename"></span>
				<input type="file" class="hide" id="infoFileBox">
			</div>
			<a id="infoFileLabel" class="filebtn infobtn-primary">Browse</a>
			<a id="infoCancel" class="infobtn infobtn-default"></a>
			<a id="infoOk" class="infobtn infobtn-primary"></a>
		</div>
	</div>
</div>
*/ } );

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
			$( '#infoCancel' ).click();
		} else if ( [ 'ArrowUp', 'ArrowDown' ].indexOf( key ) !== -1 ) {
			e.preventDefault();
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
			if ( $( '#infoContent input:focus' ).length ) return
			
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
$( '#infoContent' ).click( function() {
	$( '.infobtn, .filebtn' ).removeClass( 'active' );
} );
$( '#infoContent' ).on( 'click', '.fa-eye', function() {
	var $this = $( this );
	var $pwd = $this.prev();
	if ( $this.prev().prop( 'type' ) === 'text' ) {
		$this.removeClass( 'eyeactive' );
		$pwd.prop( 'type', 'password' );
	} else {
		$this.addClass( 'eyeactive' );
		$pwd.prop( 'type', 'text' );
	}
} );

function infoReset( infox ) {
	var arrow = 'arrowleft' in O || 'arrowright' in O;
	if ( !arrow || infox ) $( '#infoOverlay' ).addClass( 'hide' ).removeClass( 'noscroll' );
	O.infoscroll = 0;
	$( '#infoBox' ).css( {
		  margin     : ''
		, visibility : 'hidden'
	} );
	$( '#infoTop' ).html( '<i id="infoIcon"></i><a id="infoTitle"></a>' );
	$( '#infoContent' ).empty();
	$( '#infoX' ).removeClass( 'hide' );
	$( '.infoarrowleft, .infoarrowright, #infoTextarea, #infoRange, #infoFile, .filebtn, .infobtn, #infoFile' ).addClass( 'hide' );
	$( '#infoMessage, #infoFooter' ).css( 'text-align', '' );
	$( '#infoBox, #infoContent input, #infoTextarea, .selectric, .selectric-wrapper' ).css( 'width', '' );
	$( '.selectric-items' ).css( 'min-width', '' );
	$( '#infoContent input, #infoContent select' ).off( 'keyup change' );
	$( '.filebtn, .infobtn, #infoContent td, .infoarrowleft, .infoarrowright, #infoMessage' ).off( 'click' );
	$( '.filebtn, .infobtn' ).removeClass( 'active' ).css( 'background', '' ).off( 'click' );
	$( '#infoIcon' ).removeAttr( 'class' ).empty();
	$( '#infoFileBox' ).val( '' ).removeAttr( 'accept' );
	$( '#infoFilename' ).empty();
	$( '#infoFileLabel' ).addClass( 'infobtn-primary' )
	$( '#infoOk, #infoFileLabel' ).removeClass( 'disabled' );
	$( '.extrabtn' ).remove();
	if ( O.infoscroll ) {
		$( 'html, body' ).scrollTop( O.infoscroll );
		O.infoscroll = 0;
	}
}

O = {}

function info( json ) {
	O = json;
	infoReset();
	O.infoscroll = $( window ).scrollTop();
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
	if ( 'icon' in O && O.icon ) {
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
	if ( 'nox' in O && O.nox ) $( '#infoX' ).addClass( 'hide' );
	if ( 'autoclose' in O && O.autoclose ) {
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
		if ( 'cancel' in O && O.cancel ) {
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
		if ( 'buttonnoreset' in O && O.buttonnoreset ) {
			$( '#infoOk, #infoCancel' ).click( infoReset );
		} else {
			$( '.infobtn' ).click( infoReset );
		}
	}
	$( '#infoX, #infoCancel' ).click( function() {
		if ( 'cancel' in O && O.cancel ) O.cancel();
		infoReset( 'infox' );
	} );
	
	if ( 'content' in O && O.content ) {
		// custom html content
		var htmlcontent = O.content;
	} else {
		// arrow
		if ( 'arrowleft' in O && O.arrowleft ) $( '.infoarrowleft' )
									.removeClass( 'hide' )
									.click( O.arrowleft );
		if ( 'arrowright' in O && O.arrowright ) $( '.infoarrowright' )
									.removeClass( 'hide' )
									.click( O.arrowright );
		// message
		var htm = '';
		var htmlmsg = '';
		var htmlfooter = '';
		if ( 'message' in O && O.message ) {
			htmlmsg += '<p id="infoMessage" class="infomessage"';
			if ( 'msgalign' in O ) htmlmsg += ' style="text-align:'+ O.msgalign +'"';
			htmlmsg += '>'+ O.message +'</p>';
			if ( 'msghr' in O ) htm += '<hr>';
		}
		if ( 'footer' in O && O.footer ) {
			htmlfooter += '<p id="infoFooter" class="infomessage"';
			if ( 'footalign' in O ) htmlfooter += ' style="text-align:'+ O.footalign +'"';
			htmlfooter += '>'+ O.footer +'</p>';
		}
		// inputs
		if ( 'textlabel' in O && O.textlabel ) {
			if ( typeof O.textlabel !== 'object' ) O.textlabel = [ O.textlabel ];
			O.textlabel.forEach( function( lbl ) {
				htm += '<tr><td>'+ lbl +'</td><td><input type="text"></td></tr>';
			} );
		}
		if ( 'passwordlabel' in O && O.passwordlabel ) {
			if ( typeof O.passwordlabel !== 'object' ) O.passwordlabel = [ O.passwordlabel ];
			O.passwordlabel.forEach( function( lbl ) {
				htm += '<tr><td>'+ lbl +'</td><td><input type="password">&ensp;<i class="fa fa-eye fa-lg"></i></td></tr>';
			} );
		}
		if ( 'textarea' in O && O.textarea ) {
			htm += '<textarea></textarea>';
		}
		if ( 'radio' in O && O.radio ) { // single set only
			var line;
			var i = 0;
			$.each( O.radio, function( lbl, val ) {
				line = '<label><input type="radio" name="inforadio" value="'+ val +'">'+ lbl +'</label>';
				if ( !O.radiocolumn ) {
					htm += '<tr><td class="chk">'+ line +'</td></tr>';
				} else {
					i++
					if ( i % 2 ) {
						htm += '<tr><td class="chk">'+ line +'</td>';
						return
					} else {
						htm += '<td>'+ line +'</td></tr>';
					}
				}
			} );
		}
		if ( 'checkbox' in O && O.checkbox ) {
			var line, colspan;
			var i = 0;
			O.checkbox.forEach( function( lbl ) {
				if ( lbl === '' ) {
					line = '<td></td>';
				} else {
					line = '<label><input type="checkbox">'+ lbl +'</label>';
				}
				if ( !O.checkcolumn ) {
					htm += '<tr><td></td><td class="chk">'+ line +'</td></tr>';
				} else {
					i++
					if ( i % 2 ) {
						htm += '<tr><td class="chk">'+ line +'</td>';
						return
					} else {
						htm += '<td>'+ line +'</td></tr>';
					}
				}
			} );
		}
		if ( 'select' in O && O.select ) {
			if ( typeof O.select !== 'object' ) {
				var htm = O.select;
			} else {
				var htm = '<tr><td>'+ O.selectlabel +'</td><td><select>';
				$.each( O.select, function( key, val ) {
					htm += '<option value="'+ val.toString().replace( /"/g, '&quot;' ) +'">'+ key +'</option>';
				} );
				htm += '</select></td></tr>';
			}
		}
		if ( 'fileoklabel' in O && O.fileoklabel ) {
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
		if ( 'rangevalue' in O && O.rangevalue ) {
			htm += '<div id="infoRange">'
					+'<div class="value">'+ O.rangevalue +'</div>'
					+'<a class="min">0</a><input type="range" min="0" max="100" value="'+ +O.rangevalue +'"><a class="max">100</a></div>';
		}
		var htmlcontent = htmlmsg +'<table>'+ htm +'</table>'+ htmlfooter;
	}
	$( '#infoContent' ).html( htmlcontent ).promise().done( function() {
		if ( 'preshow' in O && O.preshow ) O.preshow();
		var $input = $( '#infoContent' ).find( 'input, select, textarea' );
		var name, nameprev;
		$input = $input.filter( function() { // filter each radio group
			name = this.name;
			if ( !name ) {
				return true
			} else if (	name !== nameprev ) { // each radio group: multiple inputs with same name
				nameprev = name;
				return true
			}
		} );
		if ( 'textrequired' in O && O.textrequired ) {
			O.textrequired.forEach( function( i ) {
				checkChangedLength( $input.eq( i ), 1 );
			} );
		}
		if ( 'textlength' in O && O.textlength ) {
			$.each( O.textlength, function( i, L ) {
				checkChangedLength( $input.eq( i ), L );
			} );
		}
		if ( 'values' in O && O.values ) {
			if ( typeof O.values !== 'object' ) O.values = [ O.values ];
			var $this, type, val;
			$input.each( function( i, e ) {
				$this = $( e );
				type = $this.prop( 'type' );
				val = O.values[ i ];
				if ( type === 'radio' ) { // reselect radio by name
					$( '#infoContent input:radio[name='+ this.name +']' ).val( [ val ] );
				} else if ( type === 'checkbox' ) {
					$this.prop( 'checked',  val );
				} else { // text, password, textarea, select
					$this.val( val );
				}
			} );
			if ( O.checkchanged ) checkChanged();
		}
		if ( $( '#infoContent select' ).length ) $( '#infoContent select' ).selectric();
		$( '#infoOverlay' )
			.addClass( 'noclick' )
			.removeClass( 'hide' )
			.focus(); // enable e.which keypress (#infoOverlay needs tabindex="1")
		alignVertical();
		if ( 'boxwidth' in O && O.boxwidth ) {
			var allW = $( '#infoContent' ).width();
			var labelW = $( '#infoContent td:first-child' ).width();
			var boxW = O.boxwidth !== 'max' ? O.boxwidth : allW - 50 - labelW;
			setTimeout( function() {
				$( '#infoContent' ).find( 'input:text, input:password, textarea, .selectric, .selectric-wrapper' ).css( 'width', boxW +'px' );
				$( '.selectric-items' ).css( 'min-width', boxW +'px' );
			}, 0 );
		}
		if ( !( 'buttonfit' in O ) ) {
			var widest = 0;
			var w;
			$.each( $( '#infoButtons a' ), function() {
				w = $( this ).outerWidth();
				if ( w > widest ) widest = w;
			} );
			if ( widest > 70 ) $( '.infobtn, .filebtn' ).css( 'min-width', widest +'px' );
		}
		if ( 'postshow' in O && O.postshow ) O.postshow();
		setTimeout( function() { // prevent click OK on consecutive info
			$( '#infoOverlay' ).removeClass( 'noclick' );
			var type0 = $( $input[ 0 ] ).prop( 'type' );
			if ( [ 'text', 'password' ].indexOf( type0 ) !== -1 && !( 'nofocus' in O ) ) $input[ 0 ].focus();
		}, 300 );
		/////////////////////////////////////////////////////////////////////////////
		}, 0 );
	} );
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
		$( '#infoContent input:text' ).prop( 'spellcheck', false );
	}, 0 );
}
function checkChanged() {
	$( '#infoOk' ).addClass( 'disabled' );
	$( '#infoContent' ).find( 'input:text, input:password, textarea' ).keyup( checkChangedValue );
	$( '#infoContent' ).find( 'input:radio, input:checkbox, select' ).change( checkChangedValue );
}
function checkChangedLength( $input, L ) {
	O.shortlength = $input.val().length < L;
	$( '#infoOk' ).toggleClass( 'disabled', O.shortlength );
	$input.on( 'input', function() {
		O.shortlength = $input.val().length < L;
		$( '#infoOk' ).toggleClass( 'disabled', O.shortlength );
	} );
}
function checkChangedValue() {
	if ( O.shortlength ) return // shorter - already disabled
	
	setTimeout( function() { // force after checkChangedLength() and custom check
		var values = infoVal();
		if ( typeof values === 'string' ) values = [ values ];
		var changed = false;
		changed = values.some( function( v, i ) {
			if ( v != O.values[ i ] ) return true
		} );
		$( '#infoOk' ).toggleClass( 'disabled', !changed );
	}, 0 );
}
function infoVal() {
	var $el = $( '#infoContent' ).find( 'input, select, textarea' );
	var values = [];
	var $this, type, name, val;
	var i = 0;
	$el.each( function() {
		$this = $( this );
		type = $this.prop( 'type' );
		val = '';
		if ( type === 'radio' ) { // radio has multiple inputs - skip unchecked inputs
			if ( $this.prop( 'checked' ) ) {
				val = $this.val();
			} else {
				return
			}
			if ( val === 'true' ) { val = true; } else if ( val === 'false' ) { val = false; }
		} else if ( type === 'checkbox' ) {
			val = $this.prop( 'checked' );
		} else {
			val = $this.val();
		}
		values.push( val );
	} );
	if ( values.length > 1 ) {
		return values
	} else {
		return values[ 0 ]
	}
}

// verify password - called from addons.js ///////////////////////////////////////
function verifyPassword( title, pwd, fn ) {
	if ( !title ) return
	
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
function verifyPasswordblank( title, message, label, fn ) {
	var blank;
	$( '#infoOk' ).addClass( 'disabled' );
	$( '#infoPasswordBox' ).on( 'input', function() {
		$( '#infoOk' ).toggleClass( 'disabled', !$( this ).val() );
	} );
}
