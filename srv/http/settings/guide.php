<style>
body { height: 100% }
img {
	display: block;
	margin: 50vh auto 0;
	transform: translateY(-50%);
	width: auto;
	height: auto;
	max-width: 650px;
	max-height: calc( 100% - 80px );
	border: 1px solid hsl(0,0%,15%);
}
@media (max-height: 730px) {
	img {
		margin-top: 40px;
		transform: unset;
	}
}
@media (max-height: 570px) {
	img { max-height: calc( 100% - 40px ) }
}
@media (max-width: 650px) {
	img { max-width: 100% }
}
#prev,
#next { width: 50% }
</style>
<img id="img" src="/assets/img/guide/1.jpg">
<?php
$htmlbar.= '<div>'.i( 'back', 'prev' ).i( 'arrow-right', 'next' ).'</div>';
htmlBottom();
