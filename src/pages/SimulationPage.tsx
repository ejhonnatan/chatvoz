import { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff,
  Volume2, 
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { blink } from '../lib/blink';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

interface Survey {
  id: string;
  name: string;
  systemPrompt: string;
}

type ConversationMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export function SimulationPage() {
  const { t, i18n } = useTranslation();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [transcription, setTranscription] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    fetchSurveys();
    return () => {
      stopStream();
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchSurveys = async () => {
    try {
      const data = await blink.db.surveys.list();
      setSurveys(data as Survey[]);
      if (data.length > 0) setSelectedSurvey(data[0].id);
    } catch (error) {
      toast.error(t('common.loading'));
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    mediaRecorderRef.current?.stop();
  };
  
  const clearRecordingTimeout = () => {
    if (recordingTimeoutRef.current !== null) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const ensureAudioContext = (): AudioContext | null => {
    if (audioContextRef.current) return audioContextRef.current;
    if (typeof window === 'undefined') return null;
    const AudioConstructor = (window.AudioContext ?? (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AudioConstructor) return null;
    audioContextRef.current = new AudioConstructor();
    return audioContextRef.current;
  };

  const resumeAudioContext = async () => {
    const context = ensureAudioContext();
    if (!context) return;
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        console.warn('AudioContext resume failed', error);
      }
    }
  };

  const getBlinkErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (!error || typeof error !== 'object') {
      return fallbackMessage;
    }

    const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
    const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;

    if (status === 402 || message.toLowerCase().includes('insufficient credits')) {
      return t('simulation.aiInsufficientCredits');
    }

    return fallbackMessage;
  };

  const processAIResponse = async (userText: string) => {
    setIsProcessing(true);
    try {
      const newMessages = [...messages, { role: 'user' as const, content: userText }];
      setMessages(newMessages);

      const { text } = await blink.ai.generateText({
        messages: newMessages,
        maxTokens: 150
      });

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
      await speak(text);
    } catch (error) {
      console.error('AI Processing error:', error);
      toast.error(getBlinkErrorMessage(error, t('simulation.aiProcessingFailed')));
    } finally {
      setIsProcessing(false);
    }
  const cleanupAudioSource = () => {
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
  };

  const stopSpeechSynthesis = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    speechSynthesisRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      recorder.onstop = handleRecordingComplete;
      recorder.start();
      setIsRecording(true);
      setTranscription('Listening...');
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 6000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    clearRecordingTimeout();
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
  };

  const handleRecordingComplete = async () => {
    setIsProcessing(true);
    setTranscription(t('simulation.thinking'));
    
    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const base64 = await blobToBase64(audioBlob);
      
      const { text } = await blink.ai.transcribeAudio({
        audio: base64,
        language: i18n.language // Respect selected UI language for transcription
      });
      
      setTranscription(text);
      if (text.trim()) {
        await processAIResponse(text);
      } else {
        // If silence, try listening again or prompt user
        setTranscription('Silence detected. Try again.');
        setTimeout(() => {
          if (status === 'connected') startRecording();
        }, 1500);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      toast.error(getBlinkErrorMessage(error, t('simulation.transcriptionFailed')));
    } finally {
      setIsProcessing(false);
      chunksRef.current = [];
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const speakWithSpeechSynthesis = (text: string) => {
    return new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking(false);
        resolve();
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = i18n.language === 'es' ? 'es-ES' : 'en-US';
      utterance.onend = () => {
        setIsSpeaking(false);
        speechSynthesisRef.current = null;
        if (status === 'connected') {
          startRecording();
        }
        resolve();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        speechSynthesisRef.current = null;
        resolve();
      };
      speechSynthesisRef.current = utterance;
      synth.speak(utterance);
    });
  };

  const speak = async (text: string) => {
    setIsSpeaking(true);
    cleanupAudioSource();
    stopSpeechSynthesis();
    try {
      await resumeAudioContext();
      const { url } = await blink.ai.generateSpeech({
        text,
        voice: i18n.language === 'es' ? 'echo' : 'nova',
      });
      
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;

      const context = ensureAudioContext();
      if (context) {
        try {
          const source = context.createMediaElementSource(audio);
          source.connect(context.destination);
          audioSourceRef.current = source;
        } catch (error) {
          console.warn('Media element source connection failed', error);
        }
      }
      
      audio.onended = () => {
        setIsSpeaking(false);
        cleanupAudioSource();
        if (status === 'connected') {
          startRecording();
        }
      };
      audio.onerror = () => {
        console.warn('Audio playback failed, falling back to speech synthesis.');
      };
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      await speakWithSpeechSynthesis(text);
    }
  };

  const processAIResponse = async (userText: string, history?: ConversationMessage[]) => {
    setIsProcessing(true);
    try {
      const baseMessages = history ?? messagesRef.current;
      const requestMessages = [...baseMessages, { role: 'user' as const, content: userText }];
      setMessages(requestMessages);
      messagesRef.current = requestMessages;

      const { text } = await blink.ai.generateText({
        messages: requestMessages,
        maxTokens: 150
      });

      const assistantMessage = { role: 'assistant', content: text };
      setMessages(prev => {
        const next = [...prev, assistantMessage];
        messagesRef.current = next;
        return next;
      });
      await speak(text);
    } catch (error) {
      console.error('AI Processing error:', error);
      toast.error('AI processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCall = async () => {
    await resumeAudioContext();
    if (!selectedSurvey) {
      toast.error(t('simulation.chooseSurvey'));
      return;
    }

    const survey = surveys.find(s => s.id === selectedSurvey);
    if (!survey) return;

    setStatus('calling');
    
    // Domain-specific system prompt enhancement based on selected language
    const languageInstruction = i18n.language === 'es' 
      ? "Please conduct the entire survey in Spanish." 
      : "Please conduct the entire survey in English.";
      
    const initialSystemMessages = [{ role: 'system', content: `${survey.systemPrompt}\n\n${languageInstruction}` }];
    setMessages(initialSystemMessages);
    messagesRef.current = initialSystemMessages;
    
    // Simulate connection delay
    setTimeout(async () => {
      setStatus('connected');
      // Initial greeting from AI
      const initialPrompt = i18n.language === 'es' 
        ? "Saluda y comienza la encuesta de forma natural."
        : "Say hello and start the survey naturally.";
      await processAIResponse(initialPrompt, initialSystemMessages);
    }, 2000);
  };

  const endCall = () => {
    setStatus('ended');
    stopStream();
    setIsRecording(false);
    setIsSpeaking(false);
    stopSpeechSynthesis();
    cleanupAudioSource();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('simulation.title')}</h1>
        <p className="text-muted-foreground">{t('simulation.subtitle')}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('simulation.configTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('simulation.selectSurvey')}</label>
                <Select value={selectedSurvey} onValueChange={setSelectedSurvey} disabled={status !== 'idle' && status !== 'ended'}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('simulation.chooseSurvey')} />
                  </SelectTrigger>
                  <SelectContent>
                    {surveys.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full h-12 text-lg font-semibold" 
                onClick={status === 'connected' || status === 'calling' ? endCall : startCall}
                variant={status === 'connected' || status === 'calling' ? 'destructive' : 'default'}
              >
                {status === 'idle' || status === 'ended' ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    {t('simulation.simulateCall')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <PhoneOff className="h-5 w-5" />
                    {t('simulation.endCall')}
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {status !== 'idle' && (
            <Card className={cn(
              "transition-all duration-500",
              status === 'connected' ? "border-emerald-500 shadow-lg shadow-emerald-500/10" : ""
            )}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-8 py-8">
                  <div className="relative">
                    <div className={cn(
                      "absolute -inset-4 rounded-full blur-xl transition-all duration-500",
                      isSpeaking ? "bg-emerald-500/20 animate-pulse" : 
                      isRecording ? "bg-primary/20 animate-pulse" : 
                      "bg-transparent"
                    )} />
                    <div className={cn(
                      "relative h-32 w-32 rounded-full border-4 flex items-center justify-center transition-all duration-300",
                      status === 'calling' ? "animate-bounce border-primary/20" : 
                      isSpeaking ? "border-emerald-500 bg-emerald-50" : 
                      isRecording ? "border-primary bg-primary/5 scale-110" : 
                      "border-secondary"
                    )}>
                      {isSpeaking ? (
                        <Volume2 className="h-12 w-12 text-emerald-500" />
                      ) : isRecording ? (
                        <Mic className="h-12 w-12 text-primary" />
                      ) : (
                        <Phone className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">
                      {status === 'calling' ? t('simulation.calling') : 
                       isSpeaking ? t('simulation.aiSpeaking') : 
                       isRecording ? t('simulation.listening') : 
                       isProcessing ? t('simulation.thinking') : 
                       t('simulation.connected')}
                    </h3>
                    <p className="text-sm text-muted-foreground font-mono">
                      {status === 'calling' ? 'Establishing secure connection...' : 
                       isRecording ? t('simulation.goAhead') : 
                       transcription || 'Call in progress'}
                    </p>
                  </div>

                  {status === 'connected' && !isSpeaking && !isProcessing && (
                    isRecording ? (
                      <Button onClick={stopRecording} variant="destructive" className="gap-2">
                        <MicOff className="h-4 w-4" />
                        {t('simulation.stopRecording')}
                      </Button>
                    ) : (
                      <Button onClick={startRecording} variant="outline" className="gap-2">
                        <Mic className="h-4 w-4" />
                        {t('simulation.goAhead')}
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('simulation.liveTranscript')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.filter(m => m.role !== 'system').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8">
                  <RefreshCw className="h-12 w-12 mb-4 opacity-20" />
                  <p>{t('simulation.transcriptPlaceholder')}</p>
                </div>
              ) : (
                messages.filter(m => m.role !== 'system').map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col space-y-1 max-w-[80%]",
                    msg.role === 'assistant' ? "mr-auto" : "ml-auto items-end"
                  )}>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      {msg.role === 'assistant' ? 'AI Agent' : 'You'}
                    </span>
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      msg.role === 'assistant' ? "bg-secondary" : "bg-primary text-primary-foreground"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
