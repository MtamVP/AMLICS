import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { PUBLIC_URL_PRESETS } from '../data/sampleDatasets';
import { inferTaskTypeAndReason } from '../utils/autoOptimizer';
import {
  CategoricalEncoderStrategy,
  CategoricalImputerStrategy,
  CVStrategy,
  DataProfile,
  FeatureSelectionStrategy,
  ImbalanceStrategy,
  ModelFamily,
  NumericImputerStrategy,
  NumericScalerStrategy,
  PipelineConfig,
  RuntimeMode,
  ScoringMetricStrategy,
  TaskType,
  TuningStrategy,
} from '../types/studio';

interface LeftPipelineSidebarProps {
  config: PipelineConfig;
  runtimeMode: RuntimeMode;
  dataProfile: DataProfile | null;
  availableCloudFiles: string[];
  lockedPipelineCount?: number;
  urlLoading: boolean;
  urlError: string | null;
  onChangeConfig: (updater: (prev: PipelineConfig) => PipelineConfig) => void;
  onUnlockAllPipelineCells?: () => void;
  onUploadCsvClick: () => void;
  onUploadTestCsvClick: () => void;
  onUploadSampleSubCsvClick: () => void;
  onClearTrainCsv?: () => void;
  onClearTestCsv?: () => void;
  onFetchPublicUrl: (url: string, presetId?: string) => void;
  onUseCloudDatasetPath?: (cloudPath: string) => void;
  onSwitchToCloud: () => void;
  onAutoOptimize: () => void;
}

const MODEL_OPTIONS: { id: ModelFamily; label: string }[] = [
  { id: 'HistGradientBoosting', label: 'HistGradientBoosting (Fast GBDT)' },
  { id: 'LightGBM', label: 'LightGBM (Leaf-wise GBDT)' },
  { id: 'XGBoost', label: 'XGBoost (Extreme Gradient Boosting)' },
  { id: 'CatBoost', label: 'CatBoost (Ordered Boosting)' },
  { id: 'GradientBoosting', label: 'GradientBoosting (Classic sklearn)' },
  { id: 'RandomForest', label: 'RandomForest (Bagging Ensemble)' },
  { id: 'ExtraTrees', label: 'ExtraTrees (Randomized Trees)' },
  { id: 'DecisionTree', label: 'DecisionTree (CART Baseline)' },
  { id: 'LinearModel', label: 'Logistic / Ridge Regression' },
  { id: 'SVM', label: 'SVM / SVR (RBF Kernel)' },
  { id: 'KNeighbors', label: 'K-Nearest Neighbors (KNN)' },
  { id: 'MLPNeuralNet', label: 'MLP Neural Network' },
];

