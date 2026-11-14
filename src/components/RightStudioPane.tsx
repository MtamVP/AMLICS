import React, { useEffect, useState } from 'react';
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
  PipelineConfig,
  TaskType,
} from '../types/studio';
import { evaluateModelHealth } from '../utils/autoOptimizer';

export interface WhatIfResult {
  prediction: string | number;
  probabilities?: Record<string, number>;
  error?: string;
}

interface RightStudioPaneProps {
  taskType: TaskType;
  config: PipelineConfig;
  dataProfile: DataProfile | null;
  experiments: ExperimentRecord[];
  selectedExpId: string | null;
  onSelectExperiment: (id: string) => void;
  onRestoreExperiment: (exp: ExperimentRecord) => void;
  onInsertMarkdownSummary: (exp: ExperimentRecord) => void;
  onClearExperiments: () => void;
  cliLogs: CliLogEntry[];
  onClearLogs: () => void;
  namespaceVars: string[];
  onRunQuickCommand: (cmd: string) => void;
  onWhatIfPredict: (row: Record<string, string | number>) => void;
  whatIfLoading: boolean;
  whatIfResult: WhatIfResult | null;
}

export const RightStudioPane: React.FC<RightStudioPaneProps> = ({
  taskType,
  config,
  dataProfile,
  experiments,
  selectedExpId,
  onSelectExperiment,
  onRestoreExperiment,
  onInsertMarkdownSummary,
  onClearExperiments,
  cliLogs,
  onClearLogs,
  namespaceVars,
  onRunQuickCommand,
  onWhatIfPredict,
  whatIfLoading,
  whatIfResult,
}) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'diagnostics' | 'data' | 'predict'>('leaderboard');
  const [quickCmd, setQuickCmd] = useState<string>('');
  const [cliExpanded, setCliExpanded] = useState<boolean>(false);
  const [filterCurrentDataset, setFilterCurrentDataset] = useState<boolean>(false);
  const [whatIfValues, setWhatIfValues] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (!dataProfile) return;
    const sampleRow = dataProfile.head?.[0] || {};
    const next: Record<string, string | number> = {};
    config.numericColumns.forEach((col) => {
      const meta = dataProfile.columns.find((c) => c.name === col);
      const raw = sampleRow[col];
      if (raw !== undefined && raw !== null && raw !== '') {
        next[col] = Number(raw);
      } else if (meta?.mean !== undefined) {
        next[col] = Number(meta.mean.toFixed(3));
      } else {
        next[col] = 0;
      }
    });
    config.categoricalColumns.forEach((col) => {
      const meta = dataProfile.columns.find((c) => c.name === col);
      const raw = sampleRow[col];
      const topKeys = meta?.top_values ? Object.keys(meta.top_values) : [];
      if (raw !== undefined && raw !== null && raw !== '') {
        next[col] = String(raw);
      } else if (topKeys.length > 0) {
        next[col] = topKeys[0];
      } else {
        next[col] = '';
      }
    });
    setWhatIfValues(next);
  }, [dataProfile?.dataset_name, config.numericColumns.join(','), config.categoricalColumns.join(',')]);

  const currentDsName = dataProfile?.dataset_name || '';

  const visibleExperiments = filterCurrentDataset && currentDsName
    ? experiments.filter((e) => e.datasetName === currentDsName)
    : experiments;

  const selectedExp =
    visibleExperiments.find((e) => e.id === selectedExpId) ||
    visibleExperiments[0] ||
    null;

  const sortedExperiments = [...visibleExperiments].sort((a, b) => {
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

  const comparisonChartData = [...visibleExperiments]
    .slice()
    .reverse()
    .map((exp) => ({
      name: `#${exp.runNumber} ${exp.modelFamily.slice(0, 7)}`,
      Holdout:
        exp.taskType === 'classification'
          ? exp.metrics.roc_auc ?? 0
          : exp.metrics.r2 ?? 0,
      CV_Mean: exp.metrics.cv_mean ?? 0,
    }));

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCmd.trim()) return;
    onRunQuickCommand(quickCmd.trim());
    setQuickCmd('');
  };

  const warnings = dataProfile?.warnings || [];

  return (
    <aside className="w-full h-full bg-[#202124] border-l border-[#3c4043] flex flex-col overflow-hidden select-none">
      {/* Tab Strip */}
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
          Leaderboard ({visibleExperiments.length})
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
          className={`py-2.5 border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'data'
              ? 'border-[#8ab4f8] text-[#8ab4f8] font-medium'
              : 'border-transparent text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          <span>Data & Warnings</span>
          {warnings.length > 0 && (
            <span className="px-1 rounded-sm bg-[#3c4043] text-[#fdd663] font-mono text-[10px]">
              {warnings.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('predict')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'predict'
              ? 'border-[#81c995] text-[#81c995] font-medium'
              : 'border-transparent text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          Try / Predict
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#18191a] custom-scrollbar">
        {/* ==================== TAB 1: LEADERBOARD ==================== */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3">
            {experiments.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-[#9aa0a6]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterCurrentDataset}
                    onChange={() => setFilterCurrentDataset((p) => !p)}
                    className="accent-[#8ab4f8]"
                  />
                  <span>Filter by {currentDsName || 'current dataset'}</span>
                </label>
                <button
                  type="button"
                  onClick={onClearExperiments}
                  className="hover:text-[#f28b82]"
                >
                  Clear all
                </button>
              </div>
            )}

            {visibleExperiments.length === 0 ? (
              <div className="p-5 rounded bg-[#202124] border border-[#3c4043] text-center space-y-1.5">
                <div className="text-xs font-medium text-[#e8eaed]">
                  No experiment runs recorded
                </div>
                <p className="text-[11px] text-[#9aa0a6]">
                  Click <strong>Run all</strong> in the top toolbar to train the pipeline and compare runs.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 rounded bg-[#202124] border border-[#3c4043] space-y-2">
                  <div className="text-[11px] font-medium text-[#e8eaed]">
                    Holdout vs Cross-Validation Mean
                  </div>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#292a2d" />
                        <XAxis dataKey="name" tick={{ fill: '#9aa0a6', fontSize: 10 }} />
                        <YAxis
                          domain={taskType === 'classification' ? [0.4, 1.0] : ['auto', 'auto']}
                          tick={{ fill: '#9aa0a6', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#202124',
                            borderColor: '#3c4043',
                            fontSize: '11px',
                          }}
                        />
                        <Bar dataKey="Holdout" fill="#8ab4f8" />
                        <Bar dataKey="CV_Mean" fill="#81c995" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Experiment Cards */}
                <div className="space-y-2">
                  {sortedExperiments.map((exp, rankIdx) => {
                    const isSelected = selectedExp?.id === exp.id;
                    const health = evaluateModelHealth(exp);
                    const gradeColor =
                      health.grade === 'A+' || health.grade === 'A'
                        ? 'bg-[#81c995]/15 border-[#81c995]/40 text-[#81c995]'
                        : health.grade === 'B'
                        ? 'bg-[#8ab4f8]/15 border-[#8ab4f8]/40 text-[#8ab4f8]'
                        : health.grade === 'C'
                        ? 'bg-[#fdd663]/15 border-[#fdd663]/40 text-[#fdd663]'
                        : 'bg-[#f28b82]/15 border-[#f28b82]/40 text-[#f28b82]';
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
                        <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[11px] text-[#9aa0a6]">
                              #{rankIdx + 1}
                            </span>
                            <span
                              title={`Model Health Score: ${health.healthScore}/100`}
                              className={`px-1.5 py-0 rounded border font-mono text-[10px] font-semibold shrink-0 ${gradeColor}`}
                            >
                              {health.grade} ({health.healthScore})
                            </span>
                            <span className="font-medium text-[#e8eaed] truncate">
                              Run {exp.runNumber}: {exp.modelName}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#9aa0a6] shrink-0">
                            {exp.datasetName} • {(exp.durationMs / 1000).toFixed(2)}s
                          </span>
                        </div>

                        {health.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {health.badges.map((b, bIdx) => (
                              <span
                                key={bIdx}
                                title={b.tip}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                  b.level === 'good'
                                    ? 'bg-[#81c995]/10 border-[#81c995]/30 text-[#81c995]'
                                    : b.level === 'warn'
                                    ? 'bg-[#fdd663]/10 border-[#fdd663]/30 text-[#fdd663]'
                                    : 'bg-[#f28b82]/10 border-[#f28b82]/30 text-[#f28b82]'
                                }`}
                              >
                                {b.label}
                              </span>
                            ))}
                          </div>
                        )}

                        {exp.taskType === 'classification' ? (
                          <div className="grid grid-cols-4 gap-1.5 my-1.5 text-center font-mono">
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">Holdout AUC</div>
                              <div className="text-xs text-[#8ab4f8]">
                                {exp.metrics.roc_auc?.toFixed(4)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">CV Mean±Std</div>
                              <div className="text-[11px] text-[#81c995]">
                                {exp.metrics.cv_mean?.toFixed(3)}±{exp.metrics.cv_std?.toFixed(2)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">Train AUC</div>
                              <div className="text-xs text-[#9aa0a6]">
                                {exp.metrics.train_score?.toFixed(3) ?? '-'}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">F1 / Acc</div>
                              <div className="text-[11px] text-[#e8eaed]">
                                {exp.metrics.f1?.toFixed(2)}/{exp.metrics.accuracy?.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 my-1.5 text-center font-mono">
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">Holdout RMSE</div>
                              <div className="text-xs text-[#e8eaed]">
                                {exp.metrics.rmse?.toFixed(3)}
                              </div>
                            </div>
                            <div className="p-1 rounded bg-[#18191a] border border-[#292a2d]">
                              <div className="text-[9px] text-[#9aa0a6]">CV RMSE</div>
                              <div className="text-xs text-[#81c995]">
                                {exp.metrics.cv_mean?.toFixed(3)}
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
                                onInsertMarkdownSummary(exp);
                              }}
                              className="hover:text-[#e8eaed] underline"
                              title="Insert a Markdown summary cell of this run into the notebook"
                            >
                              + MD Note
                            </button>
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
                              Restore
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
                    Run {selectedExp.runNumber}: {selectedExp.modelName} ({selectedExp.datasetName})
                  </div>
                  <div className="text-[11px] font-mono text-[#9aa0a6] mt-0.5">
                    imputer={selectedExp.preprocessingSummary.numericImputer} | scaler=
                    {selectedExp.preprocessingSummary.numericScaler} | cv=
                    {selectedExp.preprocessingSummary.cvStrategy}
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

        {/* ==================== TAB 3: DATA EXPLORER & LEAKAGE WARNINGS ==================== */}
        {activeTab === 'data' && dataProfile && (
          <div className="space-y-3">
            {/* Summary Metrics */}
            <div className="grid grid-cols-4 gap-1.5 font-mono">
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043]">
                <div className="text-[9px] text-[#9aa0a6]">Rows</div>
                <div className="text-xs font-bold text-[#e8eaed]">
                  {dataProfile.shape[0].toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043]">
                <div className="text-[9px] text-[#9aa0a6]">Cols</div>
                <div className="text-xs font-bold text-[#e8eaed]">
                  {dataProfile.shape[1]}
                </div>
              </div>
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043]">
                <div className="text-[9px] text-[#9aa0a6]">Duplicates</div>
                <div className="text-xs font-bold text-[#e8eaed]">
                  {dataProfile.duplicate_rows ?? 0}
                </div>
              </div>
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043]">
                <div className="text-[9px] text-[#9aa0a6]">RAM</div>
                <div className="text-xs font-bold text-[#e8eaed]">
                  {dataProfile.memory_mb}MB
                </div>
              </div>
            </div>

            {/* Automated Leakage & Data Quality Warnings */}
            {warnings.length > 0 && (
              <div className="rounded border border-[#3c4043] bg-[#202124] overflow-hidden">
                <div className="px-3 py-1.5 bg-[#252629] border-b border-[#3c4043] text-[11px] font-medium text-[#fdd663]">
                  Automated Data Quality & Leakage Checks ({warnings.length})
                </div>
                <div className="p-2.5 space-y-1.5 text-[11px]">
                  {warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#18191a] border border-[#292a2d] text-[#e8eaed] leading-snug"
                    >
                      <span
                        className={`font-mono text-[10px] mr-1.5 px-1 py-0.5 rounded-sm ${
                          w.level === 'warning'
                            ? 'bg-[#3c4043] text-[#fdd663]'
                            : 'bg-[#292a2d] text-[#8ab4f8]'
                        }`}
                      >
                        {w.kind}
                      </span>
                      {w.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                      <div className="text-[#e8eaed] truncate flex items-center gap-1.5">
                        <span>{col.name}</span>
                        {col.is_id_like && (
                          <span className="text-[9px] px-1 rounded-sm bg-[#3c4043] text-[#fdd663]">
                            ID (Auto-dropped)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#9aa0a6]">
                        {col.dtype} • {col.nunique} unique
                        {col.mean !== undefined ? ` • mean=${col.mean}` : ''}
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

        {/* ==================== TAB 4: WHAT-IF PLAYGROUND ==================== */}
        {activeTab === 'predict' && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-[#202124] border border-[#3c4043] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#e8eaed]">
                  What-If Playground (full_pipeline)
                </span>
                <span className="text-[10px] font-mono text-[#9aa0a6]">
                  Target: {config.targetColumn || '—'}
                </span>
              </div>
              <p className="text-[11px] text-[#9aa0a6] leading-snug">
                Thử nhập 1 dòng dữ liệu mới để kiểm tra dự đoán trực tiếp từ{' '}
                <code className="text-[#8ab4f8]">full_pipeline</code> sau khi train.
              </p>

              {!dataProfile ||
              (config.numericColumns.length === 0 &&
                config.categoricalColumns.length === 0) ? (
                <div className="text-[11px] text-[#fdd663] py-2">
                  Hãy Load / Upload dataset và chạy Run all trước khi dùng Try / Predict.
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {config.numericColumns.map((col) => {
                      const meta = dataProfile.columns.find((c) => c.name === col);
                      return (
                        <div key={col} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-[#e8eaed] truncate">{col}</span>
                            {meta && meta.min !== undefined && meta.max !== undefined && (
                              <span className="text-[#9aa0a6]">
                                [{meta.min.toFixed(1)} .. {meta.max.toFixed(1)}]
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            step="any"
                            value={whatIfValues[col] ?? 0}
                            onChange={(e) =>
                              setWhatIfValues((prev) => ({
                                ...prev,
                                [col]: e.target.value === '' ? 0 : Number(e.target.value),
                              }))
                            }
                            className="w-full bg-[#18191a] border border-[#3c4043] rounded px-2 py-1 text-xs font-mono text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                          />
                        </div>
                      );
                    })}

                    {config.categoricalColumns.map((col) => {
                      const meta = dataProfile.columns.find((c) => c.name === col);
                      const topVals = meta?.top_values ? Object.keys(meta.top_values) : [];
                      return (
                        <div key={col} className="space-y-0.5">
                          <div className="text-[10px] font-mono text-[#e8eaed] truncate">
                            {col}
                          </div>
                          {topVals.length > 0 ? (
                            <select
                              value={String(whatIfValues[col] ?? topVals[0])}
                              onChange={(e) =>
                                setWhatIfValues((prev) => ({
                                  ...prev,
                                  [col]: e.target.value,
                                }))
                              }
                              className="w-full bg-[#18191a] border border-[#3c4043] rounded px-2 py-1 text-xs font-mono text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                            >
                              {topVals.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={String(whatIfValues[col] ?? '')}
                              onChange={(e) =>
                                setWhatIfValues((prev) => ({
                                  ...prev,
                                  [col]: e.target.value,
                                }))
                              }
                              className="w-full bg-[#18191a] border border-[#3c4043] rounded px-2 py-1 text-xs font-mono text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={whatIfLoading}
                    onClick={() => onWhatIfPredict(whatIfValues)}
                    className="w-full py-1.5 rounded bg-[#81c995] hover:bg-[#a8dab5] disabled:opacity-50 text-[#202124] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {whatIfLoading ? 'Đang dự đoán...' : 'Predict (full_pipeline)'}
                  </button>
                </>
              )}
            </div>

            {whatIfResult && (
              <div className="p-3 rounded bg-[#202124] border border-[#3c4043] space-y-2">
                {whatIfResult.error ? (
                  <div className="text-xs text-[#f28b82] font-mono whitespace-pre-wrap">
                    {whatIfResult.error}
                  </div>
                ) : (
                  <>
                    <div className="text-[10px] font-mono text-[#9aa0a6]">
                      Predicted {config.targetColumn}:
                    </div>
                    <div className="text-lg font-mono font-semibold text-[#81c995]">
                      {String(whatIfResult.prediction)}
                    </div>
                    {whatIfResult.probabilities && (
                      <div className="space-y-1 pt-1 border-t border-[#292a2d]">
                        <div className="text-[10px] font-mono text-[#9aa0a6]">
                          Class probabilities:
                        </div>
                        {Object.entries(whatIfResult.probabilities).map(([cls, prob]) => (
                          <div key={cls} className="space-y-0.5">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-[#e8eaed]">{cls}</span>
                              <span className="text-[#8ab4f8]">
                                {(prob * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded bg-[#18191a] overflow-hidden">
                              <div
                                className="h-full bg-[#8ab4f8]"
                                style={{ width: `${Math.min(100, Math.max(0, prob * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
                placeholder="Evaluate Python expression (e.g. df.head(3))..."
                className="flex-1 bg-transparent text-xs font-mono text-[#e8eaed] focus:outline-none placeholder:text-[#5f6368]"
              />
            </form>
          </>
        )}
      </div>
    </aside>
  );
};
