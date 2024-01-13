![The Search Project With Text Embeddings](https://i.imgur.com/j9KLke6.png)

## About

This project has been created to demonstrate how we can build modern Search Engines using a straightforward structure of Text Embeddings (Huggingface Transformers) and a Vector Database.

As a basis for the search data, I used CommonCrawl’s last six months of crawled website data, but because it took almost two weeks on my laptop (M1 Max) to Vectorize ~1mln domains, I assume anyone who will use this repository would not try to vectorize entire dataset 🤷‍♂️

## What you will need

To run this project locally, you will **NEED!**

- Node.js / NPM - for `data-worker` and `webapp` (Next.js)
- Docker, Docker Compose - for running MongoDB and QDrant databases
- Rust + Cargo - for compiling and running [Huggingface text-embeddings](https://github.com/huggingface/text-embeddings-inference?tab=readme-ov-file#docker-build)

This project was not optimized for Production, so there is no “one command” production deployment implementation. This will be an example of how to build a Search for your website to make results more like Google (kind of…)

## Huggingface Text Embeddings Interface

You will find more information on using the Huggingface Text Embeddings Interface on their official [Github Page](https://github.com/huggingface/text-embeddings-inference?tab=readme-ov-file#docker-build). Still, for the context of this repository, I have been interested in compiling it for the MacOS M1 and using it with the M1 Max Metal GPU, which is available only via direct compilation. You can use the Intel-based processors’ Docker containers, which are prebuilt and available for NVIDIA GPUs.

The commands below will clone the Text Embeddings Interface and build them for the MacOS Metal driver to use M1 processor GPUs.

```bash
git clone https://github.com/huggingface/text-embeddings-inference.git
cd text-embeddings-inference
cargo install --path router -F candle -F metal
```

It might take a few minutes and 100% of your CPU, so grab a coffee meantime ☕️

## CommonCrawl Data Worker

The `data-worker` directory contains a simple Node.js scripts, which are designed to download specified CommonCrawl data timeframe and start Vectorizing the text content from crawled HTML and saving results as a Vectories to QDrant database and MongoDB for later Search reference.

It is important to note that the amount of data is enormous for a “local run”, so don’t try to wait until the vectorization completed, it will take months in a row to complete this if it will even fit on your laptop. After 2 weeks of execution, I just gave up, because it took almost 300GB of storage and I had only 4% done from that 6 months of CommonCrawl dataset.

## WebApp

The `webapp` itself is very simple Next.js app with a Tailwind CSS and some custom files inside `webapp/src/utils` directory, where I have functionality of connecting to MongoDB, Qdrant databases and also requests to Text Embeddings Interface to vectorize the search text before performing an actual Search Request.

## Running Locally

Those commands below are the steps to run this project locally and start vectorizing and searching the CommonCrawl dataset.

1. **New Terminal:** **Run the Text Embeddings Interface using** `BAAI/bge-large-en-v1.5` MTEB Model for vectoriztion

```bash

cd text-embeddings-inference
text-embeddings-router --model-id BAAI/bge-large-en-v1.5 --max-client-batch-size 5000 --port 8888
```

2.**New Terminal: Clone this Repository and run the Docker Compose services for MongoDB and Qdrant**

```bash
git clone git@github.com:tigranbs/search-engine-example-text-embeddings.git
cd search-engine-example-text-embeddings
docker compose up -d
```

3.**New Terminal: Run Data Worker to start vectorizing the Search data by downloading the CommonCrawl files and sending that to Text Embeddings interface**

```bash
cd search-engine-example-text-embeddings
cd data-worker
npm i
npm start
```

4**New Terminal: Run Webapp to start searching**

```bash
cd search-engine-example-text-embeddings
cd webapp
npm i
npm run dev
```

After those steps you should be able to navigate to the http://localhost:3000 and see the Search page, which will work directly with the MongoDB and Qdrant on top of already syncronized texts you will already have.
