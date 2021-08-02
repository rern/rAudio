$( 'body' ).prepend(
'<div id="banner" class="hide">\
	<div id="bannerIcon"></div>\
	<div id="bannerTitle"></div>\
	<div id="bannerMessage"></div>\
</div>'
);
$( '#banner' ).click( bannerHide );
var bannertimeout;
banner = ( title, message, icon, delay ) => {
	clearTimeout( bannertimeout );
	var iconhtml = icon && icon.slice( 0, 1 ) === '<' 
					? icon 
					: icon ? '<i class="fa fa-'+ ( icon ) +'"></i>' : '';
	$( '#bannerIcon' ).html( iconhtml );
	$( '#bannerTitle' ).html( title );
	$( '#bannerMessage' ).html( message );
	$( '#banner' ).removeClass( 'hide' );
	if ( delay !== -1 ) bannertimeout = setTimeout( bannerHide, delay || 3000 );
}
bannerHide = () => {
	$( '#banner' )
		.addClass( 'hide' )
		.removeAttr( 'style' );
	$( '#bannerIcon, #bannerTitle, #bannerMessage' ).empty();
}
