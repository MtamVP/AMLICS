import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'diagnostics' | 'data'>('leaderboard');
  const [quickCmd, setQuickCmd] = useState<string>('');
  const [cliExpanded, setCliExpanded] = useState<boolean>(true);

  const selectedExp =
    experiments.find((e) => e.id === selectedExpId) || experiments[0] || null;

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

  const comparisonChartData = [...experiments]
    .slice()
    .reverse()
    .map((exp) => ({
      name: `#${exp.runNumber} ${exp.modelFamily.slice(0, 7)}`,
      ROC_AUC: exp.metrics.roc_auc ?? 0,
      F1: exp.metrics.f1 ?? 0,
      R2: exp.metrics.r2 ?? 0,
    }));

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCmd.trim()) return;
    onRunQuickCommand(quickCmd.trim());
    setQuickCmd('');
  };

  return (
    <aside className="w-full h-full bg-[#202124] border-l border-[#3c4043] flex flex-col overflow-hidden select-none">
      {/* Minimal Tab Strip */}
      <div className="px-3 border-b border-[#3c4043] flex items-center gap-4 text-xs shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'leaderboard'
              ? 'border-[#8ab4f8] text-[#8ab4f8] font-medium'
              : 'border-transparent text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          Leaderboard ({experiments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'diagnostics'
              ? 'border-[#8ab4f8] text-[#8ab4f8] font-medium'
              : 'border-transparent text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          Plots & Importance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'data'
              ? 'border-[#8ab4f8] text-[#8ab4f8] font-medium'
              : 'border-transparent text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          Data Explorer
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#18191a] custom-scrollbar">
        {/* ==================== TAB 1: LEADERBOARD ==================== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {experiments.length === 0 ? (
              <div className="p-5 rounded bg-[#202124] border border-[#3c4043] text-center space-y-1.5">
                <div className="text-xs font-medium text-[#e8eaed]">
                  No experiment runs recorded
                </div>
                <p className="text-[11px] text-[#9aa0a6]">
                  Click <strong>Run all</strong> in the top toolbar to train the pipeline and log metrics here.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 rounded bg-[#202124] border border-[#3c4043] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-[#e8eaed]">
                      Metric Comparison
                    </span>
                    <button
                      type="button"
                      onClick={onClearExperiments}
                      className="text-[#9aa0a6] hover:text-[#f28b82]"
                    >
                      Clear history
                    </button>
                  </div>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#292a2d" />
                        <XAxis dataKey="name" tick={{ fill: '#9aa0a6', fontSize: 10 }} />
                        <YAxis
                          domain={taskType === 'classification' ? [0.5, 1.0] : ['auto', 'auto']}
                          tick={{ fill: '#9aa0a6', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#202124',
                            borderColor: '#3c4043',
                            fontSize: '11px',
                          }}
                        />
                        {taskType === 'classification' ? (
                          <>
                            <Bar dataKey="ROC_AUC" fill="#8ab4f8" />
                            <Bar dataKey="F1" fill="#81c995" />
                          </>
                        ) : (
                          <Bar dataKey="R2" fill="#8ab4f8" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Clean Tabular Leaderboard Cards */}
                <div className="space-y-2">
                  {sortedExperiments.map((exp, rankIdx) => {
                    const isSelected = selectedExp?.id === exp.id;
                    return (
                      <div
                        key={exp.id}
                        onClick={() => onSelectExperiment(exp.id)}
                        className={`p-2.5 rounded border transition-colors cursor-pointer bg-[#202124] ${
                          isSelected
                            ? 'border-[#8ab4f8]'
                            : 'border-[#3c4043] hover:border-[#5f6368]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] text-[#9aa0a6]">
                              #{rankIdx + 1}
                            </span>
                            <span className="font-medium text-[#e8eaed] truncate">
                              Run {exp.runNumber}: {exp.modelName}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#9aa0a6] shrink-0">
                            {(exp.durationMs / 1000).toFixed(2)}s
                          </span>
                        </div>

                        {exp.taskType === 'classification' ? (
                          <div className="grid grid-cols-4 gap-1.5 my-1.5 text-center font-mono">
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">AUC</div>
                              <div className="text-xs text-[#8ab4f8]">
                                {exp.metrics.roc_auc?.toFixed(4)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">F1</div>
                              <div className="text-xs text-[#e8eaed]">
                                {exp.metrics.f1?.toFixed(4)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">Acc</div>
                              <div className="text-xs text-[#e8eaed]">
                                {exp.metrics.accuracy?.toFixed(4)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">CV</div>
                              <div className="text-xs text-[#9aa0a6]">
                                {exp.metrics.cv_mean?.toFixed(3)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 my-1.5 text-center font-mono">
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">RMSE</div>
                              <div className="text-xs text-[#e8eaed]">
                                {exp.metrics.rmse?.toFixed(3)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">MAE</div>
                              <div className="text-xs text-[#e8eaed]">
                                {exp.metrics.mae?.toFixed(3)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">R2</div>
                              <div className="text-xs text-[#8ab4f8]">
                                {exp.metrics.r2?.toFixed(4)}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1.5 border-t border-[#292a2d] text-[10px] font-mono text-[#9aa0a6]">
                          <span>
                            lr={exp.hyperparameters.learningRate} depth={exp.hyperparameters.maxDepth}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectExperiment(exp.id);
                                setActiveTab('diagnostics');
                              }}
                              className="hover:text-[#e8eaed] underline"
                            >
                              Plots
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreExperiment(exp);
                              }}
                              className="text-[#8ab4f8] hover:underline"
                            >
                              Restore config
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

        {/* ==================== TAB 2: DIAGNOSTICS ==================== */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-3">
            {!selectedExp ? (
              <div className="p-5 rounded bg-[#202124] border border-[#3c4043] text-center text-xs text-[#9aa0a6]">
                Run the pipeline to inspect diagnostic plots and feature importances.
              </div>
            ) : (
              <>
                <div className="p-2.5 rounded bg-[#202124] border border-[#3c4043] text-xs">
                  <div className="font-medium text-[#e8eaed]">
                    Run {selectedExp.runNumber}: {selectedExp.modelName}
                  </div>
                  <div className="text-[11px] font-mono text-[#9aa0a6] mt-0.5">
                    imputer={selectedExp.preprocessingSummary.numericImputer} | scaler=
                    {selectedExp.preprocessingSummary.numericScaler} | encoder=
                    {selectedExp.preprocessingSummary.categoricalEncoder}
                  </div>
                </div>

                {selectedExp.featureImportance && selectedExp.featureImportance.length > 0 && (
                  <div className="p-3 rounded bg-[#202124] border border-[#3c4043] space-y-2">
                    <span className="text-[11px] font-medium text-[#e8eaed] block">
                      Permutation Importance
                    </span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={selectedExp.featureImportance.slice(0, 8)}
                          layout="vertical"
                          margin={{ left: 10, right: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#292a2d" />
                          <XAxis type="number" tick={{ fill: '#9aa0a6', fontSize: 10 }} />
                          <YAxis
                            type="category"
                            dataKey="feature"
                            width={105}
                            tick={{ fill: '#e8eaed', fontSize: 10 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#202124',
                              borderColor: '#3c4043',
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="importance" fill="#8ab4f8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {selectedExp.figures && selectedExp.figures.length > 0 && (
                  <div className="space-y-2">
                    {selectedExp.figures.map((fig, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-[#3c4043] bg-[#202124] p-1"
                      >
                        <img
                          src={fig}
                          alt={`Plot ${idx + 1}`}
                          className="w-full h-auto"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ==================== TAB 3: DATA EXPLORER ==================== */}
        {activeTab === 'data' && dataProfile && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043]">
                <div className="text-[10px] text-[#9aa0a6]">Rows</div>
                <div className="text-xs font-bold text-[#e8eaed]">
                  {dataProfile.shape[0].toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043]">
                <div className="text-[10px] text-[#9aa0a6]">Columns</div>
                <div className="text-xs font-bold text-[#e8eaed]">
                  {dataProfile.shape[1]}
                </div>
              </div>
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043]">
                <div className="text-[10px] text-[#9aa0a6]">Memory</div>
                <div className="text-xs font-bold text-[#e8eaed]">
                  {dataProfile.memory_mb} MB
                </div>
              </div>
            </div>

            <div className="rounded border border-[#3c4043] bg-[#202124] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#252629] border-b border-[#3c4043] text-[11px] font-medium text-[#e8eaed] flex items-center justify-between">
                <span>Column Schema</span>
                <span className="font-mono text-[10px] text-[#9aa0a6]">
                  {dataProfile.dataset_name}
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-[#292a2d]">
                {dataProfile.columns.map((col) => (
                  <div
                    key={col.name}
                    className="px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] font-mono"
                  >
                    <div className="min-w-0">
                      <div className="text-[#e8eaed] truncate">{col.name}</div>
                      <div className="text-[10px] text-[#9aa0a6]">
                        {col.dtype} • {col.nunique} unique
                      </div>
                    </div>
                    <span
                      className={`text-[10px] shrink-0 ${
                        col.missing_pct > 0 ? 'text-[#fdd663]' : 'text-[#9aa0a6]'
                      }`}
                    >
                      {col.missing_pct}% NaN
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded border border-[#3c4043] bg-[#202124] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#252629] border-b border-[#3c4043] text-[11px] font-medium text-[#e8eaed]">
                df.head(5)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] font-mono">
                  <thead>
                    <tr className="bg-[#18191a] border-b border-[#3c4043] text-[#9aa0a6]">
                      {dataProfile.columns.map((c) => (
                        <th key={c.name} className="px-2 py-1 whitespace-nowrap font-normal">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292a2d]">
                    {dataProfile.head.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {dataProfile.columns.map((c) => {
                          const val = row[c.name];
                          return (
                            <td
                              key={c.name}
                              className="px-2 py-1 whitespace-nowrap text-[#e8eaed]"
                            >
                              {val === null || val === undefined ? (
                                <span className="text-[#9aa0a6] italic">NaN</span>
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

      {/* ==================== CONSOLE / TERMINAL DRAWER ==================== */}
      <div className="border-t border-[#3c4043] bg-[#18191a] flex flex-col shrink-0">
        <div
          onClick={() => setCliExpanded((p) => !p)}
          className="px-3 py-1.5 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between cursor-pointer text-xs"
        >
          <span className="font-medium text-[#e8eaed]">
            Console & Kernel Variables
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClearLogs();
            }}
            className="text-[11px] text-[#9aa0a6] hover:text-[#e8eaed]"
          >
            Clear
          </button>
        </div>

        {cliExpanded && (
          <>
            {namespaceVars.length > 0 && (
              <div className="px-3 py-1 bg-[#202124] border-b border-[#292a2d] flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
                <span className="text-[#9aa0a6] shrink-0">vars:</span>
                {namespaceVars.slice(0, 12).map((v) => (
                  <span
                    key={v}
                    className="px-1.5 py-0.2 rounded-sm bg-[#292a2d] text-[#e8eaed] shrink-0"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            <div className="h-32 overflow-y-auto p-2.5 font-mono text-[11px] space-y-0.5 bg-[#18191a]">
              {cliLogs.length === 0 ? (
                <div className="text-[#5f6368]">Ready.</div>
              ) : (
                cliLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`whitespace-pre-wrap break-words ${
                      log.stream === 'stderr'
                        ? 'text-[#f28b82]'
                        : log.stream === 'system'
                        ? 'text-[#9aa0a6]'
                        : 'text-[#e8eaed]'
                    }`}
                  >
                    <span className="text-[#5f6368] select-none">[{log.timestamp}] </span>
                    {log.text}
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleQuickSubmit}
              className="px-2.5 py-1.5 bg-[#202124] border-t border-[#3c4043] flex items-center gap-2"
            >
              <span className="font-mono text-xs text-[#9aa0a6]">&gt;</span>
              <input
                type="text"
                value={quickCmd}
                onChange={(e) => setQuickCmd(e.target.value)}
                placeholder="Evaluate Python expression (e.g. print(df.shape))..."
                className="flex-1 bg-transparent text-xs font-mono text-[#e8eaed] focus:outline-none placeholder:text-[#5f6368]"
              />
            </form>
          </>
        )}
      </div>
    </aside>
  );
};
