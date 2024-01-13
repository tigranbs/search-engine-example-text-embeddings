'use server'

import {MongoClient, Binary, ObjectId} from 'mongodb';


const globalMongo = globalThis as unknown as { mongo: MongoClient };
const DB_NAME = process.env.DB_NAME ?? 'app';
const DB_URI = process.env.MONGO_URL ?? 'mongodb://localhost:27019';


export async function GetClient() {
  'use server';

  if (globalMongo.mongo) {
    return globalMongo.mongo;
  }

  const client = new MongoClient(DB_URI);
  globalMongo.mongo = client;
  return client.connect();
}

export async function getDB() {
  'use server';

  const client = await GetClient();
  return client.db(DB_NAME);
}

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

export async function getContentCollection() {
  const db = await getDB();
  return db.collection<ContentModel>('contents');
}


export async function getUrlCollection() {
  const db = await getDB();
  return db.collection<UrlModel>('urls');
}
