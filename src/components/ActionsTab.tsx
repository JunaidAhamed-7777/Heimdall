import { Search, FileText, BarChart3 } from "lucide-react";

interface ActionsTabProps {
  onDetectGaps: () => void;
  onCheckDocuments: () => void;
  onWeeklyReport: () => void;
}

export default function ActionsTab({ onDetectGaps, onCheckDocuments, onWeeklyReport }: ActionsTabProps) {
  return (
    <section className="space-y-stack-lg">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-headline-md text-headline-md text-primary mb-2">Vigilance Tools</h2>
          <p className="text-on-surface-variant font-body-lg">Deploy active protocols to optimize your current timeline</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Detect Gaps */}
          <button
            onClick={onDetectGaps}
            className="group bg-surface-container border border-outline-variant p-8 flex flex-col items-center text-center transition-all hover:border-primary gold-glow"
          >
            <div className="w-16 h-16 border border-primary/30 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-on-primary transition-all">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-3">Detect Gaps</h3>
            <p className="text-on-surface-variant font-body-md text-sm leading-relaxed">
              Identify inefficiencies and scheduling conflicts in your current weekly protocol.
            </p>
            <div className="mt-8 font-label-caps text-primary text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Execute Sequence
            </div>
          </button>

          {/* Check Documents */}
          <button
            onClick={onCheckDocuments}
            className="group bg-surface-container border border-outline-variant p-8 flex flex-col items-center text-center transition-all hover:border-primary gold-glow"
          >
            <div className="w-16 h-16 border border-primary/30 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-on-primary transition-all">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-3">Check Documents</h3>
            <p className="text-on-surface-variant font-body-md text-sm leading-relaxed">
              Scan your thesis drafts and medical records for consistency and missing data points.
            </p>
            <div className="mt-8 font-label-caps text-primary text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
              Execute Sequence
            </div>
          </button>

          {/* Weekly Report */}
          <button
            onClick={onWeeklyReport}
            className="group bg-surface-container border border-outline-variant p-8 flex flex-col items-center text-center transition-all hover:border-primary gold-glow"
          >
            <div className="w-16 h-16 border border-primary/30 flex items-center justify-center mb-6 bg-primary text-on-primary shadow-[0_0_20px_rgba(242,202,80,0.3)]">
              <BarChart3 className="w-8 h-8" />
            </div>
            <h3 className="font-headline-sm text-headline-sm mb-3">Weekly Report</h3>
            <p className="text-on-surface-variant font-body-md text-sm leading-relaxed">
              Generate a comprehensive summary of your strategic progress and resource drain.
            </p>
            <div className="mt-8 font-label-caps text-primary text-[10px] tracking-widest uppercase">Protocol Primary</div>
          </button>
        </div>
      </div>
    </section>
  );
}