import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TaskItem {
  id: string;
  task: string;
  description: string;
  day: string;
  time: string;
  duration: string;
  category: string;
  completed: boolean;
  estimated_duration_minutes: number;
  deadline: string | null;
  deadline_time: string | null;
  source_email?: { subject: string; sender: string };
  is_email_task?: boolean;
  driveFileId?: string;
}

interface InsightData {
  overview: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    productivityTrend: "improving" | "declining" | "stable";
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    completed: number;
    completionRate: number;
  }>;
  dailyPattern: Array<{
    day: string;
    tasksCompleted: number;
    productivityScore: number;
  }>;
  insights: Array<{
    type: "strength" | "opportunity";
    title: string;
    description: string;
  }>;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    expectedImpact: string;
  }>;
}

interface WeeklyReportProps {
  tasks: TaskItem[];
  onClose: () => void;
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({ tasks, onClose }) => {
  const [insightsData, setInsightsData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/generate-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tasks }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch insights: ${response.status}`);
        }

        const data = await response.json();
        setInsightsData(data);
      } catch (err: any) {
        setError(err.message || "Unknown error occurred");
        console.error("Error fetching insights:", err);
      } finally {
        setLoading(false);
      }
    };

    if (tasks.length > 0) {
      fetchInsights();
    }
  }, [tasks]);

  if (loading && !insightsData) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="mt-4 text-slate-300">Generating insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400">
        <p>Error: {error}</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
        >
          Close
        </button>
      </div>
    );
  }

  if (!insightsData) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-300">No data available for insights.</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
        >
          Close
        </button>
      </div>
    );
  }

  const {
    overview,
    categoryBreakdown,
    dailyPattern,
    insights,
    recommendations,
  } = insightsData;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-slate-900/50 rounded-lg">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-emerald-400">
          Weekly Productivity Insights
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800/50 rounded"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-slate-400 hover:text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 14e6" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Overview Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-emerald-300">Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="text-slate-400 text-sm">Total Tasks</p>
            <p className="text-2xl font-bold text-white">{overview.totalTasks}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="text-slate-400 text-sm">Completed Tasks</p>
            <p className="text-2xl font-bold text-emerald-400">{overview.completedTasks}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="text-slate-400 text-sm">Completion Rate</p>
            <p className="text-2xl font-bold">
              {overview.completionRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded">
            <p className="text-slate-400 text-sm">Trend</p>
            <p className="text-2xl font-bold">
              {overview.productivityTrend === "increasing" && (
                <span className="text-emerald-400">↑ Improving</span>
              )}
              {overview.productivityTrend === "decreasing" && (
                <span className="text-rose-400">↓ Declining</span>
              )}
              {overview.productivityTrend === "stable" && (
                <span className="text-amber-400">→ Stable</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown (Pie Chart) */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-emerald-300">
          Task Completion by Category
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="completionRate"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  labelLine={false}
                  label={({ name, percent }) => (
                    <>
                      {name}: {percent.toFixed(0)}%
                    </>
                  )}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fillColor={`hsl(${
                      index * 30
                    }, 70%, 50%)`} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {categoryBreakdown.map((cat, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded bg-[hsl(${index * 30},70%,50%)]`}
                />
                <div>
                  <p className="font-medium text-white">{cat.category}</p>
                  <p className="text-slate-400 text-sm">
                    {cat.completed}/{cat.total} tasks ({cat.completionRate.toFixed(
                      0
                    )}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Pattern (Bar Chart) */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-emerald-300">
          Daily Productivity Pattern
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyPattern}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fill: "#9ca3af" }} />
            <YAxis tick={{ fill: "#9ca3af" }} />
            <Tooltip />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="tasksCompleted" fill="#10b981" name="Tasks Completed" />
            <Bar
              dataKey="productivityScore"
              fill="#3b82f6"
              name="Productivity Score"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-emerald-300">
          Key Insights
        </h3>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === "strength"
                  ? "border-emerald-400 bg-emerald-900/20"
                  : "border-rose-400 bg-rose-900/20"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {insight.type === "strength" ? (
                    <svg
                      className="h-5 w-5 text-emerald-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-rose-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586l1.293-1.293a1 1 0 00-1.414-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{insight.title}</p>
                  <p className="text-slate-300 text-sm">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-emerald-300">
          Recommendations
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                rec.priority === "high"
                  ? "border-rose-400 bg-rose-900/20"
                  : rec.priority === "medium"
                  ? "border-amber-400 bg-amber-900/20"
                  : "border-emerald-400 bg-emerald-900/20"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {rec.priority === "high" ? (
                    <svg
                      className="h-5 w-5 text-rose-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.487 0l3.121 5.541.53.942c.254.448.033 1.01-.422 1.01H6.28c-.455 0-.676-.562-.422-1.01l.53-.942L8.257 3.099zM10 0a10 10 0 100 20 10 10 0 000-20z" clipRule="evenodd" />
                    </svg>
                  ) : rec.priority === "medium" ? (
                    <svg
                      className="h-5 w-5 text-amber-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.487 0l3.121 5.541.53.942c.254.448.033 1.01-.422 1.01H6.28c-.455 0-.676-.562-.422-1.01l.53-.942L8.257 3.099zM10 0a10 10 0 100 20 10 10 0 000-20z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-emerald-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{rec.action}</p>
                  <p className="text-slate-300 text-sm">
                    <span className="font-medium">
                      {rec.priority === "high"
                        ? "High"
                        : rec.priority === "medium"
                        ? "Medium"
                        : "Low"}
                    </span> priority • Expected impact: {rec.expectedImpact}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyReport;
