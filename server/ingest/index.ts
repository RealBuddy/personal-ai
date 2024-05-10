import fs from 'fs';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { CustomPDFLoader } from '../utils/customPDFLoader';
import { VECTOR_STORE_PATH, INPUT_DOCS_PATH } from '../consts/paths';

const ingest = async () => {
  try {
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      console.log('Vector store already exists');
      return;
    }

    console.log('Creating new Vector store');

    const directoryLoader = new DirectoryLoader(INPUT_DOCS_PATH, {
      '.pdf': (path) => new CustomPDFLoader(path),
    });
    const rawDocs = await directoryLoader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = await FaissStore.fromDocuments(docs, embeddings);
    await vectorStore.save(VECTOR_STORE_PATH);

    console.log('Ingest complete!');
  } catch (error) {
    console.error('Error during ingestion:', error);
  }
};

ingest();
