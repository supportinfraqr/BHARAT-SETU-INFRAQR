$(document).ready(function () {
    var allStates = $("#map-svg path");
    allStates.on("click", function (idx) {
        $('.dList tr').removeClass('selected');
        $('.dList #dData_' + $(this).index()).addClass('selected');
        allStates.removeAttr("class");
        $(this).attr("class", "selected");		
		$('#dataTbl').animate({scrollTop: $('.dList .selected').position().top}, 'slow');		 
    });     
    $svg = $("#map-svg-locations");
});

var transformMatrix = [1, 0, 0, 1, 0, 0];
var svg = document.getElementById('map-svg');
var tooltip = svg.getElementById('tooltip');
var tooltipText = tooltip.getElementsByTagName('text')[0];
var tooltipRects = tooltip.getElementsByTagName('rect');
var triggers = svg.getElementsByClassName('territory');

var viewbox = svg.getAttributeNS(null, "viewBox").split(" ");
var centerX = parseFloat(viewbox[2]) / 2;
var centerY = parseFloat(viewbox[3]) / 2;
var matrixGroup = svg.getElementById("matrix-group");

for (var i = 0; i < triggers.length; i++) {
    triggers[i].addEventListener('mousemove', showTooltip);
    triggers[i].addEventListener('mouseout', hideTooltip);
}

function showTooltip(evt) {
    var CTM = svg.getScreenCTM();
    var x = (evt.clientX - CTM.e + 6) / CTM.a;
    var y = (evt.clientY - CTM.f + 20) / CTM.d;
    tooltip.setAttributeNS(null, "transform", "translate(" + x + " " + y + ")");
    tooltip.setAttributeNS(null, "visibility", "visible");

    tooltipText.firstChild.data = evt.target.getAttributeNS(null, "id");
    var length = tooltipText.getComputedTextLength();
    for (var i = 0; i < tooltipRects.length; i++) {
        tooltipRects[i].setAttributeNS(null, "width", length + 8);
    }
//	alert("tooltip")
}
function hideTooltip(evt) {
    tooltip.setAttributeNS(null, "visibility", "hidden");
}