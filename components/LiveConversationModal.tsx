import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Consultant } from '../types';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { XIcon } from './icons/XIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface LiveConversationModalProps {
  consultant: Consultant;
  onClose: (transcript: Array<{ speaker: 'user' | 'model'; text: string }>) => void;
}

type TranscriptEntry = {
    speaker: 'user' | 'model';
    text: string;
};

// --- Audio Helper Functions (as per Gemini API guidelines) ---
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}
// --- End Audio Helper Functions ---


export const LiveConversationModal: React.FC<LiveConversationModalProps> = ({ consultant, onClose }) => {
    const [status, setStatus] = useState<'requesting' | 'connecting' | 'connected' | 'error' | 'closing'>('requesting');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    
    // Using refs to hold values that change but shouldn't trigger re-renders,
    // and to manage resources that need cleanup.
    const liveSessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const playbackQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);

    const handleClose = useCallback(() => {
        setStatus('closing');
        // Clean up resources
        if (liveSessionRef.current) {
            liveSessionRef.current.close();
            liveSessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (inputAudioContextRef.current?.state !== 'closed') {
            inputAudioContextRef.current?.close();
        }
        if (outputAudioContextRef.current?.state !== 'closed') {
            outputAudioContextRef.current?.close();
        }
        // Stop any pending audio playback
        playbackQueueRef.current.forEach(source => source.stop());
        playbackQueueRef.current.clear();

        onClose(transcript);
    }, [onClose, transcript]);


    useEffect(() => {
        let isMounted = true;

        const startSession = async () => {
            if (!process.env.API_KEY) {
                if(isMounted) {
                    setErrorMessage('API key is not configured.');
                    setStatus('error');
                }
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if(!isMounted) return;
                mediaStreamRef.current = stream;

                setStatus('connecting');

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                
                let currentInputTranscription = '';
                let currentOutputTranscription = '';

                const sessionPromise = ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    callbacks: {
                        onopen: () => {
                           if (!isMounted) return;
                           setStatus('connected');
                           
                           const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                           mediaStreamSourceRef.current = source;
                           
                           const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                           scriptProcessorRef.current = scriptProcessor;

                           scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createBlob(inputData);
                                sessionPromise.then((session) => {
                                  session.sendRealtimeInput({ media: pcmBlob });
                                });
                           };
                           source.connect(scriptProcessor);
                           scriptProcessor.connect(inputAudioContextRef.current!.destination);
                        },
                        onmessage: async (message: LiveServerMessage) => {
                            if (!isMounted) return;

                            // Handle transcription
                            if (message.serverContent?.inputTranscription) {
                                currentInputTranscription += message.serverContent.inputTranscription.text;
                            }
                            if (message.serverContent?.outputTranscription) {
                                currentOutputTranscription += message.serverContent.outputTranscription.text;
                            }
                            if (message.serverContent?.turnComplete) {
                                setTranscript(prev => {
                                    const newTranscript = [...prev];
                                    if(currentInputTranscription.trim()){
                                        newTranscript.push({ speaker: 'user', text: currentInputTranscription.trim() });
                                    }
                                    if(currentOutputTranscription.trim()){
                                        newTranscript.push({ speaker: 'model', text: currentOutputTranscription.trim() });
                                    }
                                    return newTranscript;
                                });
                                currentInputTranscription = '';
                                currentOutputTranscription = '';
                            }

                            // Handle audio playback
                            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                            if (audioData) {
                                const outputCtx = outputAudioContextRef.current!;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                                
                                const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                                
                                const source = outputCtx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputCtx.destination);
                                source.addEventListener('ended', () => {
                                    playbackQueueRef.current.delete(source);
                                });
                                
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                playbackQueueRef.current.add(source);
                            }

                            if (message.serverContent?.interrupted) {
                                playbackQueueRef.current.forEach(source => source.stop());
                                playbackQueueRef.current.clear();
                                nextStartTimeRef.current = 0;
                            }
                        },
                        onerror: (e: ErrorEvent) => {
                            if (!isMounted) return;
                            console.error('Live session error:', e);
                            setErrorMessage('A connection error occurred.');
                            setStatus('error');
                        },
                        onclose: () => {
                            if (!isMounted) return;
                             if (status !== 'closing') {
                                handleClose(); // Proactively close if server closes connection
                            }
                        },
                    },
                    config: {
                        responseModalities: [Modality.AUDIO],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                        systemInstruction: consultant.systemInstruction,
                        inputAudioTranscription: {},
                        outputAudioTranscription: {},
                    },
                });
                liveSessionRef.current = await sessionPromise;

            } catch (err: any) {
                if (isMounted) {
                    console.error("Failed to start live session:", err);
                    setErrorMessage(err.name === 'NotAllowedError' ? 'Microphone access was denied.' : 'Could not access microphone.');
                    setStatus('error');
                }
            }
        };

        startSession();

        return () => {
            isMounted = false;
            // This will call the cleanup logic within handleClose
            if (liveSessionRef.current && status !== 'closing') {
                 handleClose();
            }
        };
    }, []); // Empty dependency array means this effect runs once on mount

     useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const renderStatus = () => {
        switch (status) {
            case 'requesting':
                return { text: "Requesting microphone...", icon: <SpinnerIcon className="w-8 h-8 animate-spin" /> };
            case 'connecting':
                return { text: "Connecting to advisor...", icon: <SpinnerIcon className="w-8 h-8 animate-spin" /> };
            case 'connected':
                return { text: "Listening...", icon: <MicrophoneIcon className="w-8 h-8" /> };
            case 'error':
                return { text: "Error", icon: <XIcon className="w-8 h-8 text-red-500" /> };
            case 'closing':
                return { text: "Session ending...", icon: <SpinnerIcon className="w-8 h-8 animate-spin" /> };
            default:
                return { text: "", icon: null };
        }
    };

    const { text: statusText, icon: statusIcon } = renderStatus();

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="bg-[#2B2D42] w-full max-w-2xl h-[90vh] max-h-[700px] rounded-2xl shadow-2xl flex flex-col text-white">
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-lg font-bold">Live with {consultant.name}</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10" aria-label="Close live session">
                        <XIcon className="w-5 h-5" />
                    </button>
                </header>
                
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                    <div className={`relative flex items-center justify-center w-32 h-32 rounded-full mb-4 transition-colors ${status === 'connected' ? 'bg-[#D90429]' : 'bg-white/10'}`}>
                       {status === 'connected' && <div className="absolute inset-0 rounded-full bg-[#D90429] animate-pulse"></div>}
                        <div className="relative z-10">{statusIcon}</div>
                    </div>
                    <p className="font-semibold text-xl mb-1">{statusText}</p>
                    {status === 'error' && <p className="text-red-400 text-sm">{errorMessage}</p>}
                    {status !== 'error' && <p className="text-white/60 text-sm">Start speaking to the advisor.</p>}
                </div>

                <div className="flex-shrink-0 h-48 bg-black/20 p-4 overflow-y-auto border-t border-white/10">
                    <div className="space-y-3">
                        {transcript.map((entry, index) => (
                            <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <p className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${entry.speaker === 'user' ? 'bg-white/20' : 'bg-[#D90429]/50'}`}>
                                    {entry.text}
                                 </p>
                            </div>
                        ))}
                         <div ref={transcriptEndRef} />
                    </div>
                </div>
                
                <footer className="p-4 border-t border-white/10 flex-shrink-0">
                    <button 
                        onClick={handleClose}
                        className="w-full py-3 bg-[#D90429] text-white font-bold rounded-lg hover:bg-[#EF233C] transition-colors"
                    >
                        End Session
                    </button>
                </footer>
            </div>
        </div>
    );
};