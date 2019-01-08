const request = require('request');
const xml2js = require('xml2js');
const parser = new xml2js.Parser();
const mongoClient = require('mongodb').MongoClient;

channels = [{'name': 'Bundesliga', 'channel_id': 'UC6UL29enLNe4mqwTfAyeNuw'},
			{'name': 'LaLiga_Santander', 'channel_id': 'UCTv-XvfzLX3i4IGWAm4sbmA'}];

channels.forEach((channel) => {
	request('https://www.youtube.com/feeds/videos.xml?channel_id='+channel.channel_id, { json: true }, (err, res, body) => {
	  if (err) { return console.log(err); }
	  parser.parseString(body, function(error, result){
		if(error) { return console.log(error); }

		mongoClient.connect("mongodb://youtube:youtube@localhost:27017/youtubeVideoDatabase", function(error, db){
		  if(error){
			return console.log(error);
		  }

		  db.collection(channel.name+"_youtube_rss", function(error, collection){
			if(error){
			  db.close();
			  return console.log(err);
			}

			var entries = result.feed.entry;
			
			entries.forEach((entry) => {
			  collection.replaceOne({'_id': entry['yt:videoId'][0]},{'_id': entry['yt:videoId'][0], 'title': entry.title[0], 'author': entry.author[0].name[0], 
			  'description': entry['media:group'][0]['media:description'][0], 'community': {'starRating': entry['media:group'][0]['media:community'][0]['media:starRating'][0]['$'],
			  'statistics': entry['media:group'][0]['media:community'][0]['media:statistics'][0]['$']},
			  'published': entry.published[0], 'updated': entry.updated[0]}, { upsert: true }, function(error, result){
				  if(error){ console.log(error); }
			  });
			  
			});
		  });

		  db.close();
		  return;
		});
	  });
	});
});
