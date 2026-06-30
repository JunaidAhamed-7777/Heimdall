import React, { useEffect } from "react";
import { X, Sparkles, AlertTriangle, HelpCircle, Check, Loader2 } from "lucide-react";

export interface Inefficiency {
  id: string;
  type: "task" | "deadline";
  description: string;
  suggestedChange: string;
  updatedItem: any;
}

export interface Recommendation {
  description: string;
  proposedAction?: string;
  tasksToCreate?: any[];
}

interface GapsAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  inefficiencies: Inefficiency[];
  conflicts: string[];
  recommendations: Recommendation[];
  onImplement: (item: Inefficiency) => void;
  onConfirmRecommendation: (rec: Recommendation) => void;
}

export default function GapsAnalysisModal({
  isOpen,
  onClose,
  isLoading,
  inefficiencies,
  conflicts,
  recommendations,
  onImplement,
  onConfirmRecommendation,
}: GapsAnalysisModalProps) {
  // ESC key listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Track implemented and confirmed states locally to provide instant UX feedback
  const [implementedIds, setImplementedIds] = React.useState<Set<string>>(new Set());
  const [confirmedRecs, setConfirmedRecs] = React.useState<Set<number>>(new Set());
  const [cancelledRecs, setCancelledRecs] = React.useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handleImplementClick = (inef: Inefficiency) => {
    onImplement(inef);
    setImplementedIds((prev) => {
      const next = new Set(prev);
      next.add(inef.id);
      return next;
    });
  };

  const handleConfirmRecClick = (rec: Recommendation, index: number) => {
    onConfirmRecommendation(rec);
    setConfirmedRecs((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const handleCancelRecClick = (index: number) => {
    setCancelledRecs((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-primary/30 rounded-2xl p-6 md:p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <h2 className="font-headline-sm text-on-surface text-xl tracking-wide">
              Timeline Gaps & Nudge Analysis
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors p-1 hover:bg-surface-container rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-on-surface-variant font-medium animate-pulse">
              Heimdall is analyzing your timeline and cross-referencing deadlines...
            </p>
          </div>
        ) : (
          <div className="space-y-8 pr-1 font-body-md text-sm leading-relaxed">
            {/* 1. Conflicts */}
            <div className="space-y-3">
              <h3 className="font-headline-xs text-on-surface text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" /> Scheduling Conflicts & Overlaps
              </h3>
              <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                {conflicts.length === 0 ? (
                  <p className="text-xs text-green-500 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> No conflicts found! Your pacing is clear.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {conflicts.map((conflict, index) => (
                      <li key={index} className="text-xs text-on-surface flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-error mt-1.5 flex-shrink-0" />
                        <span>{conflict}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 2. Inefficiencies */}
            <div className="space-y-3">
              <h3 className="font-headline-xs text-on-surface text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Timeline Inefficiencies
              </h3>
              {inefficiencies.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                  <p className="text-xs text-on-surface-variant">No major pacing or sequence inefficiencies detected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inefficiencies.map((inef) => {
                    const isDone = implementedIds.has(inef.id);
                    return (
                      <div
                        key={inef.id}
                        className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-primary/25"
                      >
                        <div className="space-y-1 max-w-[80%]">
                          <p className="text-xs text-on-surface font-medium">
                            {inef.description}
                          </p>
                          <p className="text-[11px] text-primary">
                            <strong>Proposed:</strong> {inef.suggestedChange}
                          </p>
                        </div>
                        <button
                          onClick={() => handleImplementClick(inef)}
                          disabled={isDone}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-label-caps transition-all flex-shrink-0 flex items-center gap-1 self-start sm:self-center ${
                            isDone
                              ? "bg-green-500/10 text-green-500 border border-green-500/30"
                              : "bg-primary text-on-primary hover:bg-primary/90"
                          }`}
                        >
                          {isDone ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Applied
                            </>
                          ) : (
                            "Implement"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Strategic Recommendations */}
            <div className="space-y-3">
              <h3 className="font-headline-xs text-on-surface text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" /> Strategic Recommendations
              </h3>
              {recommendations.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
                  <p className="text-xs text-on-surface-variant">No strategic pacing suggestions available right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, index) => {
                    const isConfirmed = confirmedRecs.has(index);
                    const isCancelled = cancelledRecs.has(index);
                    const hasAction = !!rec.tasksToCreate && rec.tasksToCreate.length > 0;

                    return (
                      <div
                        key={index}
                        className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col justify-between gap-4 transition-all hover:border-primary/25"
                      >
                        <div className="space-y-1">
                          <p className="text-xs text-on-surface">
                            {rec.description}
                          </p>
                          {rec.proposedAction && (
                            <p className="text-[11px] text-on-surface-variant">
                              <strong>Action:</strong> {rec.proposedAction}
                            </p>
                          )}
                        </div>

                        {hasAction && (
                          <div className="flex items-center gap-2 self-end mt-2">
                            {isConfirmed ? (
                              <span className="text-[11px] text-green-500 font-semibold flex items-center gap-1 py-1 px-2.5 bg-green-500/10 rounded border border-green-500/20">
                                <Check className="w-3 h-3" /> Scheduled
                              </span>
                            ) : isCancelled ? (
                              <span className="text-[11px] text-on-surface-variant italic py-1 px-2.5 bg-surface rounded border border-outline-variant">
                                Dismissed
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleCancelRecClick(index)}
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-outline-variant hover:bg-surface-variant text-on-surface-variant transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleConfirmRecClick(rec, index)}
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-on-primary transition-colors flex items-center gap-1"
                                >
                                  Confirm
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
