</head>
<body>

<div id="infoOverlay" class="hide"></div>

<div id="banner" class="hide"></div>

<div id="loader">
	<svg class="logo" viewBox="0 0 180 180">
		<rect width="180" height="180" rx="9"/>
		<path d="M108.24,95.51A49.5,49.5,0,0,0,90,0V81H54V45H36V81H0V99H36v36H54V99H90v81h18V120.73L167.27,180H171a9,9,0,0,0,9-9v-3.72ZM108,23.67a31.46,31.46,0,0,1,0,51.66Z"/>
	</svg>
</div>

<pre id="data" class="hide"></pre>

<?php if ( isset( $page ) ) echo '
<div id="button-data" class="hide"><i class="fa fa-times"></i><span class="title wh">'.$title.'-DATA</span></div>
';
// js plugin version from filenames
$jsfiles = array_slice( scandir( '/srv/http/assets/js/plugin' ), 2 ); // remove ., ..
$jlist   = [];
foreach( $jsfiles as $file ) {
	$name_ver               = explode( '-', $file );
	$jlist[ $name_ver[ 0 ] ] = $file;
}
?>
