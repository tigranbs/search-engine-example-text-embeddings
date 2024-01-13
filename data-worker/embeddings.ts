import {QdrantClient} from "@qdrant/js-client-rest";
import axios from "axios";
import {v4 as uuidv4} from "uuid";

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6336",
});


const embeddingsAPI = axios.create({
  baseURL: process.env.EMBEDDINGS_URL ?? 'http://localhost:8888',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

const collectionName = "web_content";

export async function InitQdrant() {
  try {
    await qdrantClient.createCollection(collectionName, {
      vectors: { size: 1024, distance: "Cosine" },
    });
  } catch (e) {
    console.log(e);
  }
}

export async function InsertTextVector(text: string, source_id: string): Promise<string[]> {
  const chunks = Text2Chunks(text);
  let retries = 0;

  while (retries < 50) {
    try {
      const embeddings = await Text2Vector(chunks);

      await qdrantClient.upsert(collectionName, {
        wait: true,
        points: embeddings.map((embedding: number[]) => ({
          id: uuidv4().toString(),
          vector: embedding,
          payload: {
            source_id,
          },
        })),
      });
      return chunks;
    } catch (e) {
      // sleep for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("ERROR INSERTING VECTOR", (e as Error).message);
      retries += 1;
    }
  }

  return [];
}

export function Text2Chunks(text: string) {
  const chunks = [];
  const words = text.split(/(\s)/);
  let word = '';
  for (let i = 0; i < words.length; i += 1) {
    if (word.length + words[i].length > 500) {
      chunks.push(word);
      word = '';
    } else {
      word += words[i] + ' ';
    }
  }
  if (word.length > 0) {
    chunks.push(word.trim());
  }
  return chunks;
}

export async function Text2Vector(textChunks: string[]) {
  const chunks = [...textChunks];

  let results: number[][] = [];

  while (chunks.length > 0) {
    const result = await embeddingsAPI.post('/embed', {
      "inputs": chunks.splice(0, 100),
    });
    results = results.concat(result.data);
  }

  return results;
}

(() => InitQdrant())();
