<?php
// <!DOCTYPE html> ---------------------------------------------
include 'common.php';

include 'main.php';

$jsp       = [ 'jquery', 'html5kellycolorpicker', 'lazysizes', 'pica', 'pushstream', 'qrcode', 'roundslider', 'Sortable' ];
$js        = [ 'common', 'context', 'function', 'main', 'passive' ];
if ( $equalizer ) {
	$jsp[] = 'jquery.selectric';
	$js[]  = 'equalizer';
}
if ( $localhost ) {
	$jsp[] = 'simplekeyboard';
	$js[]  = 'keyboard';
	echo '
<div id="keyboard" class="hide"><div class="simple-keyboard"></div></div>';
}
$script    = '';
foreach( $jsp as $j ) $script.= '
<script src="/assets/js/plugin/'.$jlist[ $j ].'"></script>';
// with cache busting
foreach( $js as $j ) $script.= '
<script src="/assets/js/'.$j.'.js'.$hash.'"></script>';
echo $script;
?>

</body>
</html>

