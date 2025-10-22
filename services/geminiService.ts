// Fix: Removed non-existent 'FunctionCallPart' and imported 'Content' for use in history.
import { GoogleGenAI, Chat, Part, Content } from "@google/genai";
import { Consultant, ChatMessage, ToolCallResponse } from '../types';
import * as toolService from './toolService';

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

// Fix: The function returns an array of Content objects, not Part objects.
function convertToGeminiHistory(history: ChatMessage[]): Content[] {
    return history.flatMap(msg => {
        if (msg.role === 'tool' && msg.toolCallResponses) {
            return {
                role: 'tool',
                parts: msg.toolCallResponses.map(toolResponse => ({
                    functionResponse: {
                        name: toolResponse.name,
                        response: toolResponse.response,
                    }
                }))
            };
        }
        if (msg.role === 'model' && msg.toolCalls) {
            return {
                role: msg.role,
                parts: msg.toolCalls.map(toolCall => ({
                    functionCall: {
                        name: toolCall.name,
                        args: toolCall.args,
                    }
                }))
            };
        }
        if (msg.role === 'model' || msg.role === 'user') {
            return {
                role: msg.role,
                parts: [{ text: msg.content || '' }]
            };
        }
        return [];
    });
}

export const getChatResponseStream = (
    consultant: Consultant,
    session: Chat | undefined,
    prompt: string,
    history: ChatMessage[]
) => {
    let finalSession: Chat;

    const stream = async function* (): AsyncGenerator<Partial<ChatMessage>, void, undefined> {
        const genAI = getAi();
        let chatSession = session;

        if (!chatSession) {
            // Fix: This now correctly passes Content[] to the history property.
            const genAIHistory = convertToGeminiHistory(history);

            // FIX: The 'tools' parameter should be inside the 'config' object.
            chatSession = genAI.chats.create({
                model: consultant.model,
                history: genAIHistory,
                config: {
                    systemInstruction: consultant.systemInstruction,
                    tools: consultant.tools,
                },
            });
        }
        finalSession = chatSession;

        let stream = await chatSession.sendMessageStream({ message: prompt });
        
        let toolResponses: ToolCallResponse[] = [];

        for await (const chunk of stream) {
            const functionCalls = chunk.functionCalls;
            
            if (functionCalls && functionCalls.length > 0) {
                yield { role: 'model', toolCalls: functionCalls.map(fc => ({ name: fc.name, args: fc.args })) };
                
                for (const call of functionCalls) {
                    const toolResponse = await toolService.executeTool(call.name, call.args);
                    toolResponses.push(toolResponse);
                }
            } else {
                 if (chunk.text) {
                    yield { content: chunk.text };
                }
            }

            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingMetadata && groundingMetadata.length > 0) {
                yield { groundingMetadata: groundingMetadata.map(g => g.web).filter(Boolean) as any };
            }
        }
        
        if (toolResponses.length > 0) {
            yield { role: 'tool', toolCallResponses: toolResponses };
            yield { role: 'model', content: '' };

            // Fix: The previous object was incorrectly typed as 'Part' with a 'role' property
            // and sent with a 'history' property which is not correct for continuing a chat.
            // Sending the tool responses as parts of a new message is the correct approach.
            const toolResponseParts: Part[] = toolResponses.map(toolResponse => ({
                functionResponse: {
                    name: toolResponse.name,
                    response: toolResponse.response,
                }
            }));

            // FIX: The `sendMessageStream` method expects an object with a 'message' property.
            stream = await chatSession.sendMessageStream({ message: toolResponseParts });
            for await (const chunk of stream) {
                if (chunk.text) {
                    yield { content: chunk.text };
                }
            }
        }
    }

    return {
        stream: stream(),
        finalSession: new Promise<Chat>((resolve) => {
            // A bit of a hack to resolve the session after the stream is consumed.
            // In a real app, you might manage session state more explicitly.
            const check = () => {
                if (finalSession) {
                    resolve(finalSession);
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        }),
    };
};
