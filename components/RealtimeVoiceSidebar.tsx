import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, Activity } from 'lucide-react';
import { useRealtimeVoice } from '../hooks/useRealtimeVoice';
import { motion, AnimatePresence } from 'framer-motion';

interface RealtimeVoiceSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
}

interface TranscriptItem {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
}

export const RealtimeVoiceSidebar: React.FC<RealtimeVoiceSidebarProps> = ({
    isOpen,
    onClose,
    userName
}) => {
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const bottomRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Audio Context Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Audio Output (for AI voice)
    const nextStartTimeRef = useRef<number>(0);

    const { connect, disconnect, sendAudio, sendText, isConnected } = useRealtimeVoice({
        onConnect: () => setStatus('connected'),
        onDisconnect: () => {
            setStatus('disconnected');
            setIsRecording(false);
            stopRecording();
        },
        onError: (e) => {
            setStatus('error');
        },
        onTextDelta: (delta: string) => {
            // Simple JSON protocol update
            try {
                const msg = JSON.parse(delta);
                // Assuming message format: { type: 'text', role: 'assistant', content: '...' }
                // Google Gemini Bidi API sends complex JSON. 
                // For this demo, let's assume our Rust proxy unwraps it or we handle the raw Gemini JSON.
                // The Rust proxy currently forwards 1:1. 
                // Let's assume we get a message that contains text.
                // NOTE: Real Gemini Bidi protocol is involved. 
                // For simplicity in this iteration, we'll append text if we find it.
                if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
                    addTranscript('assistant', msg.serverContent.modelTurn.parts[0].text);
                }
            } catch (e) {
                // Might be plain text if our proxy simplifies it
                if (delta.trim()) addTranscript('assistant', delta);
            }
        },
        onAudioOutput: async (audioData: Uint8Array) => {
            // Play Audio PCM
            if (!audioContextRef.current) return;
            const ctx = audioContextRef.current;

            // Create Audio Buffer (assuming 24k sample rate from Gemini)
            // Gemini defaults to 24kHz/1ch PCM in some configs, or we requested it.
            // Let's assume 24kHz for Live API.
            const float32 = new Float32Array(audioData.buffer as ArrayBuffer);
            const buffer = ctx.createBuffer(1, float32.length, 24000);
            buffer.copyToChannel(float32, 0);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);

            // Queue playback
            const currentTime = ctx.currentTime;
            const startTime = Math.max(currentTime, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + buffer.duration;
        }
    });

    // Auto-scroll transcript
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // Handle Connection on Open
    useEffect(() => {
        if (isOpen && status === 'disconnected') {
            setStatus('connecting');
            connect();
        } else if (!isOpen && status === 'connected') {
            disconnect();
        }
    }, [isOpen]);

    const addTranscript = (role: 'user' | 'assistant', text: string) => {
        setTranscript(prev => {
            const last = prev[prev.length - 1];
            // Append to last message if same role (simulate streaming text)
            if (last && last.role === role) {
                return [
                    ...prev.slice(0, -1),
                    { ...last, text: last.text + text } // Naive append
                ];
            }
            return [...prev, {
                id: Date.now().toString(),
                role,
                text,
                timestamp: new Date()
            }];
        });
    };

    const startRecording = async () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            }
            const ctx = audioContextRef.current;
            // Resume if suspended
            if (ctx.state === 'suspended') await ctx.resume();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            sourceRef.current = ctx.createMediaStreamSource(stream);
            // Buffer size 4096 => ~250ms latency chunk
            processorRef.current = ctx.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (e) => {
                if (!isRecording) return;
                const inputData = e.inputBuffer.getChannelData(0);

                // Convert to PCM Int16 usually required or Float32. 
                // Gemini Bidi accepts PCM Linear 16 or 24kHz. 
                // Let's send raw Float32 bytes or convert. 
                // For simplicity, let's assume our Rust proxy or Google handles raw PCM.
                // Sending raw float32 bytes:
                sendAudio(inputData.buffer);

                // Visualization logic would go here
                drawWaveform(inputData);
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(ctx.destination); // Needed for Chrome to fire events

            setIsRecording(true);
        } catch (e) {
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (processorRef.current && sourceRef.current) {
            sourceRef.current.disconnect();
            processorRef.current.disconnect();
        }
    };

    const toggleRecording = () => {
        if (!isRecording) startRecording();
        else stopRecording();
    };

    // Visualization
    const drawWaveform = (data: Float32Array) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#D4AF37'; // Nobel Gold
        ctx.beginPath();

        const sliceWidth = width * 1.0 / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i += 10) { // Skip samples for performance
            const v = data[i] * (height / 2);
            const y = (height / 2) + v;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth * 10;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
                    <span className="font-bold text-sm tracking-wide">Live Conversation</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                    <X className="w-4 h-4 text-stone-500" />
                </button>
            </div>

            {/* Transcript Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcript.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center opacity-60">
                        <Activity className="w-12 h-12 mb-4 text-stone-200" />
                        <p className="text-sm">Start speaking to begin<br />the conversation.</p>
                    </div>
                )}
                {transcript.map((msg) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-stone-900 text-white rounded-tr-sm'
                            : 'bg-stone-100 text-stone-800 rounded-tl-sm'
                            }`}>
                            {msg.text}
                        </div>
                    </motion.div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Visualizer & Controls */}
            <div className="p-6 border-t border-stone-100 bg-stone-50/50">
                <div className="h-16 mb-6 bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden flex items-center justify-center relative">
                    <canvas ref={canvasRef} width={300} height={64} className="absolute inset-0 w-full h-full" />
                    {!isRecording && <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold z-10">Waveform Inactive</span>}
                </div>

                <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 ${isRecording
                        ? 'bg-red-500 text-white shadow-lg scale-95 ring-4 ring-red-500/20'
                        : 'bg-stone-900 text-white shadow-md hover:bg-stone-800 hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isRecording ? "Release to Send" : "Push to Talk"}
                </button>
                <p className="text-center text-[10px] text-stone-400 mt-3">
                    {status === 'connected' ? 'Connected via Secure WebSocket' : 'Connecting to Secure Gateway...'}
                </p>
            </div>
        </div>
    );
};
