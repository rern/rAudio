if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) document.getElementById( 'help' ).classList.add( 'hide' );

document.body.addEventListener( 'click', function( e ) {
	if ( e.target.id === 'close' ) {
		var hostname = location.hostname;
		var http = new XMLHttpRequest();
		http.open( 'POST', 'http://' + hostname + '/cmd.php', true );
		http.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
		http.send( 'cmd=bash&bash=systemctl%20stop%20camillagui' );
		location.href = 'http://' + hostname;
	} else if ( e.target.id === 'help' || e.target.id === 'eqhelp' ) {
		document.getElementById( 'div'+ e.target.id ).classList.toggle( 'hide' );
	}
});

fetch( '/api/status' )
	.then( response => response.json() )
	.then( status => {
		document.getElementById( 'version' ).innerHTML = `\
	CamillaDSP ${ status.cdsp_version }
<br>pyCamillaDSP ${ status.py_cdsp_version }
<br>Backend ${ status.backend_version }
`;
} );
setTimeout( function() {
	document.body.classList.remove( 'hide' );
}, 300 );