export const LeftPipelineSidebar: React.FC<LeftPipelineSidebarProps> = ({
  config,
  runtimeMode,
  dataProfile,
  availableCloudFiles,
  lockedPipelineCount = 0,
  urlLoading,
  urlError,
  onChangeConfig,
  onUnlockAllPipelineCells,
  onUploadCsvClick,
  onUploadTestCsvClick,
  onUploadSampleSubCsvClick,
  onClearTrainCsv,
  onClearTestCsv,
  onFetchPublicUrl,
  onUseCloudDatasetPath,
  onSwitchToCloud,
  onAutoOptimize,
}) => {
  const [openSection, setOpenSection] = useState<number>(1);
  const [showAdvPrep, setShowAdvPrep] = useState<boolean>(false);
  const [showAdvHp, setShowAdvHp] = useState<boolean>(false);

  const isAuto = (field: string) =>
    Boolean(config.autoSelectedFields?.includes(field));

  const stripAuto = (prev: PipelineConfig, field: string) =>
    (prev.autoSelectedFields || []).filter((f) => f !== field);

  const AutoBadge = ({ field }: { field: string }) =>
    isAuto(field) ? (
      <span
        title="Được chọn tự động bởi Smart Auto-Advisor / AI"
        className="ml-1 px-1.5 py-0 rounded-full bg-[#8ab4f8]/10 border border-[#8ab4f8]/25 text-[#8ab4f8]/90 font-mono text-[9px] leading-tight"
      >
        Auto
      </span>
    ) : null;

  const toggleSection = (sec: number) => {
    setOpenSection((prev) => (prev === sec ? 0 : sec));
  };

  const columns = dataProfile?.columns || [];
  const totalRows = dataProfile?.shape[0] || 0;

  const handleRoleToggle = (colName: string, role: 'numeric' | 'categorical' | 'drop') => {
    if (colName === config.targetColumn) return;
    onChangeConfig((prev) => {
      const numSet = new Set(prev.numericColumns.filter((c) => c !== colName));
      const catSet = new Set(prev.categoricalColumns.filter((c) => c !== colName));
      const dropSet = new Set(prev.dropColumns.filter((c) => c !== colName));

      if (role === 'numeric') numSet.add(colName);
      if (role === 'categorical') catSet.add(colName);
      if (role === 'drop') dropSet.add(colName);

      return {
        ...prev,
        numericColumns: Array.from(numSet),
        categoricalColumns: Array.from(catSet),
        dropColumns: Array.from(dropSet),
      };
    });
  };

  const handleTargetChange = (newTarget: string) => {
    const inferred = dataProfile
      ? inferTaskTypeAndReason(dataProfile, newTarget)
      : null;
    const colMeta = columns.find((c) => c.name === newTarget);
    const guessedTask: TaskType =
      inferred?.taskType ||
      (colMeta && colMeta.nunique <= 12 ? 'classification' : 'regression');

    onChangeConfig((prev) => ({
      ...prev,
      targetColumn: newTarget,
      taskType: guessedTask,
      cvStrategy:
        guessedTask === 'classification' ? 'stratified_kfold' : 'kfold',
      numericColumns: prev.numericColumns.filter((c) => c !== newTarget),
      categoricalColumns: prev.categoricalColumns.filter((c) => c !== newTarget),
      dropColumns: prev.dropColumns.filter((c) => c !== newTarget),
      autoSelectedFields: Array.from(
        new Set([...(prev.autoSelectedFields || []), 'taskType', 'cvStrategy']),
      ),
    }));
  };

  const taskInference = dataProfile
    ? inferTaskTypeAndReason(dataProfile, config.targetColumn)
    : null;

  return (
    <aside className="w-full h-full bg-[#1e1f23] border-r border-white/[0.08] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between">
        <span className="text-xs font-semibold tracking-tight text-[#e8eaed]">
          Pipeline Configuration
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-[#9aa0a6]">
          sklearn
        </span>
      </div>

      {/* Smart Auto-Advisor */}
      {dataProfile && (
        <div className="px-3.5 py-2.5 bg-[#18191c] border-b border-white/[0.07] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-[#8ab4f8]/90 truncate">
              {taskInference?.reason || `Task: ${config.taskType}`}
            </span>
            <button
              type="button"
              onClick={onAutoOptimize}
              title="Tự động chọn toàn bộ preprocessing, CV, model & tham số tối ưu cho điểm cao nhất"
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#18191a] text-[10px] font-semibold transition-colors cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-Optimize</span>
            </button>
          </div>
          {config.autoSelectedFields && config.autoSelectedFields.length > 0 && (
            <div className="text-[10px] text-[#9aa0a6] leading-tight">
              Đang bật <span className="text-[#8ab4f8] font-mono">Auto</span> cho{' '}
              <span className="text-[#e8eaed] font-mono tabular-nums">
                {config.autoSelectedFields.length}
              </span>{' '}
              mục (chỉnh tay sẽ tự gỡ).
            </div>
          )}
        </div>
      )}

      {/* Custom Code <-> UI Bidirectional Sync Notice */}
      {lockedPipelineCount > 0 && (
        <div className="px-3.5 py-2 bg-[#2a2417] border-b border-[#fdd663]/30 flex items-center justify-between gap-2 text-[10px]">
          <span className="text-[#fdd663] leading-snug">
            {lockedPipelineCount} cell đang dùng <strong>Custom Code</strong> (thanh bên trái tự đọc từ code).
          </span>
          {onUnlockAllPipelineCells && (
            <button
              type="button"
              onClick={onUnlockAllPipelineCells}
              title="Mở khóa các cell Pipeline để đẩy cấu hình từ thanh bên trái xuống code"
              className="shrink-0 px-2 py-1 rounded bg-[#fdd663] hover:bg-[#fde293] text-[#18191a] font-semibold transition-colors"
            >
              UI → Code
            </button>
          )}
        </div>
      )}

      {/* Large Dataset Warning Banner in Browser Wasm */}
      {runtimeMode === 'pyodide' && totalRows > 30000 && (
        <div className="px-3 py-2 bg-[#2d261b] border-b border-[#fdd663]/40 space-y-1.5 text-[11px]">
          <div className="text-[#fdd663] font-medium">
            Large Dataset ({totalRows.toLocaleString()} rows × {dataProfile?.shape[1]} cols)
          </div>
          <p className="text-[#e8eaed]/80 leading-snug">
            Running full CV in Browser Wasm may exceed memory. Subsample for quick prototyping or switch to Colab/Kaggle.
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() =>
                onChangeConfig((p) => ({
                  ...p,
                  subsampleRows: p.subsampleRows === 10000 ? 0 : 10000,
                }))
              }
              className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                config.subsampleRows === 10000
                  ? 'bg-[#fdd663] text-[#202124] border-[#fdd663] font-semibold'
                  : 'bg-[#202124] text-[#fdd663] border-[#fdd663]/50'
              }`}
            >
              {config.subsampleRows === 10000
                ? '✓ Subsampled (10k)'
                : 'Subsample 10k rows'}
            </button>
            <button
              type="button"
              onClick={onSwitchToCloud}
              className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#303134] hover:bg-[#3c4043] text-[#8ab4f8]"
            >
              Use Colab/Kaggle ↗
            </button>
          </div>
        </div>
      )}

      {/* Accordion Steps */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] custom-scrollbar">
        {/* ==================== 1. DATASET & TARGET ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(1)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              1. Data Source & Schema
            </span>
            {openSection === 1 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 1 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-[#18191a]">
              {/* Source Tabs: Upload | URL | Colab/Kaggle Path */}
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded bg-[#202124] border border-[#3c4043] text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({ ...p, datasetSource: 'upload' }))
                  }
                  className={`py-1 rounded-sm transition-colors ${
                    config.datasetSource === 'upload'
                      ? 'bg-[#303134] text-[#e8eaed] font-medium'
                      : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                  }`}
                >
                  Upload CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({ ...p, datasetSource: 'public_url' }))
                  }
                  className={`py-1 rounded-sm transition-colors ${
                    config.datasetSource === 'public_url'
                      ? 'bg-[#303134] text-[#e8eaed] font-medium'
                      : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                  }`}
                >
                  Public URL
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({ ...p, datasetSource: 'cloud_path' }))
                  }
                  className={`py-1 rounded-sm transition-colors ${
                    config.datasetSource === 'cloud_path'
                      ? 'bg-[#303134] text-[#e8eaed] font-medium'
                      : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                  }`}
                >
                  Colab/Kaggle
                </button>
              </div>

              {/* Tab A: Upload Local CSV (train.csv + optional test.csv) */}
              {config.datasetSource === 'upload' && (
                <div className="space-y-2">
                  <div className="p-2 rounded bg-[#202124] border border-[#3c4043] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#9aa0a6]">Train Dataset</div>
                        <div className="text-xs font-mono text-[#e8eaed] truncate">
                          {config.uploadedFileName || (dataProfile ? dataProfile.dataset_name : 'No file uploaded')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(config.uploadedFileName || dataProfile) && (
                          <button
                            type="button"
                            onClick={() =>
                              onClearTrainCsv
                                ? onClearTrainCsv()
                                : onChangeConfig((p) => ({ ...p, uploadedFileName: '' }))
                            }
                            title="Gỡ bỏ train.csv"
                            className="px-1.5 py-1 rounded bg-[#292a2d] hover:bg-[#f28b82]/20 text-[#9aa0a6] hover:text-[#f28b82] text-[11px]"
                          >
                            ×
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onUploadCsvClick}
                          className="px-2 py-1 rounded bg-[#303134] hover:bg-[#3c4043] text-[#e8eaed] text-[11px] shrink-0"
                        >
                          Select train.csv
                        </button>
                      </div>
                    </div>
                    {(config.uploadedFileName || dataProfile) && (
                      <div className="text-[10px] font-mono text-[#81c995] bg-[#81c995]/10 border border-[#81c995]/25 rounded px-2 py-1 leading-snug">
                        {dataProfile
                          ? `Đã tải lên • ${dataProfile.shape[0].toLocaleString()} dòng × ${dataProfile.shape[1]} cột • Target: ${config.targetColumn}`
                          : `Đã tải file ${config.uploadedFileName} • Đang đọc cấu trúc cột...`}
                      </div>
                    )}
                  </div>

                  <div className="p-2 rounded bg-[#202124] border border-[#3c4043] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#9aa0a6]">
                          Test Dataset (Optional — for submission.csv)
                        </div>
                        <div
                          className={`text-xs font-mono truncate ${
                            config.testUploadedFileName ? 'text-[#e8eaed]' : 'text-[#9aa0a6]'
                          }`}
                        >
                          {config.testUploadedFileName || 'None (uses holdout split)'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {config.testUploadedFileName && (
                          <button
                            type="button"
                            onClick={() =>
                              onClearTestCsv
                                ? onClearTestCsv()
                                : onChangeConfig((p) => ({ ...p, testUploadedFileName: '' }))
                            }
                            title="Gỡ bỏ test.csv"
                            className="px-1.5 py-1 rounded bg-[#292a2d] hover:bg-[#f28b82]/20 text-[#9aa0a6] hover:text-[#f28b82] text-[11px]"
                          >
                            ×
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onUploadTestCsvClick}
                          className="px-2 py-1 rounded bg-[#292a2d] hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#e8eaed] text-[11px] shrink-0"
                        >
                          Select test.csv
                        </button>
                      </div>
                    </div>
                    {config.testUploadedFileName && (
                      <div className="text-[10px] font-mono text-[#81c995] bg-[#81c995]/10 border border-[#81c995]/25 rounded px-2 py-1 leading-snug">
                        Đã tải lên • Sẵn sàng dự đoán xuất submission.csv
                      </div>
                    )}
                  </div>

                  <div className="p-2 rounded bg-[#202124] border border-[#3c4043] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-[#9aa0a6]">
                          Demo Submission (sample_submission.csv)
                        </div>
                        <div className="text-xs font-mono text-[#e8eaed] truncate">
                          {config.sampleSubmission
                            ? `${config.sampleSubmission.fileName} (${config.sampleSubmission.rowCount.toLocaleString()} rows)`
                            : 'Chưa tải (tự suy luận theo Target)'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {config.sampleSubmission && (
                          <button
                            type="button"
                            onClick={() =>
                              onChangeConfig((p) => ({ ...p, sampleSubmission: null }))
                            }
                            title="Gỡ bỏ sample_submission.csv"
                            className="px-1.5 py-1 rounded bg-[#292a2d] hover:bg-[#f28b82]/20 text-[#9aa0a6] hover:text-[#f28b82] text-[11px]"
                          >
                            ×
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onUploadSampleSubCsvClick}
                          className="px-2 py-1 rounded bg-[#292a2d] hover:bg-[#3c4043] text-[#8ab4f8] text-[11px] shrink-0"
                        >
                          Select demo
                        </button>
                      </div>
                    </div>
                    {config.sampleSubmission && (
                      <div className="text-[10px] font-mono text-[#81c995] bg-[#81c995]/10 border border-[#81c995]/25 rounded px-2 py-1 leading-snug">
                        Cấu trúc: [{config.sampleSubmission.columns.join(', ')}] •{' '}
                        {config.sampleSubmission.expectsProbabilities
                          ? 'Xác suất (predict_proba)'
                          : 'Nhãn (predict)'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab B: Public URL (GitHub, Google Drive, HuggingFace, Preset Real CSVs) */}
              {config.datasetSource === 'public_url' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Quick real dataset presets
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const preset = PUBLIC_URL_PRESETS.find(
                          (p) => p.id === e.target.value
                        );
                        if (preset) {
                          onFetchPublicUrl(preset.url, preset.id);
                        }
                      }}
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="">-- Choose a real CSV benchmark --</option>
                      {PUBLIC_URL_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Direct CSV / GitHub blob / Google Drive URL
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="https://raw.githubusercontent.com/.../data.csv"
                        value={config.publicDatasetUrl}
                        onChange={(e) =>
                          onChangeConfig((p) => ({
                            ...p,
                            publicDatasetUrl: e.target.value,
                          }))
                        }
                        className="flex-1 bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed] font-mono focus:outline-none focus:border-[#8ab4f8]"
                      />
                      <button
                        type="button"
                        disabled={urlLoading}
                        onClick={() => onFetchPublicUrl(config.publicDatasetUrl)}
                        className="px-2.5 py-1 rounded bg-[#8ab4f8] hover:bg-[#aecbfa] disabled:opacity-50 text-[#202124] text-xs font-medium shrink-0"
                      >
                        {urlLoading ? '...' : 'Load'}
                      </button>
                    </div>
                  </div>

                  {urlError && (
                    <div className="p-2 rounded bg-[#3c1f1f] border border-[#f28b82]/40 text-[11px] text-[#f28b82]">
                      {urlError}
                    </div>
                  )}
                </div>
              )}

              {/* Tab C: Colab / Kaggle Local Path */}
              {config.datasetSource === 'cloud_path' && (
                <div className="space-y-2">
                  {runtimeMode === 'pyodide' ? (
                    <div className="p-2.5 rounded bg-[#202124] border border-[#3c4043] space-y-1.5 text-[11px] text-[#9aa0a6]">
                      <div>
                        Filesystem paths like <code>/kaggle/input/...</code> or <code>/content/...</code> only exist on the remote Colab/Kaggle machine.
                      </div>
                      <button
                        type="button"
                        onClick={onSwitchToCloud}
                        className="px-2.5 py-1 rounded bg-[#303134] hover:bg-[#3c4043] text-[#8ab4f8] text-xs font-medium"
                      >
                        Switch to Colab / Kaggle Runtime
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] text-[#9aa0a6] block mb-1">
                          Remote file path on Colab / Kaggle
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="/kaggle/input/competition/train.csv"
                            value={config.cloudDatasetPath}
                            onChange={(e) =>
                              onChangeConfig((p) => ({
                                ...p,
                                cloudDatasetPath: e.target.value,
                              }))
                            }
                            className="flex-1 min-w-0 bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] font-mono focus:outline-none focus:border-[#8ab4f8]"
                          />
                          {onUseCloudDatasetPath && (
                            <button
                              type="button"
                              disabled={!config.cloudDatasetPath.trim() || config.cloudDatasetPath.trim() === '/kaggle/input/'}
                              onClick={() => onUseCloudDatasetPath(config.cloudDatasetPath)}
                              className="px-2 py-1.5 rounded bg-[#8ab4f8] hover:bg-[#aecbfa] disabled:opacity-40 text-[#202124] text-[11px] font-medium shrink-0"
                            >
                              Dùng file này
                            </button>
                          )}
                        </div>
                      </div>

                      {availableCloudFiles.length > 0 && (
                        <div>
                          <span className="text-[10px] text-[#9aa0a6] block mb-1">
                            Discovered files on worker ({availableCloudFiles.length}):
                          </span>
                          <div className="max-h-28 overflow-y-auto rounded border border-[#3c4043] bg-[#202124] divide-y divide-[#292a2d]">
                            {availableCloudFiles.map((fp) => (
                              <button
                                key={fp}
                                type="button"
                                onClick={() => {
                                  if (onUseCloudDatasetPath) {
                                    onUseCloudDatasetPath(fp);
                                  } else {
                                    onChangeConfig((p) => ({
                                      ...p,
                                      cloudDatasetPath: fp,
                                    }));
                                  }
                                }}
                                className="w-full text-left px-2 py-1 text-[10px] font-mono text-[#8ab4f8] hover:bg-[#292a2d] truncate"
                              >
                                {fp}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Active Dataset Summary + Subsampling Control */}
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043] flex items-center justify-between gap-2 text-[11px]">
                <span className="font-mono text-[#e8eaed] truncate">
                  {dataProfile ? (
                    <>
                      Active: <strong>{dataProfile.dataset_name}</strong> (
                      {totalRows.toLocaleString()}×{dataProfile.shape[1]})
                    </>
                  ) : (
                    <span className="text-[#9aa0a6]">Chưa nạp dữ liệu CSV</span>
                  )}
                </span>
                <select
                  value={config.subsampleRows}
                  onChange={(e) =>
                    onChangeConfig((p) => ({
                      ...p,
                      subsampleRows: Number(e.target.value),
                    }))
                  }
                  className="bg-[#18191a] border border-[#3c4043] rounded px-1.5 py-0.5 text-[10px] font-mono text-[#9aa0a6]"
                  title="Row subsampling limit"
                >
                  <option value={0}>Full rows</option>
                  <option value={5000}>Sample 5k</option>
                  <option value={10000}>Sample 10k</option>
                  <option value={25000}>Sample 25k</option>
                </select>
              </div>

              {/* Target & Task */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#9aa0a6] block mb-1">
                    Target column (y)
                  </label>
                  <select
                    value={config.targetColumn}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#8ab4f8] font-mono focus:outline-none focus:border-[#8ab4f8]"
                  >
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.nunique})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#9aa0a6] flex items-center mb-1">
                    <span>Task type</span>
                    <AutoBadge field="taskType" />
                  </label>
                  <select
                    value={config.taskType}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        taskType: e.target.value as TaskType,
                        autoSelectedFields: stripAuto(p, 'taskType'),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                  >
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>
              </div>

              {/* Data Cleaning & Submission ID */}
              <div className="grid grid-cols-2 gap-2 items-center">
                <label className="flex items-center gap-1.5 text-[11px] text-[#9aa0a6] hover:text-[#e8eaed] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dropDuplicates}
                    onChange={() =>
                      onChangeConfig((p) => ({
                        ...p,
                        dropDuplicates: !p.dropDuplicates,
                      }))
                    }
                    className="accent-[#8ab4f8]"
                  />
                  <span>Drop duplicate rows</span>
                </label>

                <div>
                  <select
                    value={config.idColumnForSubmission}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        idColumnForSubmission: e.target.value,
                      }))
                    }
                    title="ID column used when exporting submission.csv"
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-1.5 py-1 text-[10px] text-[#9aa0a6] font-mono"
                  >
                    <option value="">ID col: auto</option>
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        ID: {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feature Role Matrix */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#9aa0a6] mb-1">
                  <span>Features ({Math.max(0, columns.length - 1)})</span>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const highMissing = columns
                          .filter((c) => c.name !== config.targetColumn && c.missing_pct >= 50)
                          .map((c) => c.name);
                        if (highMissing.length === 0) return;
                        onChangeConfig((p) => ({
                          ...p,
                          numericColumns: p.numericColumns.filter((c) => !highMissing.includes(c)),
                          categoricalColumns: p.categoricalColumns.filter((c) => !highMissing.includes(c)),
                          dropColumns: Array.from(new Set([...p.dropColumns, ...highMissing])),
                        }));
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#292a2d] hover:bg-[#3c4043] text-[#fdd663]"
                      title="Drop all columns with >= 50% missing values"
                    >
                      Drop &gt;50% NaN
                    </button>
                    <span>
                      n:{config.numericColumns.length} c:{config.categoricalColumns.length} d:{config.dropColumns.length}
                    </span>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto rounded border border-[#3c4043] bg-[#202124] divide-y divide-[#292a2d]">
                  {columns
                    .filter((c) => c.name !== config.targetColumn)
                    .map((col) => {
                      const isNum = config.numericColumns.includes(col.name);
                      const isCat = config.categoricalColumns.includes(col.name);
                      const isDrop = config.dropColumns.includes(col.name);
                      return (
                        <div
                          key={col.name}
                          className="px-2 py-1.5 flex items-center justify-between gap-1 text-[11px]"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-1">
                            <span
                              className={`font-mono truncate ${
                                isDrop ? 'line-through text-[#5f6368]' : 'text-[#e8eaed]'
                              }`}
                              title={col.name}
                            >
                              {col.name}
                            </span>
                            {col.is_id_like && (
                              <span
                                className="px-1 rounded-sm bg-[#3c4043] text-[#fdd663] font-mono text-[9px]"
                                title="Auto-detected identifier column -> Dropped to prevent overfitting/leakage"
                              >
                                ID
                              </span>
                            )}
                            {col.is_constant && (
                              <span className="px-1 rounded-sm bg-[#3c4043] text-[#f28b82] font-mono text-[9px]">
                                Const
                              </span>
                            )}
                            {col.missing_pct > 0 && (
                              <span className="text-[9px] font-mono text-[#9aa0a6]">
                                {col.missing_pct}%NaN
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 font-mono">
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'numeric')}
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                isNum
                                  ? 'bg-[#8ab4f8] text-[#202124] font-semibold'
                                  : 'bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                            >
                              num
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'categorical')}
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                isCat
                                  ? 'bg-[#8ab4f8] text-[#202124] font-semibold'
                                  : 'bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                            >
                              cat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'drop')}
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                isDrop
                                  ? 'bg-[#5f6368] text-[#e8eaed]'
                                  : 'bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                            >
                              drop
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== 2. PREPROCESSING ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(2)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              2. Preprocessing & Feature Eng.
            </span>
            {openSection === 2 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 2 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-[#18191a]">
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043] text-[10px] text-[#9aa0a6] leading-relaxed">
                <span className="text-[#8ab4f8] font-semibold">Học ML:</span> Mọi bước Impute/Scale/Encode đều nằm trong <code>ColumnTransformer</code> để chỉ <code>fit</code> trên tập Train, tránh <b>Data Leakage</b>. Chọn <b>RobustScaler</b> nếu dữ liệu nhiều ngoại lai (outliers).
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-[#9aa0a6] block">
                  Numeric pipeline
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1">
                      <span>Imputer</span>
                      <AutoBadge field="numericImputer" />
                    </label>
                    <select
                      value={config.numericImputer}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          numericImputer: e.target.value as NumericImputerStrategy,
                          autoSelectedFields: stripAuto(p, 'numericImputer'),
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="median">median</option>
                      <option value="mean">mean</option>
                      <option value="most_frequent">most_frequent</option>
                      <option value="constant_zero">constant (0)</option>
                      <option value="knn">KNNImputer (k=5)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1">
                      <span>Scaler</span>
                      <AutoBadge field="numericScaler" />
                    </label>
                    <select
                      value={config.numericScaler}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          numericScaler: e.target.value as NumericScalerStrategy,
                          autoSelectedFields: stripAuto(p, 'numericScaler'),
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="robust">RobustScaler</option>
                      <option value="standard">StandardScaler</option>
                      <option value="minmax">MinMaxScaler</option>
                      <option value="quantile_normal">QuantileTransformer (Normal)</option>
                      <option value="power_yeojohnson">PowerTransformer (Yeo-Johnson)</option>
                      <option value="none">passthrough</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#9aa0a6] hover:text-[#e8eaed] pt-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.addMissingIndicator}
                    onChange={() =>
                      onChangeConfig((p) => ({
                        ...p,
                        addMissingIndicator: !p.addMissingIndicator,
                      }))
                    }
                    className="accent-[#8ab4f8]"
                  />
                  <span>add_indicator=True (Missing mask)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#9aa0a6] hover:text-[#e8eaed] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.logTransformNumeric}
                    onChange={() =>
                      onChangeConfig((p) => ({
                        ...p,
                        logTransformNumeric: !p.logTransformNumeric,
                      }))
                    }
                    className="accent-[#8ab4f8]"
                  />
                  <span>FunctionTransformer (np.log1p skew fix)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-[#9aa0a6] hover:text-[#e8eaed] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.polynomialInteractions}
                    onChange={() =>
                      onChangeConfig((p) => ({
                        ...p,
                        polynomialInteractions: !p.polynomialInteractions,
                      }))
                    }
                    className="accent-[#8ab4f8]"
                  />
                  <span>PolynomialFeatures (deg=2 interactions)</span>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#292a2d]">
                <span className="text-[11px] font-medium text-[#9aa0a6] block">
                  Categorical pipeline
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Imputer
                    </label>
                    <select
                      value={config.categoricalImputer}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          categoricalImputer: e.target.value as CategoricalImputerStrategy,
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="most_frequent">most_frequent</option>
                      <option value="constant_missing">constant ('Missing')</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1">
                      <span>Encoder</span>
                      <AutoBadge field="categoricalEncoder" />
                    </label>
                    <select
                      value={config.categoricalEncoder}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          categoricalEncoder: e.target.value as CategoricalEncoderStrategy,
                          autoSelectedFields: stripAuto(p, 'categoricalEncoder'),
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="onehot">OneHotEncoder</option>
                      <option value="ordinal">OrdinalEncoder</option>
                      <option value="target">TargetEncoder (CV-safe)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1 border-t border-[#292a2d]">
                  <button
                    type="button"
                    onClick={() => setShowAdvPrep((v) => !v)}
                    className="text-[11px] font-mono text-[#8ab4f8] hover:underline flex items-center gap-1"
                  >
                    <span>{showAdvPrep ? '▾' : '▸'} Advanced Feature Eng. & Selection</span>
                  </button>
                </div>

                {showAdvPrep && (
                  <div className="space-y-2 pt-1">
                    {config.categoricalEncoder === 'onehot' && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#9aa0a6]">max_categories (OneHot)</span>
                        <select
                          value={config.maxOneHotCategories}
                          onChange={(e) =>
                            onChangeConfig((p) => ({
                              ...p,
                              maxOneHotCategories: Number(e.target.value),
                            }))
                          }
                          className="bg-[#202124] border border-[#3c4043] rounded px-1.5 py-0.5 text-[11px] text-[#e8eaed] font-mono"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-[#9aa0a6] block mb-1">
                        Feature Selection (Inside Pipeline)
                      </span>
                      <select
                        value={config.featureSelection}
                        onChange={(e) =>
                          onChangeConfig((p) => ({
                            ...p,
                            featureSelection: e.target.value as FeatureSelectionStrategy,
                          }))
                        }
                        className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                      >
                        <option value="none">None (Keep all encoded features)</option>
                        <option value="select_k_best_10">SelectKBest (Top 10 ANOVA/F-test)</option>
                        <option value="select_k_best_20">SelectKBest (Top 20 ANOVA/F-test)</option>
                        <option value="select_from_model">SelectFromModel (RandomForest importance)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-[#9aa0a6] hover:text-[#e8eaed] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.varianceThreshold}
                        onChange={() =>
                          onChangeConfig((p) => ({
                            ...p,
                            varianceThreshold: !p.varianceThreshold,
                          }))
                        }
                        className="accent-[#8ab4f8]"
                      />
                      <span>VarianceThreshold (drop 0-variance)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== 3. VALIDATION & SPLIT ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(3)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              3. Validation & Anti-Leakage Split
            </span>
            {openSection === 3 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 3 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-[#18191a]">
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043] text-[10px] text-[#9aa0a6] leading-relaxed">
                <span className="text-[#8ab4f8] font-semibold">Học ML:</span> Dùng <b>StratifiedKFold</b> cho phân loại mất cân bằng lớp, <b>GroupKFold</b> nếu nhiều dòng thuộc cùng 1 User/ID, và <b>TimeSeriesSplit</b> cho dữ liệu theo thời gian.
              </div>
              <div>
                <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1">
                  <span>Cross-Validation Strategy</span>
                  <AutoBadge field="cvStrategy" />
                </label>
                <select
                  value={config.cvStrategy}
                  onChange={(e) =>
                    onChangeConfig((p) => ({
                      ...p,
                      cvStrategy: e.target.value as CVStrategy,
                      autoSelectedFields: stripAuto(p, 'cvStrategy'),
                    }))
                  }
                  className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] font-mono"
                >
                  <option value="stratified_kfold">StratifiedKFold (Standard Classif.)</option>
                  <option value="repeated_stratified_kfold">RepeatedStratifiedKFold (2× robust)</option>
                  <option value="kfold">KFold (Standard Regress.)</option>
                  <option value="group_kfold">GroupKFold (Prevent Group Leakage)</option>
                  <option value="timeseries_split">TimeSeriesSplit (Prevent Look-ahead Leakage)</option>
                </select>
              </div>

              {config.cvStrategy === 'group_kfold' && (
                <div>
                  <label className="text-[10px] text-[#9aa0a6] block mb-1">
                    Group Column (for GroupKFold)
                  </label>
                  <select
                    value={config.groupColumn}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        groupColumn: e.target.value,
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed] font-mono"
                  >
                    <option value="">-- Auto select first column --</option>
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#9aa0a6] block mb-1">
                    CV Folds
                  </label>
                  <select
                    value={config.cvFolds}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        cvFolds: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed]"
                  >
                    <option value={3}>3-Fold CV</option>
                    <option value={5}>5-Fold CV</option>
                    <option value={10}>10-Fold CV</option>
                    <option value={15}>15-Fold CV</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#9aa0a6] block mb-1">
                    Holdout test_size
                  </label>
                  <select
                    value={config.testSize}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        testSize: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed]"
                  >
                    <option value={0.1}>0.10 (10%)</option>
                    <option value={0.15}>0.15 (15%)</option>
                    <option value={0.2}>0.20 (20%)</option>
                    <option value={0.25}>0.25 (25%)</option>
                    <option value={0.3}>0.30 (30%)</option>
                    <option value={0.4}>0.40 (40%)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1">
                    <span>Scoring Metric</span>
                    <AutoBadge field="scoringMetric" />
                  </label>
                  <select
                    value={config.scoringMetric}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        scoringMetric: e.target.value as ScoringMetricStrategy,
                        autoSelectedFields: stripAuto(p, 'scoringMetric'),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed] font-mono"
                  >
                    <option value="auto">Auto (AUC / RMSE)</option>
                    {config.taskType === 'classification' ? (
                      <>
                        <option value="roc_auc">ROC-AUC</option>
                        <option value="f1_weighted">F1 Weighted</option>
                        <option value="accuracy">Accuracy</option>
                      </>
                    ) : (
                      <>
                        <option value="rmse">RMSE</option>
                        <option value="mae">MAE</option>
                        <option value="r2">R² Score</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#9aa0a6] block mb-1">
                    random_state (Seed)
                  </label>
                  <input
                    type="number"
                    value={config.hyperparameters.randomState}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        hyperparameters: {
                          ...p.hyperparameters,
                          randomState: Number(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed] font-mono"
                  />
                </div>
              </div>

              {config.taskType === 'classification' && (
                <div>
                  <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1">
                    <span>Imbalance handling</span>
                    <AutoBadge field="imbalanceStrategy" />
                  </label>
                  <select
                    value={config.imbalanceStrategy}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        imbalanceStrategy: e.target.value as ImbalanceStrategy,
                        autoSelectedFields: stripAuto(p, 'imbalanceStrategy'),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed]"
                  >
                    <option value="class_weight">class_weight='balanced'</option>
                    <option value="random_oversample">Random Oversample (train fold)</option>
                    <option value="random_undersample">Random Undersample Majority</option>
                    <option value="none">None</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== 4. MODEL, HYPERPARAMETERS & TUNING ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(4)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              4. Estimator & Hyperparameter Tuning
            </span>
            {openSection === 4 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 4 && (
            <div className="px-3.5 pb-4 pt-1 space-y-3 bg-[#18191a]">
              <div className="p-2 rounded bg-[#202124] border border-[#3c4043] text-[10px] text-[#9aa0a6] leading-relaxed">
                <span className="text-[#8ab4f8] font-semibold">Học ML:</span> Tăng <code>max_depth</code> làm mô hình học chi tiết hơn nhưng dễ <b>Overfit</b>. Nếu Train cao hơn CV nhiều, hãy giảm <code>max_depth</code> hoặc tăng <code>l2_reg</code>.
              </div>
              <div>
                <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1">
                  <span>Estimator</span>
                  <AutoBadge field="modelFamily" />
                </label>
                <select
                  value={config.modelFamily}
                  onChange={(e) =>
                    onChangeConfig((p) => ({
                      ...p,
                      modelFamily: e.target.value as ModelFamily,
                      customModelName: null,
                      autoSelectedFields: stripAuto(p, 'modelFamily'),
                    }))
                  }
                  className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] font-mono focus:outline-none focus:border-[#8ab4f8]"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {config.customModelName && (
                  <div className="mt-1.5 px-2 py-1 rounded bg-[#fdd663]/10 border border-[#fdd663]/30 text-[10px] font-mono text-[#fdd663]">
                    Đang dùng Custom Model từ code: <strong>{config.customModelName}</strong>
                  </div>
                )}
              </div>

              <div
                className={
                  config.tuningStrategy === 'randomized_search'
                    ? 'grid grid-cols-[1.45fr_1fr] gap-2 items-end'
                    : 'space-y-1'
                }
              >
                <div>
                  <label className="text-[10px] text-[#9aa0a6] flex items-center mb-1 whitespace-nowrap">
                    <span>Hyperparameter Search</span>
                    <AutoBadge field="tuningStrategy" />
                  </label>
                  <select
                    value={config.tuningStrategy}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        tuningStrategy: e.target.value as TuningStrategy,
                        autoSelectedFields: stripAuto(p, 'tuningStrategy'),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed]"
                  >
                    <option value="none">Manual (Fixed)</option>
                    <option value="randomized_search">RandomizedSearchCV</option>
                    <option value="grid_search">GridSearchCV</option>
                  </select>
                </div>

                {config.tuningStrategy === 'randomized_search' && (
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1 whitespace-nowrap">
                      n_iter (Trials)
                    </label>
                    <select
                      value={config.tuningIterations}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          tuningIterations: Number(e.target.value),
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] font-mono"
                    >
                      <option value={5}>5 trials</option>
                      <option value={8}>8 trials</option>
                      <option value={15}>15 trials</option>
                      <option value={25}>25 trials</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex justify-between items-center text-[11px] font-mono mb-0.5">
                    <span className="text-[#9aa0a6] flex items-center">
                      <span>n_estimators / max_iter</span>
                      <AutoBadge field="hp.nEstimators" />
                    </span>
                    <span className="text-[#e8eaed]">
                      {config.hyperparameters.nEstimators}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={500}
                    step={10}
                    value={config.hyperparameters.nEstimators}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        autoSelectedFields: stripAuto(p, 'hp.nEstimators'),
                        hyperparameters: {
                          ...p.hyperparameters,
                          nEstimators: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-[11px] font-mono mb-0.5">
                    <span className="text-[#9aa0a6] flex items-center">
                      <span>learning_rate</span>
                      <AutoBadge field="hp.learningRate" />
                    </span>
                    <span className="text-[#e8eaed]">
                      {config.hyperparameters.learningRate}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.3}
                    step={0.01}
                    value={config.hyperparameters.learningRate}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        autoSelectedFields: stripAuto(p, 'hp.learningRate'),
                        hyperparameters: {
                          ...p.hyperparameters,
                          learningRate: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between items-center text-[11px] font-mono mb-0.5">
                      <span className="text-[#9aa0a6] flex items-center truncate">
                        <span>max_depth</span>
                        <AutoBadge field="hp.maxDepth" />
                      </span>
                      <span className="text-[#e8eaed]">
                        {config.hyperparameters.maxDepth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={1}
                      value={config.hyperparameters.maxDepth}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          autoSelectedFields: stripAuto(p, 'hp.maxDepth'),
                          hyperparameters: {
                            ...p.hyperparameters,
                            maxDepth: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[11px] font-mono mb-0.5">
                      <span className="text-[#9aa0a6] flex items-center truncate">
                        <span>l2_reg / alpha</span>
                        <AutoBadge field="hp.l2Regularization" />
                      </span>
                      <span className="text-[#e8eaed]">
                        {config.hyperparameters.l2Regularization}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={10.0}
                      step={0.5}
                      value={config.hyperparameters.l2Regularization}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          autoSelectedFields: stripAuto(p, 'hp.l2Regularization'),
                          hyperparameters: {
                            ...p.hyperparameters,
                            l2Regularization: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-1 border-t border-[#292a2d]">
                  <button
                    type="button"
                    onClick={() => setShowAdvHp((v) => !v)}
                    className="text-[11px] font-mono text-[#8ab4f8] hover:underline flex items-center gap-1"
                  >
                    <span>{showAdvHp ? '▾' : '▸'} Advanced Hyperparameters</span>
                  </button>
                </div>

                {showAdvHp && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between items-center text-[11px] font-mono mb-0.5">
                          <span className="text-[#9aa0a6] flex items-center truncate">
                            <span>min_samples_leaf</span>
                            <AutoBadge field="hp.minSamplesLeaf" />
                          </span>
                          <span className="text-[#e8eaed]">
                            {config.hyperparameters.minSamplesLeaf}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={50}
                          step={1}
                          value={config.hyperparameters.minSamplesLeaf}
                          onChange={(e) =>
                            onChangeConfig((p) => ({
                              ...p,
                              autoSelectedFields: stripAuto(p, 'hp.minSamplesLeaf'),
                              hyperparameters: {
                                ...p.hyperparameters,
                                minSamplesLeaf: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[11px] font-mono mb-0.5">
                          <span className="text-[#9aa0a6] flex items-center truncate">
                            <span>subsample</span>
                            <AutoBadge field="hp.subsample" />
                          </span>
                          <span className="text-[#e8eaed]">
                            {config.hyperparameters.subsample}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={1.0}
                          step={0.05}
                          value={config.hyperparameters.subsample}
                          onChange={(e) =>
                            onChangeConfig((p) => ({
                              ...p,
                              autoSelectedFields: stripAuto(p, 'hp.subsample'),
                              hyperparameters: {
                                ...p.hyperparameters,
                                subsample: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-[#9aa0a6] hover:text-[#e8eaed] pt-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.hyperparameters.earlyStopping}
                        onChange={() =>
                          onChangeConfig((p) => ({
                            ...p,
                            autoSelectedFields: stripAuto(p, 'hp.earlyStopping'),
                            hyperparameters: {
                              ...p.hyperparameters,
                              earlyStopping: !p.hyperparameters.earlyStopping,
                            },
                          }))
                        }
                        className="accent-[#8ab4f8]"
                      />
                      <span className="flex items-center">
                        <span>early_stopping=True (Stop on val plateau)</span>
                        <AutoBadge field="hp.earlyStopping" />
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
