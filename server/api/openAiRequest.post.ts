import fs from 'fs';
import { OpenAI } from 'langchain/llms/openai';

import { RetrievalQAChain } from 'langchain/chains';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { ChatRequest } from '~/types/request';
import { VECTOR_STORE_PATH } from '../consts/paths';
import { sleep } from '../utils/global.utils';

export default defineEventHandler(async (event) => {
  if (useRuntimeConfig().public.devMode) {
    await sleep(1000);
    return { message: 'DEBUG MESSAGE!' };
  }

  try {
    const model = new OpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1,
    });

    const { question } = await readBody<ChatRequest>(event);
    console.log('🚀 ~ defineEventHandler ~ question:', question);

    let vectorStore;
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      vectorStore = await HNSWLib.load(
        VECTOR_STORE_PATH,
        new OpenAIEmbeddings()
      );
    } else {
      throw 'Vector store does not exist. Try calling api/ingest first';
    }

    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());

    const res = await chain.call({
      query: question,
    });

    return { message: res.text };
  } catch (error) {
    // @ts-ignore unknown type
    console.error(error.response);

    // @ts-ignore unknown type
    throw error.response;
  }
});
