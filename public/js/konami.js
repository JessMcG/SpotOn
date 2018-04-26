//Konami Code - Mikaela Eriksson

var allowedKeys = {
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  65: 'a',
  66: 'b'
};

var konamiCode = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];

var konamiCodePosition = 0;


document.addEventListener('keydown', function(e) {
  var key = allowedKeys[e.keyCode];
  var requiredKey = konamiCode[konamiCodePosition];

  if (key == requiredKey) {
    konamiCodePosition++;
    if (konamiCodePosition == konamiCode.length) {

      $("#konami").css({"background": "url(img/cantina_band.gif) center",
      "background-size": "cover", "position": "absolute",
      "bottom": "0", "right": "0", "z-index": "522",
      "height": "200px", "width": "500px" });

      var audio = new Audio('audio/cantina.mp3');
      audio.play();

      // $("#konami").show();

      konamiCodePosition = 0;
    }
  } else {
    konamiCodePosition = 0;
  }
});