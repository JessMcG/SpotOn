$(document).ready(function(){
   
	$("#artistField").hide();
	
	$(".bySong").click(function(){
        $(".bySong").removeClass("inactiveButton");
        $(".bySong").addClass("activeButton");
        $(".byArtist").removeClass("activeButton");
        $(".byArtist").addClass("inactiveButton");
		$("#artistField").hide();
		$("#songField").show();
    });
	
	$(".byArtist").click(function(){
        $(".byArtist").removeClass("inactiveButton");
        $(".byArtist").addClass("activeButton");
        $(".bySong").removeClass("activeButton");
        $(".bySong").addClass("inactiveButton");
		$("#artistField").show();
		$("#songField").hide();
    });
	
	$(".searchResult,#searchResults").hide();
	
	$("#dontWork").click(function(){
		  $("#searchResults").animate({marginTop: '-120px'},500);
		  $("#searchResults").show();
		  $(".searchResult").show();
		  $("#homeBoxes").hide();
			
    }); 
	
	var scroll_pos = 0;

	$(document).scroll(function() { 
		scroll_pos = $(this).scrollTop();
		if(scroll_pos > 80) {
			$("#nav").css('background-color', '#222');
		} else {
			$("#nav").css('background-color', 'transparent');
		}
	});
	
	
	
	$("ol li:even").css("background-color", "#fafafa");

	$("#loginLink").click(function(){
		 
		$("#loginOverlay").fadeIn(300);
		$("#loginBox").delay(100).slideDown(300);
			
    });
	$("#closeLoginForm").click(function(){
		 
		$("#loginOverlay").delay(100).fadeOut(300);
		$("#loginBox").slideUp(300);
			
    }); 
	
});


	
