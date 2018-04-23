//Login function obtained from https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow

var express = require('express'); // Express web server framework
var session = require('express-session'); //Express Session Module
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/spot_on";

// var jquery = require("node-jsdom");
// jquery.env("", function(err, window) {
//     if (err) {
//         console.error(err);
//         return;
//     }
//     var $ = require("jquery")(window);
// });

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
});

// /login
app.get('/login', function(req, res) {

  var redirect_uri = req.protocol + '://' +req.get('host') + '/callback/';
  console.log("Welcome...");
  console.log(redirect_uri);

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-read-private';
  scope += ' user-library-read playlist-modify-public playlist-modify-private';
  scope += ' playlist-read-collaborative'; //Adding Scopes for functionality with Spotify's API
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
        redirect_uri: req.protocol + '://' +req.get('host') + '/callback/', //Variable callback uri for all team Codio accounts
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
          if(body.images.length>0){
            var image_url = body.images[0].url;
          }
          else {
            var image_url = 'img/profile_pic.jpg';
          }
          console.log(image_url);

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
                //Console log to test Session Creation
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
                //Console log to test Session Creation
                console.log('session ID = '+ req.session.id);
                console.log('session User ID = '+ req.session.user_id);
                console.log('session Access Token = '+ req.session.access_token);
                //redirect to home
                res.redirect('/');
              });
            }

          });
        });
        //TODO Change Login Button to Logout

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
  //redirect to log in if not logged in
  if(!req.session.loggedin){res.redirect('/login');return;}

  //Log to test session functionality
  console.log('User ID from Session: ' +req.session.user_id);

  //Get User's Searches from Mongo
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

      //If no errors from the API request
      if (!error && response.statusCode === 200) {
        //Get the details from each playlist and save as a variable
        playlists = body.items;
        console.log(body.items);

        /*
          Attempted handling for an extreme error
          If a user's playlist has no images associated with it
          profile template cannot load due to undefined variable

          Attempts to add a blank image url to the JSON object so field is not empty
        */
        for (var i = 0; i < playlists.length; i++) {
          if(playlists[i].images.length == 0){
            playlists[i].images.push({"height": "200", "url": "img/playlist_cat.jpg"});
            console.log(playlists[i].images[0].url);
          }
        }

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


    // GET Tracks from Spotify
    request.get(options, function(error, response, body) {
      console.log(body.items);

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
 * Searching, Top Tracks and Recommendatoins
 * Author: Nicky ter Maat
 */
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('view engine', 'html');

var artist;
var track;
var query;
var type;
/**
 * /search_form:  Send data from input form to /search
 */
app.post('/search_form', function(req,res) {
  // Clear query, type, artist_id and track_id from memory
  query = ""; type = ""; artist_id = ""; track_id = "";
  artist =  req.body.artistField;
  track = req.body.songField;
  console.log("Collecting search form data...")
  console.log("Body: " + JSON.stringify(req.body));
  res.redirect('/search');
});

/**
 * /search: look for artist or track
 */
app.get('/search', function(req, res) {
  console.log("Searching....");

  //TODO: Check if logged in
  // if(!req.session.loggedin){res.redirect('/login'); return;}
  console.log("Session user_id: " + req.session.user_id);
  console.log("Access Token: " + req.session.access_token);

  var access_token = req.session.access_token;

  if (artist != null && artist.length > 1) {
    query = artist;
    type = "artist";
    console.log("Query - Artist: " + query + " Type: " + type);
  } else if (track != null && track.length > 1) {
    query = track;
    type = "track";
    console.log("Query - Track: " + query + " Type: " + type);
  } else {
    console.log("Invalid query");
  }

  if (access_token != null) {
    var searchOptions = {
      url: 'https://api.spotify.com/v1/search?' +
      querystring.stringify({
        query: query,
        type: type,
        limit: 8
      }),
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };
  }

  // GET request for /search
  request.get(searchOptions, function(error, response, body) {
    if(error) throw error;

    console.log(body);
    if (!error && response.statusCode === 200) {
      console.log("\nSEARCH RESULTS \n");
      if (body.artists) {
        for (var i = 0; i < body.artists.items.length; i++) {
          console.log("\t ARTIST: " + body.artists.items[i].name + " id: " + body.artists.items[i].id);
        }
      } else if (body.tracks) {
        for (var i = 0; i < body.tracks.items.length; i++) {
          console.log("\t TRACK: " + body.tracks.items[i].name + " track_id: " + body.tracks.items[i].id + " artist: " + body.tracks.items[i].artists.name + " artist_id: " + body.tracks.items[i].artists.id);
        }
      }
    } else {
      console.log("Response code: " + response.statusCode + "\nError: " + error);
    }
    //res.send("Search: " + JSON.stringify(body));
    //res.json(body);
    res.render('index.html', body);
  });

  addSearchToDatabase(req.session.user_id, query, type, null, null);
});

/**
 * /top_tracks: Select top tracks for selected artist
 TODO: When artist is selected create app.post where artist_id is send through
 */
app.get('/top_tracks', function(req, res) {
  console.log("Getting artist....");

  //TODO: Check if logged in
  // if(!req.session.loggedin){res.redirect('/login'); return;}
  console.log("Session: " + req.session.session_id);
  console.log("Access Token: " + req.session.access_token);

  // Api call details
  var access_token = req.session.access_token;
  var seed_artists = "12Chz98pHFMPJEknJQMWvI";
  var country_artists = "NL";

  if (access_token != null) {
    var topTrackOptions = {
      url: 'https://api.spotify.com/v1/artists/' + seed_artists + '/top-tracks?' + 'country=' + country_artists,
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };
  } else {
    console.log("Log in first");
  }

  // GET request for /top tracks
  request.get(topTrackOptions, function(error, response, body) {
    if(error) throw error;

    console.log(body);
    if (!error && response.statusCode === 200) {
      if (body.tracks.length > 0) {
        console.log("TOP TRACKS \n");
        for (var i = 0; i < body.tracks.length; i++) {
          console.log("\t TRACK: " + body.tracks[i].name);
        }
      }
    } else {
      console.log("Response code: " + response.statusCode + "\nError: " + error);
    }
    res.send("Search: " + JSON.stringify(body));
  });

  addSearchToDatabase(req.session.user_id, query, type, seed_artists, null);
});

/**
 * /recommend:  Recommend tracks for selected track by artist
 TODO: When recommend-for-this-track is selected create app.post where artist_id and track_id are send through
 */
app.get('/recommend', function(req, res) {
  console.log("Getting recommendations....");

  //TODO: Check if logged in
  // if(!req.session.loggedin){res.redirect('/login'); return;}
  console.log("Session: " + req.session.session_id);
  console.log("Access Token: " + req.session.access_token);

  // Api call details
  var access_token = req.session.access_token;
  var seed_artists = "1hkC9kHG980jEfkTmQYB7t";
  var seed_tracks = "0c6xIDDpzE81m2q797ordA";

  if (access_token != null) {
    var recommendOptions = {
      url: 'https://api.spotify.com/v1/recommendations?' +
      querystring.stringify({
        seed_artists: seed_artists,
        seed_tracks: seed_tracks,
        limit: 8
      }),
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };
  } else {
    console.log("Log in first");
  }

  // GET request for /recommend
  request.get(recommendOptions, function(error, response, body) {
    if(error) throw error;

    console.log(body);
    if (!error && response.statusCode === 200) {
      console.log("RECOMMENDATIONS \n");
      if (body.tracks) {
        for (var i = 0; i < body.tracks.length; i++) {
          console.log("\t TRACK: " + body.tracks[i].name);
        }
    } else {
      console.log("Response code: " + response.statusCode + "\nError: " + error);
    }}
    res.send("Recommendations: " + JSON.stringify(body));
  });

  addSearchToDatabase(req.session.user_id, query, type, seed_artists, seed_tracks);
});

/**
 * addSearchToDatabase: add and update search to database
 */
function addSearchToDatabase(current_user, query, type, artist_id, track_id) {
  // Check if the user is still logged in
  if (current_user != null) {
    db.collection('users').find({user_id: current_user}).toArray(function(err, result) {
      if(err) throw err;

      if (result.length > 0) {
        console.log("User exists: " + JSON.stringify(result[0]));
        db.collection('users').update({user_id: current_user}, {$addToSet: {"searches": [{"query": query}, {"type": type}, {"artist_id": artist_id}, {"track_id": track_id}]}}, {upsert: true}, function(err, result) {
          if (err) {
            throw err;
          }
        });
      } else {
      console.log("User " + req.session.user_id + " does not exist in users collection");
    }});
  } else {
    // TODO: prompt user to login? Redirect?
    console.log("Invalid req.session.user_id");
  }
}
/**
  * End of Search, Top Tracks and Recommendations
*/

//   // Playlist functions
// app.post('/create_pl', function(req, res) {
//   var access_token = req.session.access_token;
//   var user_id = req.session.user_id;
//   var newpl = {
//     name: "New Playlist",
//     description: "New playlist description",
//     public: false
//   };
//   var options = {
//     url: 'https://api.spotify.com/v1/users/'+user_id+'/playlists',
//     headers: { 'Authorization': 'Bearer ' + access_token },
//     body:newpl
//     //json: true
//     };
//   request.post(options, function(err, res, body) {
//     if(!error && response.statusCode === 200){
//       console.log(body);
//     }
//     else{
//       console.log(error);
//     }
//   });
// });

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
