import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, RefreshCw } from "lucide-react";

interface AdvisorTabProps {
  chatMessages: ChatMessage[];
  isLoadingAdvisor: boolean;
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendChat: (e: React.FormEvent) => void;
  onQuickPrompt: (text: string) => void;
}

export default function AdvisorTab({
  chatMessages,
  isLoadingAdvisor,
  chatInput,
  setChatInput,
  onSendChat,
  onQuickPrompt
}: AdvisorTabProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);
  return (
    <section className="h-[calc(100vh-10rem)]">
      <div className="max-w-4xl mx-auto h-full flex flex-col bg-surface-container border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant bg-surface flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
            </div>
            <div>
              <h3 className="font-label-caps text-sm text-primary">Heimdall Advisor Room</h3>
              <p className="text-[10px] text-on-surface-variant">Cognitive Strategy Engine Online</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="bg-secondary/10 text-secondary px-2 py-1 text-[9px] font-label-caps border border-secondary/20">STANDBY</span>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-6 overflow-y-auto space-y-8 custom-scrollbar">
          {chatMessages.map((msg) => {
            const isModel = msg.role === "model";
            return (
              <div key={msg.id} className={`flex gap-4 ${isModel ? "" : "flex-row-reverse"}`}>
                <div className="w-10 h-10 shrink-0 border border-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">{isModel ? "shield" : "person"}</span>
                </div>
                <div className={`space-y-2 ${isModel ? "" : "text-right"}`}>
                  <p className="font-label-caps text-[10px] text-on-surface-variant">
                    {isModel ? "HEIMDALL ADVISOR" : "USER SENTINEL"} • {msg.timestamp}
                  </p>
                  <div className={`p-4 text-sm font-body-md leading-relaxed text-on-surface max-w-xl ${isModel ? "bg-surface border border-outline-variant" : "bg-primary/5 border border-primary/20 text-left inline-block"}`}>
                    {msg.content}
                  </div>
                <div ref={messagesEndRef} />
                </div>
              </div>
            );
          })}
          {isLoadingAdvisor && (
            <div className="flex gap-4">
              <div className="w-10 h-10 shrink-0 border border-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">shield</span>
              </div>
              <div className="space-y-2">
                <p className="font-label-caps text-[10px] text-on-surface-variant">HEIMDALL ADVISOR • ...</p>
                <div className="p-4 text-sm bg-surface border border-outline-variant text-on-surface max-w-xl flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Heimdall is reviewing workload logs...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={onSendChat} className="p-6 border-t border-outline-variant bg-surface">
          <div className="relative">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Chat with Heimdall..."
              className="w-full bg-surface-container-low border border-outline-variant p-4 pr-16 focus:border-primary outline-none text-on-surface font-body-md resize-none h-14 custom-scrollbar"
            />
            <button type="submit" disabled={isLoadingAdvisor} className="absolute bottom-4 right-4 w-10 h-10 bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container transition-all">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}