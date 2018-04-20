//Login function obtained from https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow

var express = require('express'); // Express web server framework
var session = require('express-session'); //Express Session Module
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/spot_on";

/*var jquery = require("node-jsdom");
jquery.env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }

    var $ = require("jquery")(window);
});*/

var client_id = '703c95bc02d947b9b49c0b5e50cfaa3f'; // Your client id
var client_secret = '911cbe0e20f847769f5981267259c13a'; // Your secret
// var redirect_uri = req.protocol + '://' +req.get('host') + '/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

//Converting miliseconds to minutes:seconds for track durations
var msToMins = function(milis) {
  var minutes = Math.floor(milis / 60000);
  var seconds = ((milis % 60000) / 1000).toFixed(0);

  if (seconds == 60) {minutes++};
  if (seconds < 10) {seconds='0'+seconds};
  return minutes + ':' + seconds;
}

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(session({secret: 'rory_and_charlie'}));
app.set('view engine', 'ejs');


/*
  Log In, Database Creation & Session Creation
  - Jess McGowan (with Spotify for authorisation)
*/

//Initialise the database connection
var db;

MongoClient.connect(url, function(err, database){
  if(err) throw err;
  db = database;
  //app.listen(8080);
});

// /login
app.get('/login', function(req, res) {

  var redirect_uri = req.protocol + '://' +req.get('host') + '/callback/';
  console.log(redirect_uri);

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-read-private';
  scope += ' user-library-read playlist-modify-public playlist-modify-private';
  scope += ' playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

// /callback
app.get('/callback/', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  //var redirect_uri = req.protocol + '://' +req.get('host') + '/callback/';
  //console.log(redirect_uri);

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
    querystring.stringify({
      error: 'state_mismatch'
    }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: req.protocol + '://' +req.get('host') + '/callback/',
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
        refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);

          //if user does not have a display name (i.e. not connected to facebook), use profile id
          if(body.display_name!=null){
            var display_name = body.display_name;
          }
          else {
            var display_name = body.id;
          }

          //if user has no profile image, use default blank image
          if(body.image_url!=null){
            var image_url = body.images.url;
          }
          else {
            var image_url = 'img/profile_blank.png';
          }

          //Search database for the current user ID
          db.collection('users').find({user_id: body.id}).toArray(function(err, result) {
            if (err) throw err;
            //If user_id already exists, update the database
            if (result.length>0){
              db.collection('users').update({user_id: body.id},{user_id: body.id, display_name: display_name, image_url: image_url, access_token: access_token, refresh_token: refresh_token}, function(err, result) {
                if (err) throw err;
                console.log('Saved to Database');
                //add user details to current Session
                req.session.user_id = body.id;
                req.session.access_token = access_token;
                req.session.loggedin = true;
                console.log('session ID = '+ req.session.id);
                console.log('session User ID = '+ req.session.user_id);
                console.log('session Access Token = '+ req.session.access_token);
                //redirect to home
                res.redirect('/');
              });
            }
            //otherwise create a new user account
            else {
              db.collection('users').insert({user_id: body.id, display_name: display_name, image_url: image_url, access_token: access_token, refresh_token: refresh_token}, function(err, result) {
                if (err) throw err;
                console.log('Saved to Database');
                //add user details to current Session
                req.session.user_id = body.id;
                req.session.access_token = access_token;
                req.session.loggedin = true;
                console.log('session ID = '+ req.session.id);
                console.log('session User ID = '+ req.session.user_id);
                console.log('session Access Token = '+ req.session.access_token);
                //redirect to home
                res.redirect('/');
              });
            }

          });
        });
        //Change Login Button to Logout

      /*  $(".loginButton").click(function(){
    		    $(".loginButton").hide();
    		    $(".logoutButton").show();
      });*/
      } else {
        res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
      }
    });
  }
});

// /refresh_token
app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


/*
  Profile Page
  - Jess McGowan
*/

//Initialising variables for profile
var searches;
var display_name;
var image_url;
var playlists;
var tracks;

