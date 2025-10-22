import { GoogleGenAI, Chat } from "@google/genai";
import { Consultant } from '../types';

let ai: GoogleGenAI | null = null;

const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

export const getChatResponse = async (
    consultant: Consultant,
    session: Chat | undefined,
    prompt: string
): Promise<{ response: string; updatedSession: Chat; }> => {
    const genAI = getAi();
    let chatSession = session;

    if (!chatSession) {
        chatSession = genAI.chats.create({
            model: consultant.model,
            config: {
                systemInstruction: consultant.systemInstruction,
            },
        });
    }

    const result = await chatSession.sendMessage({ message: prompt });
    
    return {
        response: result.text,
        updatedSession: chatSession
    };
};
