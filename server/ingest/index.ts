import fs from 'fs';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { CustomPDFLoader } from '../utils/customPDFLoader';
import { VECTOR_STORE_PATH, INPUT_DOCS_PATH } from '../consts/paths';
import { sleep } from '../utils/global.utils';

const ingest = async () => {
  // if (useRuntimeConfig().public.devMode) {
  //     await sleep(1000);

  //     console.log({
  //         status: 200,
  //         message: "Ingest complete! - DEBUG",
  //         error: null
  //     })
  // }

  try {
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      console.log('Vector already exists exists');
      console.log({
        status: 200,
        message: 'Vector already exists!',
        error: null,
      });
    }
    console.log('Creating new Vector');

    const directoryLoader = new DirectoryLoader(INPUT_DOCS_PATH, {
      '.pdf': (path) => new CustomPDFLoader(path),
    });
    const rawDocs = await directoryLoader.load();
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    const vectorStore = await HNSWLib.fromDocuments(
      docs,
      new OpenAIEmbeddings({
        openAIApiKey: '',
      })
    );
    await vectorStore.save(VECTOR_STORE_PATH);

    console.log({
      status: 200,
      message: 'Ingest complete!',
      error: null,
    });
  } catch (error) {
    console.error('Error', error);
    console.log({
      status: 501,
      message: 'Error!',
      error,
    });
  }
};

ingest();
