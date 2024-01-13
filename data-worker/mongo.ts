import {Binary, MongoClient, ObjectId} from 'mongodb';

const client = new MongoClient(process.env.MONGO_URL ?? "mongodb://localhost:27019");
const db = client.db('app');

export interface UrlModel {
  _id?: ObjectId;

  id: string; // sha1 of url
  url: string;
}

export interface ContentModel {
  _id?: ObjectId;

  id: string; // sha1 of the text
  url_id: string; // sha1 of url
  text_gzip: Binary;
}

export interface CrawlFileModel {
  _id?: ObjectId;

  id: string; // sha1 of the file
}

export const urlsCollection = db.collection<UrlModel>('urls');
export const contentsCollection = db.collection<ContentModel>('contents');
export const crawlFilesCollection = db.collection<CrawlFileModel>('crawl_files');


urlsCollection.createIndex({ id: 1 }, { unique: true });
contentsCollection.createIndex({ id: 1 }, { unique: true });
crawlFilesCollection.createIndex({ id: 1 }, { unique: true });
