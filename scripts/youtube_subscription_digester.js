const xml2js = require('xml2js');
const parser = new xml2js.Parser();
const fs = require('fs');
const mongoClient = require('mongodb').MongoClient;

channels = [];

fs.readFile( './subscription_manager.xml', 'utf8', function(err, data) {
    parser.parseString(data, function (error, json){
		
		json.opml.body[0].outline[0].outline.forEach((item) => {
			
			channel = {title: '', _id: ''};
			
			channel.title = item.$.title.replace('\'', '').split(' ').join('_');
			channel._id = item.$.xmlUrl.split('channel_id=')[1];
			
			channels.push(channel);
		});
		
		mongoClient.connect("mongodb://youtube:youtube@localhost:27017/youtubeVideoDatabase", function(error, db){
		  if(error){
			return console.log(error);
		  }

		  db.collection("channels", function(error, collection){
			if(error){
			  db.close();
			  return console.log(err);
			}
			
			channels.forEach((item => {
				collection.replaceOne({'_id': item._id}, item, { upsert: true }, function(error, result){
				  if(error){ console.log(error); }
			  });
			}));
		  });

		  db.close();
		  return;
		});
	});
});