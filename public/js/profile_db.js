//Get User Searches from Mongo
//TODO Catch if no searches
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
      //Display searches on page
      /*for (var i = 0; i < searches.length; i++) {
        var type = searches[i].type;
        var name = searches[i].name;
      }*/


    }


});