//Complete the first call for loading profile information from the database
app.get('/profile', function(req, res) {
  //redirect if not logged in
  if(!req.session.loggedin){res.redirect('/login');return;}

  console.log('User ID from Session: ' +req.session.user_id);

  //Get User Searches from Mongo
  db.collection('users').find({user_id: req.session.user_id}).toArray(function(err, result) {
    if (err) throw err;
    //Get user's details from DB
    if (result.length>0){
      for (var i = 0; i < result.length; i++) {
        console.log('Search Results: '+result[i]);
        searches = result[i].searches;
        display_name = result[i].display_name;
        image_url = result[i].image_url;
      }
        console.log('Searches: '+searches);
        console.log('display_name: '+display_name);
        console.log('image_url: '+image_url);
      }

  });
  //Go to next API call on completion
  res.redirect('/profile_playlists');
});

//Get the user's playlists from Spotify
app.get('/profile_playlists', function(req, res) {
  //  Details for the API Call
  var access_token = req.session.access_token;

  if (access_token != null) {
    var options = {
      url: 'https://api.spotify.com/v1/me/playlists',
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };


    // GET Playlists from Spotify
    request.get(options, function(error, response, body) {
      //console.log(body.items);

      //If no errors from the API request
      if (!error && response.statusCode === 200) {
        //Get the details from each playlist and save as a variable
        playlists = body.items;

      } else {
        //Log the error in the console
        console.log(statusCode + " " + error);
      }
    });
  }
  //Go to next API call on completion
  res.redirect('/profile_tracks');
});

//Get the user's tracks from Spotify
app.get('/profile_tracks', function(req, res) {
  //  Details for the API Call
  var access_token = req.session.access_token;

  if (access_token != null) {
    var options = {
      url: 'https://api.spotify.com/v1/me/tracks',
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };


    // GET Trackss from Spotify
    request.get(options, function(error, response, body) {
      //console.log(body.items);

      //If no errors from the API request
      if (!error && response.statusCode === 200) {
        //Get the details from each playlist and save as a variable
        tracks = body.items;
        for (var i = 0; i < tracks.length; i++) {
          tracks[i].track.duration_min = msToMins(tracks[i].track.duration_ms);
          /*console.log(tracks[i].track.name);
          console.log(tracks[i].track.artists[0].name);
          console.log(tracks[i].track.duration_min);*/
        }
        console.log('Tracks Length: '+tracks.length);
      } else {
        //Log the error in the console
        console.log(statusCode + " " + error);
        //If error print error
        res.send(statusCode + " " + error);
      }
      //Go to render on completion
      res.redirect('/profile_page');
    });
  }
});

//Final profile call
app.get('/profile_page', function(req, res) {
  //render the template with the content added from the previous calls
  res.render('pages/test_profile', {
    display_name: display_name,
    image_url: image_url,
    searches: searches,
    playlists: playlists,
    tracks: tracks
  });

});

//Setting up variable to store playlist Tracks
var playlist_tracks;
var playlist_name;
var playlist_owner;
var playlist_id;

//Send Playlists to Media player
app.get('/play_playlist', function(req, res) {
  //collect passed variables from url
  playlist_owner = req.query.user;
  playlist_id = req.query.uri;
  playlist_name = req.query.name;
  var access_token = req.session.access_token;

  if (access_token != null) {
    var options = {
      url: 'https://api.spotify.com/v1/users/'+playlist_owner+'/playlists/'+playlist_id+'/tracks',
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };


    // GET Playlist tracks from Spotify
    request.get(options, function(error, response, body) {
      console.log(body.items);

      //If no errors from the API request
      if (!error && response.statusCode === 200) {
        //Get the details from each playlist and save as a variable
        playlist_tracks = body.items;
        for (var i = 0; i < playlist_tracks.length; i++) {
          playlist_tracks[i].track.duration_min = msToMins(playlist_tracks[i].track.duration_ms);
        }

      } else {
        //Log the error in the console
        console.log(statusCode + " " + error);
      }
      //Go to next API call on completion
      res.redirect('/media_player');
    });
  }

});

app.get('/media_player', function(req, res) {
  res.render('pages/player', {
    playlist_tracks: playlist_tracks,
    playlist_id: playlist_id,
    playlist_owner: playlist_owner,
    playlists: playlists,
    image_url: image_url,
    display_name: display_name,
    tracks: tracks,
    playlist_name: playlist_name
  });
});

