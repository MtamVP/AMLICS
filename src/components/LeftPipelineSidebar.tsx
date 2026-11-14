import React, { useState } from 'react';
import {
  Database,
  ShieldAlert,
  Split,
  Sliders,
  ChevronDown,
  ChevronRight,
  Upload,
  Link2,
  CheckSquare,
  Square,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import {
  CategoricalEncoderStrategy,
  CategoricalImputerStrategy,
  DataProfile,
  ImbalanceStrategy,
  ModelFamily,
  NumericImputerStrategy,
  NumericScalerStrategy,
  PipelineConfig,
  TaskType,
} from '../types/studio';

interface LeftPipelineSidebarProps {
  config: PipelineConfig;
  dataProfile: DataProfile | null;
  onChangeConfig: (updater: (prev: PipelineConfig) => PipelineConfig) => void;
  onSelectSampleDataset: (sampleId: string) => void;
  onUploadCsvClick: () => void;
}

const MODEL_OPTIONS: {
  id: ModelFamily;
  label: string;
  badge: string;
  tier: string;
}[] = [
  {
    id: 'HistGradientBoosting',
    label: 'HistGradientBoosting (Fast GBDT)',
    badge: 'Recommended',
    tier: 'Wasm + Cloud',
  },
  {
    id: 'LightGBM',
    label: 'LightGBM (Leaf-wise GBDT)',
    badge: 'High AUC',
    tier: 'Cloud Native / Wasm Auto',
  },
  {
    id: 'XGBoost',
    label: 'XGBoost (Depth-wise GBDT)',
    badge: 'Kaggle Meta',
    tier: 'Cloud Native / Wasm Auto',
  },
  {
    id: 'CatBoost',
    label: 'CatBoost (Oblivious Trees)',
    badge: 'Categorical Pro',
    tier: 'Cloud Native / Wasm Auto',
  },
  {
    id: 'RandomForest',
    label: 'Random Forest (Bagging)',
    badge: 'Robust',
    tier: 'Wasm + Cloud',
  },
  {
    id: 'ExtraTrees',
    label: 'Extra Trees (Extreme Random)',
    badge: 'Low Variance',
    tier: 'Wasm + Cloud',
  },
  {
    id: 'LinearModel',
    label: 'Logistic / Ridge Regression',
    badge: 'Baseline',
    tier: 'Wasm + Cloud',
  },
  {
    id: 'MLPNeuralNet',
    label: 'MLP Deep Neural Network',
    badge: '2-Layer Perceptrons',
    tier: 'Wasm + Cloud',
  },
];

export const LeftPipelineSidebar: React.FC<LeftPipelineSidebarProps> = ({
  config,
  dataProfile,
  onChangeConfig,
  onSelectSampleDataset,
  onUploadCsvClick,
}) => {
  const [openSection, setOpenSection] = useState<number>(1);

  const toggleSection = (sec: number) => {
    setOpenSection((prev) => (prev === sec ? 0 : sec));
  };

  const columns = dataProfile?.columns || [];

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
    const colMeta = columns.find((c) => c.name === newTarget);
    const guessedTask: TaskType =
      colMeta && colMeta.nunique <= 10 ? 'classification' : prevTaskOrDefault(config.taskType, colMeta?.nunique);

    onChangeConfig((prev) => ({
      ...prev,
      targetColumn: newTarget,
      taskType: guessedTask,
      numericColumns: prev.numericColumns.filter((c) => c !== newTarget),
      categoricalColumns: prev.categoricalColumns.filter((c) => c !== newTarget),
      dropColumns: prev.dropColumns.filter((c) => c !== newTarget),
    }));
  };

  return (
    <aside className="w-full h-full bg-slate-900/80 border-r border-slate-800 flex flex-col overflow-hidden select-none">
      {/* Sidebar Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Pipeline Configurator
          </span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          UI ➔ Code
        </span>
      </div>

      {/* Scrollable Accordion Steps */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 custom-scrollbar">
        {/* ==================== STEP 1: DATA & SCHEMA ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(1)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                1
              </span>
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">
                Data Source & Feature Roles
              </span>
            </div>
            {openSection === 1 ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === 1 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-slate-950/40">
              {/* Source Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({ ...p, datasetSource: 'sample' }))
                  }
                  className={`py-1 rounded font-medium transition-colors ${
                    config.datasetSource === 'sample'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Built-in Demo
                </button>
                <button
                  type="button"
                  onClick={onUploadCsvClick}
                  className={`py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
                    config.datasetSource === 'upload'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3 h-3" /> CSV File
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({ ...p, datasetSource: 'cloud_url' }))
                  }
                  className={`py-1 rounded font-medium flex items-center justify-center gap-1 transition-colors ${
                    config.datasetSource === 'cloud_url'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Link2 className="w-3 h-3" /> URL/Path
                </button>
              </div>

              {config.datasetSource === 'sample' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-400 block">
                    Chọn bộ dữ liệu thực nghiệm:
                  </label>
                  <select
                    value={config.sampleDatasetId}
                    onChange={(e) => onSelectSampleDataset(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {SAMPLE_DATASETS.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.rowsCount} rows)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {config.datasetSource === 'upload' && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-dashed border-slate-700 text-center space-y-1.5">
                  <p className="text-xs text-slate-300 truncate">
                    {config.uploadedFileName
                      ? `📄 ${config.uploadedFileName}`
                      : 'Chưa chọn file CSV'}
                  </p>
                  <button
                    type="button"
                    onClick={onUploadCsvClick}
                    className="px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium"
                  >
                    Chọn file .CSV khác
                  </button>
                </div>
              )}

              {config.datasetSource === 'cloud_url' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 block">
                    Đường dẫn file trên Colab/Kaggle hoặc URL CSV:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: /kaggle/input/titanic/train.csv hoặc https://..."
                    value={config.cloudDatasetUrl}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        cloudDatasetUrl: e.target.value,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              {/* Target Column & Task Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Biến mục tiêu (Target y):
                  </label>
                  <select
                    value={config.targetColumn}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-500/40 rounded-md px-2 py-1.5 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-400"
                  >
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        🎯 {c.name} ({c.nunique} val)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Loại bài toán (Task):
                  </label>
                  <select
                    value={config.taskType}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        taskType: e.target.value as TaskType,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>
              </div>

              {/* Column Roles Matrix (Synced from DataProfile) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Phân vai cột ({columns.length} cột):</span>
                  <span className="text-[10px] text-slate-500">
                    Num: {config.numericColumns.length} | Cat: {config.categoricalColumns.length} | Drop: {config.dropColumns.length}
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/90 divide-y divide-slate-800/60">
                  {columns
                    .filter((c) => c.name !== config.targetColumn)
                    .map((col) => {
                      const isNum = config.numericColumns.includes(col.name);
                      const isCat = config.categoricalColumns.includes(col.name);
                      const isDrop = config.dropColumns.includes(col.name);
                      return (
                        <div
                          key={col.name}
                          className="px-2 py-1.5 flex items-center justify-between gap-1 text-[11px] hover:bg-slate-800/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono truncate ${
                                  isDrop ? 'line-through text-slate-500' : 'text-slate-200'
                                }`}
                                title={col.name}
                              >
                                {col.name}
                              </span>
                              {col.missing_pct > 0 && (
                                <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-300">
                                  {col.missing_pct}% NaN
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'numeric')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isNum
                                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Num
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'categorical')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isCat
                                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Cat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'drop')}
                              className={`p-0.5 rounded ${
                                isDrop
                                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                  : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                              }`}
                              title="Loại bỏ cột này (Drop)"
                            >
                              <Trash2 className="w-3 h-3" />
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

        {/* ==================== STEP 2: ANTI-LEAKAGE PREPROCESSING ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(2)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center border border-emerald-500/30">
                2
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                Anti-Leakage Preprocessing
              </span>
            </div>
            {openSection === 2 ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === 2 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-slate-950/40">
              <div className="p-2 rounded-md bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300/90 leading-relaxed">
                🛡️ Sinh tự động <code>ColumnTransformer</code> để chỉ tính Mean/Median/Scale bên trong từng Fold Train.
              </div>

              {/* Numeric Branch */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider block">
                  Nhánh biến số (Numeric Pipeline)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Xử lý NaN (Imputer):
                    </label>
                    <select
                      value={config.numericImputer}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          numericImputer: e.target.value as NumericImputerStrategy,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="median">Median (Chống nhiễu)</option>
                      <option value="mean">Mean (Trung bình)</option>
                      <option value="most_frequent">Most Frequent</option>
                      <option value="constant_zero">Fill Constant (0)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Chuẩn hóa (Scaler):
                    </label>
                    <select
                      value={config.numericScaler}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          numericScaler: e.target.value as NumericScalerStrategy,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="robust">RobustScaler (IQR)</option>
                      <option value="standard">StandardScaler (Z)</option>
                      <option value="minmax">MinMaxScaler [0,1]</option>
                      <option value="none">Passthrough (Giữ nguyên)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({
                      ...p,
                      addMissingIndicator: !p.addMissingIndicator,
                    }))
                  }
                  className="flex items-center gap-2 text-xs text-slate-300 hover:text-white pt-0.5"
                >
                  {config.addMissingIndicator ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Thêm cột đánh dấu vị trí khuyết (add_indicator=True)</span>
                </button>
              </div>

              {/* Categorical Branch */}
              <div className="space-y-2 pt-2 border-t border-slate-800/70">
                <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
                  Nhánh phân loại (Categorical Pipeline)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Xử lý NaN:
                    </label>
                    <select
                      value={config.categoricalImputer}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          categoricalImputer: e.target.value as CategoricalImputerStrategy,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="most_frequent">Most Frequent</option>
                      <option value="constant_missing">Nhãn 'Missing'</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Mã hóa (Encoder):
                    </label>
                    <select
                      value={config.categoricalEncoder}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          categoricalEncoder: e.target.value as CategoricalEncoderStrategy,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="onehot">OneHotEncoder (Ignore Unseen)</option>
                      <option value="ordinal">OrdinalEncoder (-1 Unseen)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== STEP 3: VALIDATION & IMBALANCE ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(3)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center border border-amber-500/30">
                3
              </span>
              <Split className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">
                Validation & Imbalance
              </span>
            </div>
            {openSection === 3 ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === 3 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-slate-950/40">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Số Fold Cross-Validation:
                  </label>
                  <select
                    value={config.cvFolds}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        cvFolds: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value={3}>3-Fold CV (Nhanh)</option>
                    <option value={5}>5-Fold CV (Chuẩn công nghiệp)</option>
                    <option value={10}>10-Fold CV (Kỹ lưỡng)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Tỷ lệ Holdout Test:
                  </label>
                  <select
                    value={config.testSize}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        testSize: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value={0.15}>15% Test / 85% Train</option>
                    <option value={0.2}>20% Test / 80% Train</option>
                    <option value={0.25}>25% Test / 75% Train</option>
                    <option value={0.3}>30% Test / 70% Train</option>
                  </select>
                </div>
              </div>

              {config.taskType === 'classification' && (
                <>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Xử lý dữ liệu mất cân bằng (Imbalanced Data):
                    </label>
                    <select
                      value={config.imbalanceStrategy}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          imbalanceStrategy: e.target.value as ImbalanceStrategy,
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200"
                    >
                      <option value="class_weight">
                        Balanced Class Weights (Trọng số lớp tự động)
                      </option>
                      <option value="random_oversample">
                        Random Oversampling (Chỉ nhân bản trên tập Train)
                      </option>
                      <option value="none">None (Giữ nguyên phân phối gốc)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onChangeConfig((p) => ({
                        ...p,
                        stratifiedCV: !p.stratifiedCV,
                      }))
                    }
                    className="flex items-center gap-2 text-xs text-slate-300 hover:text-white"
                  >
                    {config.stratifiedCV ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>Bảo toàn tỷ lệ nhãn (Stratified K-Fold & Split)</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ==================== STEP 4: MODEL & HYPERPARAMETERS ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(4)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center justify-center border border-rose-500/30">
                4
              </span>
              <Sliders className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-semibold text-slate-200">
                Model & Hyperparameters
              </span>
            </div>
            {openSection === 4 ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {openSection === 4 && (
            <div className="px-3.5 pb-4 pt-1 space-y-3 bg-slate-950/40">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Kiến trúc thuật toán (Estimator Family):
                </label>
                <div className="space-y-1">
                  {MODEL_OPTIONS.map((m) => {
                    const selected = config.modelFamily === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          onChangeConfig((p) => ({ ...p, modelFamily: m.id }))
                        }
                        className={`w-full text-left px-2.5 py-1.5 rounded-md border text-xs flex items-center justify-between transition-all ${
                          selected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-medium truncate">{m.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                            selected
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hyperparameter Sliders */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-400">n_estimators / max_iter:</span>
                    <span className="font-mono text-indigo-300 font-semibold">
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
                        hyperparameters: {
                          ...p.hyperparameters,
                          nEstimators: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-400">learning_rate:</span>
                    <span className="font-mono text-indigo-300 font-semibold">
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
                        hyperparameters: {
                          ...p.hyperparameters,
                          learningRate: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400">max_depth:</span>
                      <span className="font-mono text-indigo-300 font-semibold">
                        {config.hyperparameters.maxDepth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={16}
                      step={1}
                      value={config.hyperparameters.maxDepth}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          hyperparameters: {
                            ...p.hyperparameters,
                            maxDepth: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400">l2_reg:</span>
                      <span className="font-mono text-indigo-300 font-semibold">
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
                          hyperparameters: {
                            ...p.hyperparameters,
                            l2Regularization: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

function prevTaskOrDefault(current: TaskType, nunique?: number): TaskType {
  if (typeof nunique === 'number') {
    return nunique <= 10 ? 'classification' : 'regression';
  }
  return current;
}
