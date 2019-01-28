const xml2js = require('xml2js');
const fs = require('fs');
const mongoClient = require('mongodb').MongoClient;
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const parseString = promisify(new xml2js.Parser().parseString);

const filePath = './subscription_manager.xml';
const fileEncoding = 'utf8';
const connectionString = 'mongodb://youtube:youtube@localhost:27017/youtubeVideoDatabase';
const channelsCollection = 'channels';

const mongoOptions = {reconnectTries: 30, reconnectInterval: 1000};

// calling main ingestion function
ingestion();

// read from file and generate a array of channels
async function fileToChannels(){
  const file = await readFile(filePath, fileEncoding);
  const json = await parseString(file);

  const channels = pushToChannels(json);

  return channels;
}

// create channels array
function pushToChannels(json){
  channels = [];

  json.opml.body[0].outline[0].outline.forEach((item) => {

    channel = {title: '', _id: ''};

    channel.title = item.$.title.replace('\'', '').split(' ').join('_');
    channel._id = item.$.xmlUrl.split('channel_id=')[1];

    channels.push(channel);
  });

  return channels;
}

// ingesting to mongo
async function ingestIntoMongo(channels){

  let db;
  let isSuccess = false;

  try{
    db = await mongoClient.connect(connectionString, mongoOptions);
    const collection = await db.collection(channelsCollection);

    isSuccess = await pushToMongoCollection(channels, collection);
  } finally {
    if(db == undefined) console.log('Not able to connect to database.');
    else
      db.close();
  }

  return isSuccess;
}

// pushing to mongo collection
async function pushToMongoCollection(channels, collection){

  try{

    channels.forEach((item => {
      collection.replaceOne({'_id': item._id}, item, { upsert: true }, function(error, result){
        if(error){ console.log(error); }
      });
    }));

  } catch(ex){
    console.log(ex);
    return false;
  }

  return true;
}

// main ingestion function
async function ingestion() {
  let ingestedIntoMongo = false;

  try{
    const channels = await fileToChannels();

    ingestedIntoMongo = await ingestIntoMongo(channels);

  } catch(ex){
    console.log('logging exception: ' + ex);
  }

  console.log('Ingestion Status: ' + ingestedIntoMongo);
  return;
}
