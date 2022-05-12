fetch( '/api/status' )
	.then( response => response.json() )
	.then( status => {
		document.getElementById( 'version' ).innerHTML = `\
    CamillaDSP ${ status.cdsp_version }
<br>pyCamillaDSP ${ status.py_cdsp_version }
<br>Backend ${ status.backend_version }
`;
} );

if ( [ 'localhost', '127.0.0.1' ].includes( location.hostname ) ) {
	document.getElementById( 'help' ).remove();
	document.getElementById( 'divhelp' ).remove();
}
document.getElementById( 'help' ).onclick = () => {
	var divhelp = document.getElementById( 'divhelp' );
	divhelp.style.display = divhelp.style.display === 'none' ? 'block' : 'none';
}
document.getElementById( 'close' ).onclick = () => {
	var hostname = location.hostname;
	var http = new XMLHttpRequest();
	http.open( 'POST', 'http://' + hostname + '/cmd.php', true );
	http.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
	http.send( 'cmd=bash&bash=systemctl%20stop%20camillagui' );
	location.href = 'http://' + hostname;
}

cacheBusting = () => {
	setTimeout( () => {
		var buttons = document.getElementsByClassName( 'button-with-text' );
		if ( !buttons.length ) {
			cacheBusting();
			return
		}
		
		var hash = '?v='+ Date.now();
		document.querySelectorAll( 'link[rel="stylesheet"]' ).forEach( ( link ) => {
			link.href = link.href + hash;
		} );
		document.querySelectorAll( 'script[src]' ).forEach( ( script ) => {
			script.src = script.attributes.src.textContent + hash;
		} );
		setTimeout( () => {
			document.getElementById( 'root' ).style.display = '';
		}, 300 );
	}, 300 );
}
cacheBusting();
