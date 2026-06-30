import React, { useState, useEffect, useRef } from "react";
import { Mic, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";

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
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const recognitionRef = useRef<any>(null);
  const initialValueRef = useRef("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Update fixed portal positioning coordinates
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 8, // Place 8px above the top edge of the button
        left: rect.left + rect.width / 2, // Horizontally center relative to button
      });
    }
  };

  useEffect(() => {
    if (isListening || errorMsg) {
      updateCoords();
      // Listen to scroll and resize events globally to update position
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
      
      // Periodic check as layout might change
      const interval = setInterval(updateCoords, 300);

      return () => {
        window.removeEventListener("scroll", updateCoords, true);
        window.removeEventListener("resize", updateCoords);
        clearInterval(interval);
      };
    }
  }, [isListening, errorMsg]);

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
        ref={buttonRef}
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

      {/* Portal elements rendered into body to escape any clipping containers */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                className="fixed z-[99999] bg-[#141517] border border-primary text-primary px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-2xl flex items-center gap-1.5 -translate-x-1/2 -translate-y-full select-none"
                style={{
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  maxWidth: "320px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5), 0 0 10px rgba(212,175,55,0.15)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce inline-block" />
                <span>Listening...</span>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="fixed z-[99999] bg-error-container border border-error text-error px-3 py-1.5 rounded-lg text-[11px] font-medium shadow-2xl flex items-center gap-1.5 -translate-x-1/2 -translate-y-full select-none"
                style={{
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  maxWidth: "350px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                }}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
