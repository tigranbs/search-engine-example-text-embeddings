'use server'

import {QdrantClient} from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL ?? "http://localhost:6336",
});

const embeddingsAPIURL = process.env.EMBEDDINGS_API_URL ?? 'http://localhost:8888';

async function GetTextEmbeddings(text: string) {
  const result = await fetch(`${embeddingsAPIURL}/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text.substring(0, 500),
    }),
  });
  const [embedding] = await result.json();
  return embedding;
}

export async function SearchContentEmbeddings(text: string, limit: number, offset: number): Promise<string[]> {
  const embeddings = await GetTextEmbeddings(text);
  try {
    const items = await client.search('web_content',{
      vector: embeddings,
      with_payload: true,
      limit,
      offset,
      score_threshold: 0.4,
    });
    return items.map((item) => item.payload?.source_id).filter((item) => !!item) as string[];
  } catch (e) {
    console.log(e);
    throw e;
  }
}
