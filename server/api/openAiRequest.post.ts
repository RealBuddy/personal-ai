import fs from 'fs';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { formatDocumentsAsString } from 'langchain/util/document';
import {
  RunnablePassthrough,
  RunnableSequence,
} from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import { type ChatRequest } from '~/types/request';
import { VECTOR_STORE_PATH } from '../consts/paths';
import { sleep } from '../utils/global.utils';

export default defineEventHandler(async (event) => {
  if (useRuntimeConfig().public.devMode) {
    await sleep(1000);
    return { message: 'DEBUG MESSAGE!' };
  }

  try {
    const model = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1,
    });

    const { question } = await readBody<ChatRequest>(event);
    console.log('Received question:', question);

    let vectorStore;
    if (fs.existsSync(VECTOR_STORE_PATH)) {
      vectorStore = await FaissStore.load(
        VECTOR_STORE_PATH,
        new OpenAIEmbeddings()
      );
      console.log('Vector store loaded successfully.');
    } else {
      throw 'Vector store does not exist. Try calling api/ingest first';
    }

    const vectorStoreRetriever = vectorStore.asRetriever();

    const SYSTEM_TEMPLATE = `
    Use the following pieces of context to answer the question at the end.
    If you don't know the answer, just say that you don't know and suggest to talk to Alex, don't try to make up an answer.
    ----------------
    {context}`;

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
      HumanMessagePromptTemplate.fromTemplate('{question}'),
    ]);

    const chain = RunnableSequence.from([
      {
        context: vectorStoreRetriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    const res = await chain.invoke(String(question));

    console.log('Final response:', res);
    return { message: res };
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  }
});
