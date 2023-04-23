import fs from 'fs';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { CustomPDFLoader } from '../utils/customPDFLoader';
import { VECTOR_STORE_PATH, INPUT_DOCS_PATH } from '../consts/paths';

export default defineEventHandler(async (event) => {
    try {
        if (fs.existsSync(VECTOR_STORE_PATH)) {
            console.log("Vector already exists exists")
            return {
                status: 200,
                message: "Vector already exists!",
                error: null
            }
        }
        console.log("Creating new Vector")

        const directoryLoader = new DirectoryLoader(INPUT_DOCS_PATH, {
            '.pdf': (path) => new CustomPDFLoader(path),
        });
        const rawDocs = await directoryLoader.load();
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const docs = await textSplitter.splitDocuments(rawDocs);
        const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings());
        await vectorStore.save(VECTOR_STORE_PATH);

        return {
            status: 200,
            message: "Ingest complete!",
            error: null
        }
    } catch (error) {
        console.error("Error", error)
        return {
            status: 501,
            message: "Error!",
            error
        }
    }
})