const xml2js = require('xml2js');
const { promisify } = require('util');

const parseString = promisify(new xml2js.Parser().parseString);
const request = promisify(require('request'));

const mongoClient = require('mongodb').MongoClient;
const connectionString = 'mongodb://youtube:youtube@localhost:27017/youtubeVideoDatabase';
const channelsCollection = 'channels';
const mongoOptions = {reconnectTries: 30, reconnectInterval: 1000};

const requestString = 'https://www.youtube.com/feeds/videos.xml?channel_id=';

// calling main method
main();

// main method - get db, get channels, get rss from youtube and insert in mongo
async function main(){
	let db;
	let isSuccess = false;

	try{

		db = await mongoClient.connect(connectionString, mongoOptions);

		const channels = await getChannelsFromMongo(db);

		isSuccess = await requestForChannelRssAndInsertInMongo(channels, db);

	}catch (ex){

		console.log('logging exception: ' + ex);
	} finally{

		if(db == undefined) console.log('Not able to connect to database.');
    else
      db.close();
	}

	console.log('Process Status: ' + isSuccess);
	return;
}

// get channels list from mongo
async function getChannelsFromMongo(db){

	let channels = [];

	const collection = await db.collection(channelsCollection);

	channels = await collection.find({}).toArray();

	return channels;
}

// get rss from youtube and insert it after parsing. Not using forEach as
// inside code is using await
async function requestForChannelRssAndInsertInMongo(channels, db){

	try{

		for(var i = 0; i < channels.length; i++){
			const response = await request(requestString + channels[i]._id, {json: true});

			const body = response.body;
			const bodyString = await parseString(body);

			const entries = bodyString.feed.entry;

			await insertIntoMongo(entries, channels[i], db);
		}
	} catch(ex){
		console.log('Error while fetching from youtube: ' + ex);
		return false;
	}

	return true;
}

// inserting in mongo
async function insertIntoMongo(entries, channel, db){

	const collection = await db.collection(channel.title+'_youtube_rss');

	try{
		entries.forEach((entry) => {

			collection.replaceOne({'_id': entry['yt:videoId'][0]},{'_id': entry['yt:videoId'][0], 'title': entry.title[0], 'author': entry.author[0].name[0],
			'description': entry['media:group'][0]['media:description'][0], 'community': {'starRating': entry['media:group'][0]['media:community'][0]['media:starRating'][0]['$'],
			'statistics': entry['media:group'][0]['media:community'][0]['media:statistics'][0]['$']},
			'published': entry.published[0], 'updated': entry.updated[0]}, { upsert: true }, function(error, result){
				if(error){
					console.log(error);
				}
			});
		});
	} catch(ex){
		console.log(ex);
	}

	return;
}
