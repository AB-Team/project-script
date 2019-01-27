const request = require('request');
const xml2js = require('xml2js');
const parser = new xml2js.Parser();
const mongoClient = require('mongodb').MongoClient;

mongoClient.connect("mongodb://youtube:youtube@localhost:27017/youtubeVideoDatabase", function(error, db){
	if(error){
		return console.log(error);
	}

	db.collection('channels', function(error, collection){
		if(error){
		  db.close();
		  return console.log(err);
		}

		collection.find({}).toArray(function(error, channels){
			if(error){
				db.close();
				return console.log(error);
			}
			
			channels.forEach((channel) => {
				request('https://www.youtube.com/feeds/videos.xml?channel_id='+channel._id, { json: true }, (err, res, body) => {
					if (err) { return console.log(err); }
				  
					parser.parseString(body, function(error, result){
						if(error) { return console.log(error); }

					db.collection(channel.title+"_youtube_rss", function(error, coll){
						if(error){
						  return console.log(err);
						}

						var entries = result.feed.entry;
						
						entries.forEach((entry) => {
						  coll.replaceOne({'_id': entry['yt:videoId'][0]},{'_id': entry['yt:videoId'][0], 'title': entry.title[0], 'author': entry.author[0].name[0], 
						  'description': entry['media:group'][0]['media:description'][0], 'community': {'starRating': entry['media:group'][0]['media:community'][0]['media:starRating'][0]['$'],
						  'statistics': entry['media:group'][0]['media:community'][0]['media:statistics'][0]['$']},
						  'published': entry.published[0], 'updated': entry.updated[0]}, { upsert: true }, function(error, result){
								if(error){ 
									return console.log(error); 
								}
							  
						  });						  
						});												
					  });					
				  });
				});
			});	
		});
	});	
});