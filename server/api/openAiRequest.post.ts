import fs from 'fs';
import { OpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { ChatOpenAI } from '@langchain/openai';
import {
  RunnableSequence,
  RunnablePassthrough,
  RunnableMap,
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
      vectorStore = await HNSWLib.load(
        VECTOR_STORE_PATH,
        new OpenAIEmbeddings()
      );
      console.log('Vector store loaded successfully.');
    } else {
      throw 'Vector store does not exist. Try calling api/ingest first';
    }

    const retriever = vectorStore.asRetriever();

    const SYSTEM_TEMPLATE = `Use the following pieces of context to answer the question at the end.
    If you don't know the answer, just say that you don't know, don't try to make up an answer.
    ----------------
    {context}`;

    const messages = [
      SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
      HumanMessagePromptTemplate.fromTemplate('{question}'),
    ];

    const prompt = ChatPromptTemplate.fromMessages(messages);

    const sequence = new RunnableSequence({
      first: new RunnableMap({
        steps: {
          context: async ({ question }) => {
            const docs = await retriever.getRelevantDocuments(question);
            const context = docs.map((doc) => doc.pageContent || '').join('\n');
            console.log('Retrieved documents:', context);
            return context;
          },
          question: new RunnablePassthrough(),
        },
      }),
      middle: [prompt],
      last: new RunnableSequence({
        first: model,
        last: new StringOutputParser(),
      }),
    });

    const res = await sequence.invoke({
      question: question,
    });

    console.log('Final response:', res);
    return { message: res };
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  }
});
