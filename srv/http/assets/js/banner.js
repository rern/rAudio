$( 'body' ).prepend(
'<div id="banner" class="hide">\
	<div id="bannerIcon"></div>\
	<div id="bannerTitle"></div>\
	<div id="bannerMessage"></div>\
</div>'
);
$( '#banner' ).click( bannerHide );
function banner( title, message, icon, delay ) {
	var iconhtml = icon && icon.slice( 0, 1 ) === '<' 
					? icon 
					: icon ? '<i class="fa fa-'+ ( icon ) +'"></i>' : '';
	$( '#bannerIcon' ).html( iconhtml );
	$( '#bannerTitle' ).html( title );
	$( '#bannerMessage' ).html( message );
	$( '#banner' ).removeClass( 'hide' );
	if ( delay !== -1 ) setTimeout( bannerHide, delay || 3000 );
}
function bannerHide() {
	$( '#banner' )
		.addClass( 'hide' )
		.removeAttr( 'style' );
	$( '#bannerTitle, #bannerMessage' ).empty();
}
