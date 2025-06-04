import { Mistral } from '@mistralai/mistralai';

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({apiKey: "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ"});

const embeddingsResponse = await client.embeddings.create({
    model: 'mistral-embed',
    inputs: ["who are you"],
});

console.log(embeddingsResponse);