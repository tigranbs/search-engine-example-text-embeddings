import axios from "axios";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as readline from "readline";
import {InsertTextVector} from "./embeddings";
import {contentsCollection, crawlFilesCollection, urlsCollection} from "./mongo";
import {Binary} from "mongodb";


const CC_SNAPSHOTS = [
  'CC-MAIN-2023-50',
  // 'CC-MAIN-2023-40',
  // 'CC-MAIN-2023-23',
];

const STORAGE_PATH = path.join(__dirname, '..', 'storage');

async function DownloadWAT(snapshot: string) {
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH);
  }

  const response = await axios.get(`https://data.commoncrawl.org/crawl-data/${snapshot}/wet.paths.gz`, {
    responseType: 'stream',
  });
  const writeStream = fs.createWriteStream(path.join(STORAGE_PATH, `${snapshot}.wet.paths`));
  const gunzip = zlib.createGunzip();
  return new Promise((resolve, reject) => {
    response.data.pipe(gunzip).pipe(writeStream)
      .on('error', reject)
      .on('finish', () => resolve(null));
  });
}

async function DownloadWET(wetFileURI: string): Promise<string> {
  if (!fs.existsSync(STORAGE_PATH)) {
    fs.mkdirSync(STORAGE_PATH);
  }

  console.log(`Downloading WET file ${wetFileURI}`);

  const response = await axios.get(`https://data.commoncrawl.org/${wetFileURI}`, {
    responseType: 'stream',
  });
  const filename = path.join(STORAGE_PATH, `${crypto.createHash('md5').update(wetFileURI).digest('hex')}.wet`);
  const writeStream = fs.createWriteStream(filename);
  const gunzip = zlib.createGunzip();
  return new Promise((resolve, reject) => {
    response.data.pipe(gunzip).pipe(writeStream)
      .on('error', reject)
      .on('finish', () => resolve(filename));
  });
}

async function VectorizeWET(watFileURI: string) {
  const file_id = crypto.createHash('sha1').update(watFileURI).digest('hex');
  const crawlFile = await crawlFilesCollection.findOne({
    id: file_id,
  });
  if (crawlFile) {
    console.log(`Skipping ${watFileURI}`);
    return;
  }
  const wetFile = await DownloadWET(watFileURI);

  const wetFileReadable = fs.createReadStream(wetFile);
  const rl = readline.createInterface({
    input: wetFileReadable,
    crlfDelay: Infinity,
  });

  let isContent = false;
  let startOfContent = false;
  let startOfHeader = false;
  let webPageURI = '';
  let previousLine = new Date().toISOString();

  for await (const line of rl) {
    if (line.startsWith('WARC/1.0') && previousLine === '') {
      startOfHeader = true;
      webPageURI = '';
      isContent = false;
      startOfContent = false;
    }
    const lineText = line.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, ' ');
    if (isContent && line.split(' ').length >= 5 && lineText.length > 50) {
      const text_id = crypto.createHash('sha1').update(webPageURI + lineText).digest('hex');
      await InsertTextVector(lineText, text_id);
      const text_gz: Buffer = await new Promise((resolve, reject) => {
        zlib.gzip(lineText, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      await contentsCollection.findOneAndUpdate({
        id: text_id,
      }, {
        $set: {
          id: text_id,
          url_id: crypto.createHash('sha1').update(webPageURI).digest('hex'),
          text_gzip: new Binary(text_gz),
        }
      }, {
        upsert: true,
      });

      console.log(`Inserted ${text_id} for URL ${webPageURI}`);
    }

    if (startOfContent && line.length === 0) {
      isContent = true;
    }

    if (startOfHeader && line.startsWith('WARC-Target-URI: ')) {
      webPageURI = line.replace('WARC-Target-URI: ', '');
      const url_id = crypto.createHash('sha1').update(webPageURI).digest('hex')
      await urlsCollection.findOneAndUpdate({
        id: url_id,
      }, {
        $set: {
          id: url_id,
          url: webPageURI,
        }
      }, {
        upsert: true,
      });
      console.log(`Found New URL ${webPageURI}`);
    }

    if (line.startsWith('Content-Length: ') && startOfHeader) {
      startOfContent = true;
      startOfHeader = false;
    }

    previousLine = line;
  }

  await crawlFilesCollection.findOneAndUpdate({
    id: file_id,
  }, {
    $set: {
      id: file_id,
    }
  }, {
    upsert: true,
  });

  console.log(`Finished processing ${watFileURI}`);
  await fs.promises.unlink(wetFile);
}


(async () => {
  for (const snapshot of CC_SNAPSHOTS) {
    console.log(`Downloading WAT PATHs for ${snapshot}`);
    await DownloadWAT(snapshot);
    console.log(`Extracting WET files for ${snapshot}`);

    const watPathsFileReadable = fs.createReadStream(path.join(STORAGE_PATH, `${snapshot}.wet.paths`));
    const rl = readline.createInterface({
      input: watPathsFileReadable,
      crlfDelay: Infinity,
    });

    const concurrentWorkers = 2;
    const workerPool = new Set<Promise<unknown>>();

    for await (const watFileURI of rl) {
      workerPool.add(VectorizeWET(watFileURI));
      if (workerPool.size >= concurrentWorkers) {
        await Promise.all(workerPool);
        workerPool.clear();
      }
    }
  }
})();

