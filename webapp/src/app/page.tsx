import {SearchContentEmbeddings} from "@/utils/embeddings";
import {getContentCollection, getUrlCollection} from "@/utils/mongo";
import * as zlib from "zlib";
import {BSON} from "bson";

interface Props {
  searchParams: {
    q?: string;
  };
}

interface SearchResult {
  id: string;
  title: string;
  url: string;
}

export default async function Home({ searchParams }: Props) {
  const {q: searchQuery} = searchParams;
  let searchItems: SearchResult[] = [];
  if (searchQuery) {
    searchItems = await SearchContent(searchQuery);
  }

  return (
    <div className="bg-white">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
        <div className="mx-auto max-w-screen-xl py-32">
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div
              className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
              Watch the full Youtube Video Here.{' '}
              <a href="https://youtube.com/@tigrantech" className="font-semibold text-indigo-600">
                <span className="absolute inset-0" aria-hidden="true"/>
                Read more <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              NOT Google 🤷‍♂️
            </h1>
            <p className="mt-6 text-sm leading-8 text-gray-600">
              This search is based on CommonCrawl Text Embeddings data, which is not complete. It might take a few
              months on a single laptop to vectorize the entire CommonCrawl dataset.
            </p>
            <form action="">
              <div className="relative mt-2 flex items-center">
                <input
                  type="text"
                  name="q"
                  id="search"
                  defaultValue={searchQuery}
                  className="px-3 block w-full rounded-md border-0 py-1.5 pr-14 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                  <kbd
                    className="inline-flex items-center rounded border border-gray-200 px-1 font-sans text-xs text-gray-400">
                    ⏎
                  </kbd>
                </div>
              </div>
            </form>
        </div>

          <div className="mt-8">
            <ul role="list" className="divide-y divide-gray-100">
              {searchItems.map((item) => (
                <li
                  key={item.id}
                  className="my-4"
                >
                  <a href={item.url} className="hover:underline">
                    <p className="text-sm font-semibold leading-6 text-gray-900 pt-2 line-clamp-2">
                      {item.title}
                    </p>
                  </a>
                  <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                    <p className="truncate">
                      {item.url}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

async function SearchContent(query: string) {
  const contentIds = await SearchContentEmbeddings(query, 500, 0);
  const contentCollection = await getContentCollection();
  const urlsCollection = await getUrlCollection();

  const urlResults: Record<string, SearchResult> = {};

  for (const contentId of contentIds) {
    const content = await contentCollection.findOne({
      id: contentId
    });

    if (!content) {
      continue;
    }

    if (content.url_id in urlResults) {
      continue;
    }

    const urlItem = await urlsCollection.findOne({id: content.url_id});
    if (!urlItem) {
      continue;
    }

    const contentText: string = await new Promise((resolve, reject) => {
      zlib.gunzip(content.text_gzip.buffer, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.toString());
        }
      });
    });

    urlResults[content.url_id] = {
      id: content.id,
      title: contentText.slice(0, 300),
      url: urlItem.url,
    };
  }

  return Object.values(urlResults);
}
