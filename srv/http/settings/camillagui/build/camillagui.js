fetch( '/api/status' )
	.then( response => response.json() )
	.then( status => {
		document.getElementById( 'version' ).innerHTML = `\
    CamillaDSP ${ status.cdsp_version }
<br>pyCamillaDSP ${ status.py_cdsp_version }
<br>Backend ${ status.backend_version }
`;
} );

if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) document.getElementById( 'help' ).classList.add( 'hide' );

document.body.addEventListener( 'click', function( e ) {
	var id === e.target.id;
	if ( id === 'close' ) {
		var hostname = location.hostname;
		var http = new XMLHttpRequest();
		http.open( 'POST', 'http://' + hostname + '/cmd.php', true );
		http.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
		http.send( 'cmd=bash&bash=systemctl%20stop%20camillagui' );
		location.href = 'http://' + hostname;
	} else if ( id === 'help' || id === 'eqhelp' ) {
		document.getElementById( 'div'+ id ).classList.toggle( 'hide' );
	}
});

cacheBusting = () => {
	setTimeout( () => {
		var buttons = document.getElementsByClassName( 'button-with-text' );
		if ( !buttons.length ) {
			cacheBusting();
			return
		}
		
		var hash = '?v='+ Date.now();
		document.querySelectorAll( 'link' ).forEach( ( link ) => {
			link.href = link.href + hash;
		} );
		document.querySelectorAll( 'script' ).forEach( ( script ) => {
			script.src = script.attributes.src.textContent + hash;
		} );
		setTimeout( () => {
			document.getElementById( 'root' ).style.display = '';
		}, 300 );
	}, 300 );
}
cacheBusting();
