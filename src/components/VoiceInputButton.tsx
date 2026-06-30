import React, { useState, useEffect, useRef } from "react";
import { Mic, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceInputButtonProps {
  onTranscriptChange: (text: string) => void;
  currentValue: string;
}

export default function VoiceInputButton({
  onTranscriptChange,
  currentValue,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const initialValueRef = useRef("");

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    setErrorMsg(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Speech recognition is not supported in this browser.");
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    try {
      initialValueRef.current = currentValue;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript;
        }
        
        // Update input in real-time
        const base = initialValueRef.current.trim();
        const updated = base ? `${base} ${fullTranscript.trim()}` : fullTranscript.trim();
        onTranscriptChange(updated);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone access denied.");
        } else {
          setErrorMsg(`Error: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setErrorMsg(null), 4000);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to start speech recognition.");
      setIsListening(false);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleMicClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        id="voice-mic-btn"
        onClick={handleMicClick}
        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 relative ${
          isListening
            ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(212,175,55,0.4)] animate-pulse"
            : "border-outline-variant hover:border-primary text-on-surface-variant hover:text-on-surface bg-surface"
        }`}
        title={isListening ? "Stop listening" : "Start voice typing"}
      >
        <Mic className={`w-5 h-5 ${isListening ? "scale-110" : ""}`} />
        
        {/* Subtle glowing ring */}
        {isListening && (
          <span className="absolute inset-0 rounded-full border border-primary animate-ping opacity-75" />
        )}
      </button>

      {/* Comic-book dialogue style speech bubble or error msg */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute top-12 z-50 bg-surface-container border border-primary text-primary px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg whitespace-nowrap flex items-center gap-1.5"
            style={{
              clipPath: "polygon(0% 0%, 100% 0%, 100% 90%, 55% 90%, 50% 100%, 45% 90%, 0% 90%)",
              paddingBottom: "8px",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce inline-block" />
            Listening...
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-12 z-50 bg-error-container border border-error text-error px-3 py-1.5 rounded-lg text-[10px] font-medium shadow-lg whitespace-nowrap flex items-center gap-1"
          >
            <AlertCircle className="w-3 h-3" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