/**
 * Search for artist or track
 * name = artist_name or song_title
 * type = artist or track
 */
app.get('/search', function(req, res) {


  //TODO: Check if logged in
  // if(!req.session.loggedin){res.redirect('/login'); return;}

  var access_token = req.session.access_token;

  var query = req.query.q;
  var type = req.query.type;
  var searchoptions = {
    url: 'https://api.spotify.com/v1/search?' +
    querystring.stringify({
      query: query,
      type: type,
      limit: 8
    }),
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };


  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      res.send("Status 200 it worked");


      console.log(response.jsonData);

      request.get(searchoptions, function(error, response, body) {
        console.log(body);

        console.log("\nSEARCH RESULTS \n");
        if (body.artists) {
          for (var i = 0; i < body.artists.items.length; i++) {
            console.log("\t ARTIST: " + body.artists.items[i].name);
          }
        } else if (body.tracks) {
          for (var i = 0; i < body.tracks.items.length; i++) {
            console.log("\t ARTIST: " + body.artists.items[i].name);
          }
        }
//=======
        //console.log("SEARCH RESULTS \n" + "\tARTIST: " + body.artists + "\n\TRACK": body.track);
//>>>>>>> ac65cc00feb7d32f9724e36c500ca4e9f389a3b7
      });
    }
  });
});

/**
  * End of Search and Recommendations
  */
  // Playlist functions
app.post('/create_pl', function(req, res) {
  var access_token = req.session.access_token;
  var user_id = req.session.user_id;
  var newpl = {
    name: "New Playlist",
    description: "New playlist description",
    public: false
  };
  var options = {
    url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists',
    headers: { 'Authorization': 'Bearer ' + access_token },
    body:newpl
    //json: true
    };
  request.post(options, function(err, res, body) {
    if(!error && response.statusCode === 200){
      console.log(body);
    }
    else{
      console.log(error);
    }
  });
});

/*app.post('/addto_pl', function(req, res) {
  var access_token = req.session.access_token;
  var user_id = req.session.user_id;
  //var playlist_id =
  //var newsong = uris: 'spotify:track:4iV5W9uYEdYUVa79Axb7Rh'

  var options = {
    url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists/'+playlist_id+'/tracks',
    headers: { 'Authorization': 'Bearer ' + access_token },
    body:{
      'uris': '4iV5W9uYEdYUVa79Axb7Rh'
    },
    json: true
  };
  request.post(options, function(err, res, body) {
    if(!error && response.statusCode === 200){
    console.log(body);
    }
    else{
      console.log(error);
    }
  });
});

app.delete('/rm_song', function(req, res) {
  var access_token = req.session.access_token;
  var user_id = req.session.user_id;
  var delsong = {
    tracks: [{
      uris:[
        "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
        "spotify:track:1301WleyT98MSxVHPZCA6M"]}
    }]}
  var options = {
    url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists/'+playlist_id+'/tracks',
    headers: { 'Authorization': 'Bearer ' + access_token },
    body:delsong
    json: true
    };
  request.post(options, function(err, res, body) {
    if(!error && response.statusCode === 200){
      console.log(body);
    }
    else{
      console.log(error);
    }
  });
});

app.get('/edit_detail', function(req, res) {
  var access_token = req.session.access_token;
  var user_id = req.session.user_id;
  var newdetail = {
    name: "PlaylistName",
    description: "New playlist description",
  }
  var options = {
    url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists',
    headers: { 'Authorization': 'Bearer ' + access_token },
    body:delsong
    json: true
    };
  request.post(options, function(err, res, body) {
    if(!error && response.statusCode === 200){
      console.log(body);
    }
    else{
      console.log(error);
    }
  });
});
*/


app.get('/logout', function(req, res) {
  req.session.loggedin = false;
  req.session.destroy(function(err) {
    //no more session
    //change back to login Button
    /* $(".logoutButton").click(function(){
		    $(".logoutButton").hide();
		    $(".loginButton").show();
      }); */
  });

});

console.log('Listening on 8080');
app.listen(8080);
