import React, { useState } from 'react';
import {
  Trophy,
  Table2,
  BarChart3,
  Terminal,
  RotateCcw,
  Trash2,
  Send,
  Sparkles,
  Award,
  Clock,
  Layers,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  CliLogEntry,
  DataProfile,
  ExperimentRecord,
  TaskType,
} from '../types/studio';

interface RightStudioPaneProps {
  taskType: TaskType;
  dataProfile: DataProfile | null;
  experiments: ExperimentRecord[];
  selectedExpId: string | null;
  onSelectExperiment: (id: string) => void;
  onRestoreExperiment: (exp: ExperimentRecord) => void;
  onClearExperiments: () => void;
  cliLogs: CliLogEntry[];
  onClearLogs: () => void;
  namespaceVars: string[];
  onRunQuickCommand: (cmd: string) => void;
}

export const RightStudioPane: React.FC<RightStudioPaneProps> = ({
  taskType,
  dataProfile,
  experiments,
  selectedExpId,
  onSelectExperiment,
  onRestoreExperiment,
  onClearExperiments,
  cliLogs,
  onClearLogs,
  namespaceVars,
  onRunQuickCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'data' | 'diagnostics'>('leaderboard');
  const [quickCmd, setQuickCmd] = useState<string>('');
  const [cliExpanded, setCliExpanded] = useState<boolean>(true);

  const selectedExp =
    experiments.find((e) => e.id === selectedExpId) || experiments[0] || null;

  // Sắp xếp bảng xếp hạng theo metric chính
  const sortedExperiments = [...experiments].sort((a, b) => {
    if (taskType === 'classification') {
      const scoreA = a.metrics.roc_auc ?? a.metrics.f1 ?? 0;
      const scoreB = b.metrics.roc_auc ?? b.metrics.f1 ?? 0;
      return scoreB - scoreA;
    } else {
      const r2A = a.metrics.r2 ?? -999;
      const r2B = b.metrics.r2 ?? -999;
      return r2B - r2A;
    }
  });

  // Dữ liệu biểu đồ so sánh các lần chạy trên Recharts
  const comparisonChartData = [...experiments]
    .slice()
    .reverse()
    .map((exp) => ({
      name: `#${exp.runNumber} ${exp.modelFamily.slice(0, 8)}`,
      ROC_AUC: exp.metrics.roc_auc ?? 0,
      F1: exp.metrics.f1 ?? 0,
      Accuracy: exp.metrics.accuracy ?? 0,
      R2: exp.metrics.r2 ?? 0,
      RMSE: exp.metrics.rmse ?? 0,
    }));

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCmd.trim()) return;
    onRunQuickCommand(quickCmd.trim());
    setQuickCmd('');
  };

  return (
    <aside className="w-full h-full bg-slate-900/85 border-l border-slate-800 flex flex-col overflow-hidden select-none">
      {/* Top Studio Tabs */}
      <div className="px-2.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-1 shrink-0">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Leaderboard ({experiments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'diagnostics'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Plots & SHAP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'data'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-sky-300" />
            <span>Data Profile</span>
          </button>
        </div>
      </div>

      {/* Upper Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {/* ==================== TAB 1: EXPERIMENT LEADERBOARD ==================== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {experiments.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
                <Trophy className="w-8 h-8 text-amber-400/70 mx-auto" />
                <h4 className="text-xs font-bold text-slate-200">
                  Chưa có lần chạy thực nghiệm nào
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hãy bấm nút <strong className="text-indigo-300">▶ Run Full Pipeline</strong> ở thanh trên cùng để huấn luyện mô hình và tự động xếp hạng kết quả vào Leaderboard!
                </p>
              </div>
            ) : (
              <>
                {/* Recharts Multi-Run Comparison */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      So sánh hiệu năng giữa các lần chạy
                    </span>
                    <button
                      type="button"
                      onClick={onClearExperiments}
                      className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis
                          domain={taskType === 'classification' ? [0.5, 1.0] : ['auto', 'auto']}
                          tick={{ fill: '#94a3b8', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            fontSize: '11px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {taskType === 'classification' ? (
                          <>
                            <Bar dataKey="ROC_AUC" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="F1" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </>
                        ) : (
                          <>
                            <Bar dataKey="R2" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </>
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Leaderboard Cards */}
                <div className="space-y-2">
                  {sortedExperiments.map((exp, rankIdx) => {
                    const isBest = rankIdx === 0;
                    const isSelected = selectedExp?.id === exp.id;
                    return (
                      <div
                        key={exp.id}
                        onClick={() => onSelectExperiment(exp.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/30 border-indigo-500/70 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isBest
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {isBest ? '🏆 #1 Best' : `#${rankIdx + 1}`}
                            </span>
                            <span className="text-xs font-bold text-slate-100 truncate">
                              Run #{exp.runNumber} • {exp.modelName}
                            </span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                            {exp.runtimeUsed}
                          </span>
                        </div>

                        {/* Metrics Pills */}
                        {exp.taskType === 'classification' ? (
                          <div className="grid grid-cols-4 gap-1.5 my-2 text-center">
                            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                              <div className="text-[9px] text-slate-400">ROC-AUC</div>
                              <div className="text-xs font-mono font-bold text-indigo-300">
                                {exp.metrics.roc_auc?.toFixed(4)}
                              </div>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                              <div className="text-[9px] text-slate-400">F1-Score</div>
                              <div className="text-xs font-mono font-bold text-emerald-300">
                                {exp.metrics.f1?.toFixed(4)}
                              </div>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                              <div className="text-[9px] text-slate-400">Accuracy</div>
                              <div className="text-xs font-mono font-bold text-sky-300">
                                {exp.metrics.accuracy?.toFixed(4)}
                              </div>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                              <div className="text-[9px] text-slate-400">CV Mean</div>
                              <div className="text-xs font-mono font-bold text-amber-300">
                                {exp.metrics.cv_mean?.toFixed(3)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 my-2 text-center">
                            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                              <div className="text-[9px] text-slate-400">RMSE</div>
                              <div className="text-xs font-mono font-bold text-rose-300">
                                {exp.metrics.rmse?.toFixed(3)}
                              </div>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                              <div className="text-[9px] text-slate-400">MAE</div>
                              <div className="text-xs font-mono font-bold text-amber-300">
                                {exp.metrics.mae?.toFixed(3)}
                              </div>
                            </div>
                            <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                              <div className="text-[9px] text-slate-400">R² Score</div>
                              <div className="text-xs font-mono font-bold text-emerald-300">
                                {exp.metrics.r2?.toFixed(4)}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Hyperparams & Actions Footer */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <span className="flex items-center gap-2 font-mono">
                            <span>lr={exp.hyperparameters.learningRate}</span>
                            <span>depth={exp.hyperparameters.maxDepth}</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {(exp.durationMs / 1000).toFixed(1)}s
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectExperiment(exp.id);
                                setActiveTab('diagnostics');
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                            >
                              <Eye className="w-2.5 h-2.5" /> Plots
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreExperiment(exp);
                              }}
                              className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1"
                              title="Khôi phục toàn bộ cấu hình UI & Hyperparameters của lần chạy này"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Restore
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== TAB 2: DIAGNOSTICS & FEATURE IMPORTANCE ==================== */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-3">
            {!selectedExp ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                Chạy Pipeline trước để xem biểu đồ Feature Importance, ROC Curve và Confusion Matrix.
              </div>
            ) : (
              <>
                <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      Run #{selectedExp.runNumber}: {selectedExp.modelName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Imputer: {selectedExp.preprocessingSummary.numericImputer} | Scaler:{' '}
                      {selectedExp.preprocessingSummary.numericScaler} | Encoder:{' '}
                      {selectedExp.preprocessingSummary.categoricalEncoder}
                    </div>
                  </div>
                </div>

                {/* Interactive Feature Importance BarChart */}
                {selectedExp.featureImportance && selectedExp.featureImportance.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                      Top Permutation Feature Importance
                    </span>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={selectedExp.featureImportance.slice(0, 8)}
                          layout="vertical"
                          margin={{ left: 15, right: 15 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <YAxis
                            type="category"
                            dataKey="feature"
                            width={105}
                            tick={{ fill: '#e2e8f0', fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderColor: '#334155',
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="importance" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Matplotlib High-Res Diagnostic Figures */}
                {selectedExp.figures && selectedExp.figures.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
                      Biểu đồ chẩn đoán Matplotlib (ROC / CM / Residuals)
                    </span>
                    {selectedExp.figures.map((fig, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-1.5"
                      >
                        <img
                          src={fig}
                          alt={`Experiment Plot ${idx + 1}`}
                          className="w-full h-auto rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================== TAB 3: DATA PROFILE & HEAD(5) ==================== */}
        {activeTab === 'data' && dataProfile && (
          <div className="space-y-3">
            {/* Summary Banner */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Số dòng (Rows)</div>
                <div className="text-sm font-mono font-bold text-white">
                  {dataProfile.shape[0].toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Số cột (Cols)</div>
                <div className="text-sm font-mono font-bold text-indigo-300">
                  {dataProfile.shape[1]}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Bộ nhớ (RAM)</div>
                <div className="text-sm font-mono font-bold text-emerald-300">
                  {dataProfile.memory_mb} MB
                </div>
              </div>
            </div>

            {/* Schema & Missing % Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-200 flex items-center justify-between">
                <span>Schema & Tỷ lệ khuyết (Missing Values)</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {dataProfile.dataset_name}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                {dataProfile.columns.map((col) => (
                  <div
                    key={col.name}
                    className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-slate-200 truncate">
                        {col.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {col.dtype} • {col.nunique} unique
                        {col.mean !== undefined ? ` • μ=${col.mean}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            col.missing_pct > 0 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(col.missing_pct * 5, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`font-mono text-[10px] w-12 text-right ${
                          col.missing_pct > 0 ? 'text-amber-300 font-semibold' : 'text-slate-500'
                        }`}
                      >
                        {col.missing_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* df.head(5) Preview Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-200">
                Xem trước 5 dòng đầu (df.head(5))
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] font-mono">
                  <thead>
                    <tr className="bg-slate-900/70 border-b border-slate-800 text-slate-400">
                      {dataProfile.columns.map((c) => (
                        <th key={c.name} className="px-2.5 py-1.5 whitespace-nowrap">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {dataProfile.head.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/40">
                        {dataProfile.columns.map((c) => {
                          const val = row[c.name];
                          return (
                            <td
                              key={c.name}
                              className="px-2.5 py-1.5 whitespace-nowrap text-slate-300"
                            >
                              {val === null || val === undefined ? (
                                <span className="text-amber-400 italic">NaN</span>
                              ) : (
                                String(val)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== BOTTOM LIVE STREAM CLI & REPL ==================== */}
      <div className="border-t border-slate-800 bg-slate-950 flex flex-col shrink-0">
        <div
          onClick={() => setCliExpanded((p) => !p)}
          className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/60"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
              Live Stream CLI & Kernel Variables
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearLogs();
              }}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>

        {cliExpanded && (
          <>
            {/* Active Kernel Namespace Variables */}
            {namespaceVars.length > 0 && (
              <div className="px-3 py-1 bg-slate-900/50 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px]">
                <Layers className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="text-slate-400 shrink-0">Memory:</span>
                {namespaceVars.slice(0, 12).map((v) => (
                  <span
                    key={v}
                    className="font-mono px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300 border border-slate-700 shrink-0"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* Stream Logs */}
            <div className="h-36 overflow-y-auto p-2.5 font-mono text-[11px] space-y-1 bg-slate-950">
              {cliLogs.length === 0 ? (
                <div className="text-slate-500 italic">
                  Sẵn sàng nhận luồng stdout/stderr thời gian thực (500ms buffer)...
                </div>
              ) : (
                cliLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`whitespace-pre-wrap break-words leading-relaxed ${
                      log.stream === 'stderr'
                        ? 'text-rose-400'
                        : log.stream === 'system'
                        ? 'text-indigo-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-600 select-none">[{log.timestamp}] </span>
                    {log.text}
                  </div>
                ))
              )}
            </div>

            {/* Interactive Python Quick Command Input */}
            <form
              onSubmit={handleQuickSubmit}
              className="px-2.5 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
            >
              <span className="font-mono text-xs text-emerald-400 font-bold">&gt;&gt;&gt;</span>
              <input
                type="text"
                value={quickCmd}
                onChange={(e) => setQuickCmd(e.target.value)}
                placeholder="Gõ lệnh Python nhanh (VD: print(df.shape) hoặc print(full_pipeline))..."
                className="flex-1 bg-transparent text-xs font-mono text-slate-100 focus:outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                title="Thực thi lệnh nhanh trong cùng Global Namespace"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </>
        )}
      </div>
    </aside>
  );
};
