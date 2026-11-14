import React, { useMemo } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Minus, Sparkles } from 'lucide-react';
import { ConfigProvenance, ExperimentRecord } from '../types/studio';

interface ExperimentCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  experiments: ExperimentRecord[];
  selectedIds: string[];
  onChangeSelectedIds: (ids: string[]) => void;
  onRestoreExperiment: (exp: ExperimentRecord) => void;
}

const PROVENANCE_LABEL: Record<
  ConfigProvenance,
  { text: string; cls: string }
> = {
  ai_copilot: {
    text: 'AI Copilot (Auto)',
    cls: 'bg-[#c58af9]/15 border-[#c58af9]/40 text-[#c58af9]',
  },
  auto_advisor: {
    text: 'Auto-Advisor',
    cls: 'bg-[#8ab4f8]/15 border-[#8ab4f8]/40 text-[#8ab4f8]',
  },
  tournament: {
    text: 'Auto-Tournament',
    cls: 'bg-[#81c995]/15 border-[#81c995]/40 text-[#81c995]',
  },
  manual: {
    text: 'Thủ công (Manual)',
    cls: 'bg-[#3c4043]/40 border-[#5f6368]/50 text-[#e8eaed]',
  },
};

function getProvenance(exp: ExperimentRecord): ConfigProvenance {
  if (exp.configSource) return exp.configSource;
  const autoCount =
    exp.autoSelectedFields?.length ??
    exp.configSnapshot?.autoSelectedFields?.length ??
    0;
  return autoCount > 0 ? 'auto_advisor' : 'manual';
}

function getOverfitGap(exp: ExperimentRecord): number | null {
  const tr = exp.metrics.train_score;
  const cv = exp.metrics.cv_mean;
  if (typeof tr !== 'number' || typeof cv !== 'number') return null;
  if (exp.taskType === 'classification') {
    return Number((tr - cv).toFixed(4));
  }
  // For regression RMSE, CV - Train (positive means train error is lower than CV error)
  return Number((cv - tr).toFixed(4));
}

function getPrimaryScore(exp: ExperimentRecord): {
  label: string;
  value: number | null;
  higherIsBetter: boolean;
} {
  if (exp.taskType === 'classification') {
    return {
      label: 'Holdout AUC',
      value: exp.metrics.roc_auc ?? exp.metrics.f1 ?? null,
      higherIsBetter: true,
    };
  }
  return {
    label: 'Holdout R²',
    value: exp.metrics.r2 ?? null,
    higherIsBetter: true,
  };
}

interface ParamFieldDef {
  key: string;
  label: string;
  section: 'overview' | 'hyperparams' | 'preprocess';
  getValue: (exp: ExperimentRecord) => string | number | boolean;
}

const PARAM_FIELDS: ParamFieldDef[] = [
  {
    key: 'provenance',
    label: 'Nguồn cấu hình',
    section: 'overview',
    getValue: (e) => PROVENANCE_LABEL[getProvenance(e)].text,
  },
  {
    key: 'auto_count',
    label: 'Số mục Auto-Optimize',
    section: 'overview',
    getValue: (e) =>
      e.autoSelectedFields?.length ??
      e.configSnapshot?.autoSelectedFields?.length ??
      0,
  },
  {
    key: 'model',
    label: 'Model Family',
    section: 'overview',
    getValue: (e) => e.modelFamily,
  },
  {
    key: 'runtime',
    label: 'Runtime',
    section: 'overview',
    getValue: (e) => e.runtimeUsed,
  },
  {
    key: 'tuning',
    label: 'HP Tuning',
    section: 'hyperparams',
    getValue: (e) =>
      e.tuningStrategy ?? e.configSnapshot?.tuningStrategy ?? 'none',
  },
  {
    key: 'nEstimators',
    label: 'n_estimators / max_iter',
    section: 'hyperparams',
    getValue: (e) => e.hyperparameters.nEstimators,
  },
  {
    key: 'learningRate',
    label: 'learning_rate',
    section: 'hyperparams',
    getValue: (e) => e.hyperparameters.learningRate,
  },
  {
    key: 'maxDepth',
    label: 'max_depth',
    section: 'hyperparams',
    getValue: (e) => e.hyperparameters.maxDepth,
  },
  {
    key: 'minSamplesLeaf',
    label: 'min_samples_leaf',
    section: 'hyperparams',
    getValue: (e) => e.hyperparameters.minSamplesLeaf,
  },
  {
    key: 'l2Regularization',
    label: 'l2_regularization',
    section: 'hyperparams',
    getValue: (e) => e.hyperparameters.l2Regularization,
  },
  {
    key: 'subsample',
    label: 'subsample',
    section: 'hyperparams',
    getValue: (e) => e.hyperparameters.subsample,
  },
  {
    key: 'earlyStopping',
    label: 'early_stopping',
    section: 'hyperparams',
    getValue: (e) => (e.hyperparameters.earlyStopping ? 'ON' : 'OFF'),
  },
  {
    key: 'numImputer',
    label: 'Numeric Imputer',
    section: 'preprocess',
    getValue: (e) => e.preprocessingSummary.numericImputer,
  },
  {
    key: 'catImputer',
    label: 'Categorical Imputer',
    section: 'preprocess',
    getValue: (e) =>
      e.preprocessingSummary.categoricalImputer ??
      e.configSnapshot?.categoricalImputer ??
      'most_frequent',
  },
  {
    key: 'scaler',
    label: 'Numeric Scaler',
    section: 'preprocess',
    getValue: (e) => e.preprocessingSummary.numericScaler,
  },
  {
    key: 'encoder',
    label: 'Categorical Encoder',
    section: 'preprocess',
    getValue: (e) => e.preprocessingSummary.categoricalEncoder,
  },
  {
    key: 'imbalance',
    label: 'Imbalance Strategy',
    section: 'preprocess',
    getValue: (e) => e.preprocessingSummary.imbalanceStrategy,
  },
  {
    key: 'featSel',
    label: 'Feature Selection',
    section: 'preprocess',
    getValue: (e) =>
      e.preprocessingSummary.featureSelection ??
      e.configSnapshot?.featureSelection ??
      'none',
  },
  {
    key: 'logPoly',
    label: 'Log / Poly / VarThresh',
    section: 'preprocess',
    getValue: (e) => {
      const log =
        e.preprocessingSummary.logTransformNumeric ??
        e.configSnapshot?.logTransformNumeric ??
        false;
      const poly =
        e.preprocessingSummary.polynomialInteractions ??
        e.configSnapshot?.polynomialInteractions ??
        false;
      const vt =
        e.preprocessingSummary.varianceThreshold ??
        e.configSnapshot?.varianceThreshold ??
        true;
      return `log=${log ? 'Y' : 'N'}, poly=${poly ? 'Y' : 'N'}, vt=${vt ? 'Y' : 'N'}`;
    },
  },
  {
    key: 'cv',
    label: 'CV Strategy & Folds',
    section: 'preprocess',
    getValue: (e) =>
      `${e.preprocessingSummary.cvStrategy} (${e.preprocessingSummary.cvFolds}f)`,
  },
  {
    key: 'testSize',
    label: 'Holdout Test Size',
    section: 'preprocess',
    getValue: (e) =>
      `${Math.round(
        (e.preprocessingSummary.testSize ??
          e.configSnapshot?.testSize ??
          0.2) * 100
      )}%`,
  },
  {
    key: 'featCount',
    label: 'Số lượng Features',
    section: 'preprocess',
    getValue: (e) => e.preprocessingSummary.featureCount,
  },
];

export const ExperimentCompareModal: React.FC<ExperimentCompareModalProps> = ({
  isOpen,
  onClose,
  experiments,
  selectedIds,
  onChangeSelectedIds,
  onRestoreExperiment,
}) => {
  const orderedExperiments = useMemo(
    () => [...experiments].sort((a, b) => a.runNumber - b.runNumber),
    [experiments]
  );

  const selectedRuns = useMemo(() => {
    const map = new Map(experiments.map((e) => [e.id, e]));
    return selectedIds
      .map((id) => map.get(id))
      .filter((e): e is ExperimentRecord => Boolean(e))
      .slice(0, 5);
  }, [experiments, selectedIds]);

  if (!isOpen) return null;

  const isClass =
    (selectedRuns[0]?.taskType ?? experiments[0]?.taskType ?? 'classification') ===
    'classification';

  const toggleRun = (id: string) => {
    if (selectedIds.includes(id)) {
      onChangeSelectedIds(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < 5) {
      onChangeSelectedIds([...selectedIds, id]);
    }
  };

  const selectPreset = (mode: 'latest2' | 'latest5' | 'top3') => {
    if (mode === 'latest2') {
      onChangeSelectedIds(orderedExperiments.slice(-2).map((e) => e.id));
    } else if (mode === 'latest5') {
      onChangeSelectedIds(orderedExperiments.slice(-5).map((e) => e.id));
    } else {
      const sorted = [...experiments].sort((a, b) => {
        const sa = getPrimaryScore(a).value ?? -999;
        const sb = getPrimaryScore(b).value ?? -999;
        return sb - sa;
      });
      onChangeSelectedIds(
        sorted
          .slice(0, 3)
          .sort((a, b) => a.runNumber - b.runNumber)
          .map((e) => e.id)
      );
    }
  };

  interface MetricRowDef {
    key: string;
    label: string;
    higherIsBetter: boolean;
    decimals: number;
    suffix?: string;
    getValue: (e: ExperimentRecord) => number | null;
  }

  const metricRows: MetricRowDef[] = isClass
    ? [
        {
          key: 'roc_auc',
          label: 'Holdout ROC-AUC',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.roc_auc ?? null,
        },
        {
          key: 'cv_mean',
          label: 'CV Mean',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.cv_mean ?? null,
        },
        {
          key: 'train_score',
          label: 'Train Score',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.train_score ?? null,
        },
        {
          key: 'overfit_gap',
          label: 'Overfit Gap (Train - CV)',
          higherIsBetter: false,
          decimals: 4,
          getValue: getOverfitGap,
        },
        {
          key: 'cv_std',
          label: 'CV Std (Độ lệch)',
          higherIsBetter: false,
          decimals: 4,
          getValue: (e) => e.metrics.cv_std ?? null,
        },
        {
          key: 'f1',
          label: 'F1-Score',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.f1 ?? null,
        },
        {
          key: 'accuracy',
          label: 'Accuracy',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.accuracy ?? null,
        },
        {
          key: 'precision',
          label: 'Precision',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.precision ?? null,
        },
        {
          key: 'recall',
          label: 'Recall',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.recall ?? null,
        },
        {
          key: 'duration',
          label: 'Thời gian chạy',
          higherIsBetter: false,
          decimals: 2,
          suffix: 's',
          getValue: (e) => Number((e.durationMs / 1000).toFixed(2)),
        },
      ]
    : [
        {
          key: 'r2',
          label: 'Holdout R²',
          higherIsBetter: true,
          decimals: 4,
          getValue: (e) => e.metrics.r2 ?? null,
        },
        {
          key: 'rmse',
          label: 'Holdout RMSE',
          higherIsBetter: false,
          decimals: 4,
          getValue: (e) => e.metrics.rmse ?? null,
        },
        {
          key: 'mae',
          label: 'Holdout MAE',
          higherIsBetter: false,
          decimals: 4,
          getValue: (e) => e.metrics.mae ?? null,
        },
        {
          key: 'cv_mean',
          label: 'CV Mean (RMSE)',
          higherIsBetter: false,
          decimals: 4,
          getValue: (e) => e.metrics.cv_mean ?? null,
        },
        {
          key: 'train_score',
          label: 'Train RMSE',
          higherIsBetter: false,
          decimals: 4,
          getValue: (e) => e.metrics.train_score ?? null,
        },
        {
          key: 'overfit_gap',
          label: 'Overfit Gap (CV - Train)',
          higherIsBetter: false,
          decimals: 4,
          getValue: getOverfitGap,
        },
        {
          key: 'cv_std',
          label: 'CV Std',
          higherIsBetter: false,
          decimals: 4,
          getValue: (e) => e.metrics.cv_std ?? null,
        },
        {
          key: 'duration',
          label: 'Thời gian chạy',
          higherIsBetter: false,
          decimals: 2,
          suffix: 's',
          getValue: (e) => Number((e.durationMs / 1000).toFixed(2)),
        },
      ];

  // Build root-cause insights for each adjacent pair Run i -> Run i+1
  const transitionInsights = selectedRuns.slice(0, -1).map((prevRun, i) => {
    const nextRun = selectedRuns[i + 1];
    const primary = getPrimaryScore(nextRun);
    const prevPrimary = getPrimaryScore(prevRun);
    const deltaPrimary =
      primary.value !== null && prevPrimary.value !== null
        ? primary.value - prevPrimary.value
        : null;
    const deltaCv =
      typeof nextRun.metrics.cv_mean === 'number' &&
      typeof prevRun.metrics.cv_mean === 'number'
        ? nextRun.metrics.cv_mean - prevRun.metrics.cv_mean
        : null;
    const prevGap = getOverfitGap(prevRun);
    const nextGap = getOverfitGap(nextRun);
    const deltaGap =
      prevGap !== null && nextGap !== null ? nextGap - prevGap : null;

    const changedParams = PARAM_FIELDS.filter(
      (f) => String(f.getValue(prevRun)) !== String(f.getValue(nextRun))
    ).map((f) => `${f.label}: ${f.getValue(prevRun)} → ${f.getValue(nextRun)}`);

    return {
      prevRun,
      nextRun,
      primaryLabel: primary.label,
      deltaPrimary,
      deltaCv,
      deltaGap,
      changedParams,
    };
  });

  const renderMetricDeltaCell = (
    prevVal: number | null,
    nextVal: number | null,
    row: MetricRowDef
  ) => {
    if (prevVal === null || nextVal === null) {
      return (
        <span className="text-[10px] font-mono text-[#5f6368]">—</span>
      );
    }
    const diff = nextVal - prevVal;
    if (Math.abs(diff) < 1e-6) {
      return (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#9aa0a6]">
            <Minus className="w-2.5 h-2.5" /> 0
          </span>
        </div>
      );
    }
    const isGood = row.higherIsBetter ? diff > 0 : diff < 0;
    const sign = diff > 0 ? '+' : '';
    const barPct = Math.min(
      100,
      Math.max(12, Math.abs(diff / (Math.abs(prevVal) || 1)) * 400)
    );
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-1">
        <span
          className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold ${
            isGood ? 'text-[#81c995]' : 'text-[#f28b82]'
          }`}
        >
          {diff > 0 ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {sign}
          {diff.toFixed(row.decimals)}
          {row.suffix || ''}
        </span>
        <div className="w-full h-1 rounded-full bg-[#18191a] overflow-hidden">
          <div
            className={`h-full rounded-full ${
              isGood ? 'bg-[#81c995]' : 'bg-[#f28b82]'
            }`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[96vw] max-h-[92vh] bg-[#202124] border border-[#3c4043] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#e8eaed]"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#292a2d] border-b border-[#3c4043] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8ab4f8]" />
              <span>So sánh chuyên sâu các lần chạy (2 – 5 Runs + Thanh Delta ở giữa)</span>
            </h2>
            <p className="text-[11px] text-[#9aa0a6]">
              Lưu toàn bộ thông số từ Model, Hyperparameters, Preprocessing, Nguồn Auto/AI/Manual và đối chiếu biến động giữa từng cặp lần chạy.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#303134] hover:bg-[#3c4043] text-xs border border-[#3c4043]"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đóng</span>
          </button>
        </div>

        {/* Run Selector Bar (up to 5 runs) */}
        <div className="px-4 py-2.5 bg-[#18191a] border-b border-[#3c4043] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#9aa0a6] mr-1">
              Chọn 2–5 runs ({selectedRuns.length}/5):
            </span>
            {orderedExperiments.map((exp) => {
              const active = selectedIds.includes(exp.id);
              const disabled = !active && selectedIds.length >= 5;
              const prov = getProvenance(exp);
              return (
                <button
                  key={exp.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleRun(exp.id)}
                  className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#8ab4f8]/20 border-[#8ab4f8] text-[#e8eaed]'
                      : disabled
                      ? 'bg-[#202124] border-[#292a2d] text-[#5f6368] cursor-not-allowed'
                      : 'bg-[#202124] border-[#3c4043] text-[#9aa0a6] hover:border-[#5f6368] hover:text-[#e8eaed]'
                  }`}
                >
                  <span className="font-semibold text-[#8ab4f8]">
                    Run #{exp.runNumber}
                  </span>
                  <span>{exp.modelFamily}</span>
                  <span
                    className={`px-1 rounded text-[9px] border ${PROVENANCE_LABEL[prov].cls}`}
                  >
                    {prov === 'ai_copilot'
                      ? 'AI'
                      : prov === 'auto_advisor'
                      ? 'Auto'
                      : prov === 'tournament'
                      ? 'Tour'
                      : 'Manual'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => selectPreset('latest2')}
              className="px-2 py-1 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043]"
            >
              2 gần nhất
            </button>
            <button
              type="button"
              onClick={() => selectPreset('top3')}
              className="px-2 py-1 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043]"
            >
              Top 3 tốt nhất
            </button>
            <button
              type="button"
              onClick={() => selectPreset('latest5')}
              className="px-2 py-1 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043]"
            >
              5 gần nhất
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar bg-[#18191a]">
          {selectedRuns.length < 2 ? (
            <div className="p-8 rounded border border-[#3c4043] bg-[#202124] text-center text-xs text-[#9aa0a6]">
              Hãy chọn ít nhất <strong className="text-[#e8eaed]">2 lần chạy</strong> ở thanh phía trên để xem bảng so sánh và các cột đối chiếu ở giữa.
            </div>
          ) : (
            <>
              {/* Root-Cause Insights per Transition */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {transitionInsights.map((tr) => {
                  const improved = (tr.deltaPrimary ?? 0) > 0;
                  return (
                    <div
                      key={`${tr.prevRun.id}_${tr.nextRun.id}`}
                      className="p-3 rounded bg-[#202124] border border-[#3c4043] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-semibold text-[#8ab4f8]">
                          Run #{tr.prevRun.runNumber} → Run #{tr.nextRun.runNumber}
                        </span>
                        {tr.deltaPrimary !== null && (
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold ${
                              improved
                                ? 'bg-[#81c995]/15 text-[#81c995]'
                                : tr.deltaPrimary < 0
                                ? 'bg-[#f28b82]/15 text-[#f28b82]'
                                : 'bg-[#3c4043] text-[#9aa0a6]'
                            }`}
                          >
                            {tr.primaryLabel}: {tr.deltaPrimary > 0 ? '+' : ''}
                            {tr.deltaPrimary.toFixed(4)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-[#9aa0a6] flex flex-wrap gap-2">
                        {tr.deltaCv !== null && (
                          <span>
                            CV:{' '}
                            <strong
                              className={
                                (isClass ? tr.deltaCv >= 0 : tr.deltaCv <= 0)
                                  ? 'text-[#81c995]'
                                  : 'text-[#f28b82]'
                              }
                            >
                              {tr.deltaCv > 0 ? '+' : ''}
                              {tr.deltaCv.toFixed(4)}
                            </strong>
                          </span>
                        )}
                        {tr.deltaGap !== null && (
                          <span>
                            Overfit Gap:{' '}
                            <strong
                              className={
                                tr.deltaGap <= 0
                                  ? 'text-[#81c995]'
                                  : 'text-[#fdd663]'
                              }
                            >
                              {tr.deltaGap > 0 ? '+' : ''}
                              {tr.deltaGap.toFixed(4)}
                            </strong>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#e8eaed] space-y-0.5 pt-1 border-t border-[#292a2d]">
                        {tr.changedParams.length === 0 ? (
                          <span className="text-[#9aa0a6]">
                            Không có tham số nào thay đổi.
                          </span>
                        ) : (
                          tr.changedParams.slice(0, 4).map((chg, cIdx) => (
                            <div key={cIdx} className="truncate font-mono text-[#fdd663]" title={chg}>
                              • {chg}
                            </div>
                          ))
                        )}
                        {tr.changedParams.length > 4 && (
                          <div className="text-[9px] text-[#9aa0a6] font-mono">
                            +{tr.changedParams.length - 4} thay đổi khác (xem bảng dưới)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Main Side-by-Side Table with Dedicated Delta Columns in Between */}
              <div className="rounded border border-[#3c4043] bg-[#202124] overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#292a2d] border-b border-[#3c4043]">
                      <th className="sticky left-0 z-10 bg-[#292a2d] text-left px-3 py-2.5 font-mono text-[11px] text-[#9aa0a6] min-w-[175px] border-r border-[#3c4043]">
                        Thông số / Metric
                      </th>
                      {selectedRuns.map((run, idx) => {
                        const prov = getProvenance(run);
                        return (
                          <React.Fragment key={run.id}>
                            <th className="px-3 py-2 text-center min-w-[135px] border-r border-[#3c4043]">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-[#8ab4f8] font-semibold">
                                    Run #{run.runNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onRestoreExperiment(run)}
                                    className="px-1.5 py-0 rounded text-[9px] bg-[#303134] hover:bg-[#3c4043] text-[#81c995] border border-[#3c4043]"
                                    title="Khôi phục cấu hình của lần chạy này"
                                  >
                                    Restore
                                  </button>
                                </div>
                                <span className="text-[11px] font-medium text-[#e8eaed]">
                                  {run.modelFamily}
                                </span>
                                <span
                                  className={`px-1.5 py-0 rounded text-[9px] font-mono border ${PROVENANCE_LABEL[prov].cls}`}
                                >
                                  {PROVENANCE_LABEL[prov].text}
                                </span>
                              </div>
                            </th>
                            {idx < selectedRuns.length - 1 && (
                              <th className="px-2 py-2 text-center min-w-[115px] bg-[#1b1c1f] border-r border-[#3c4043] font-mono text-[10px] text-[#fdd663]">
                                <div>
                                  Δ #{run.runNumber} → #{selectedRuns[idx + 1].runNumber}
                                </div>
                                <div className="text-[9px] text-[#9aa0a6] font-normal">
                                  (Tăng / Giảm)
                                </div>
                              </th>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {/* Section: Metrics */}
                    <tr className="bg-[#252629] border-b border-[#3c4043]">
                      <td
                        colSpan={selectedRuns.length * 2}
                        className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#8ab4f8] font-semibold"
                      >
                        1. Điểm số &amp; Chẩn đoán (Metrics)
                      </td>
                    </tr>
                    {metricRows.map((row) => {
                      const vals = selectedRuns.map(row.getValue);
                      const validNums = vals.filter(
                        (v): v is number => v !== null
                      );
                      const bestVal =
                        validNums.length > 0
                          ? row.higherIsBetter
                            ? Math.max(...validNums)
                            : Math.min(...validNums)
                          : null;

                      return (
                        <tr
                          key={row.key}
                          className="border-b border-[#292a2d] hover:bg-[#252629]/60"
                        >
                          <td className="sticky left-0 z-10 bg-[#202124] px-3 py-2 font-mono text-[11px] text-[#e8eaed] border-r border-[#3c4043]">
                            {row.label}
                          </td>
                          {selectedRuns.map((run, idx) => {
                            const val = vals[idx];
                            const isBest =
                              val !== null &&
                              bestVal !== null &&
                              Math.abs(val - bestVal) < 1e-6;
                            return (
                              <React.Fragment key={run.id}>
                                <td
                                  className={`px-3 py-2 text-center font-mono text-xs border-r border-[#3c4043] ${
                                    isBest
                                      ? 'text-[#81c995] font-semibold bg-[#81c995]/5'
                                      : 'text-[#e8eaed]'
                                  }`}
                                >
                                  {val !== null
                                    ? `${val.toFixed(row.decimals)}${row.suffix || ''}`
                                    : '—'}
                                </td>
                                {idx < selectedRuns.length - 1 && (
                                  <td className="px-2 py-2 text-center bg-[#18191a]/80 border-r border-[#3c4043]">
                                    {renderMetricDeltaCell(
                                      val,
                                      vals[idx + 1],
                                      row
                                    )}
                                  </td>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Sections: Overview, Hyperparameters, Preprocessing */}
                    {(
                      [
                        {
                          id: 'overview',
                          title: '2. Nguồn cấu hình & Mô hình',
                        },
                        {
                          id: 'hyperparams',
                          title: '3. Hyperparameters (Tham số mô hình)',
                        },
                        {
                          id: 'preprocess',
                          title: '4. Preprocessing, Feature Eng. & CV',
                        },
                      ] as const
                    ).map((sec) => (
                      <React.Fragment key={sec.id}>
                        <tr className="bg-[#252629] border-b border-[#3c4043]">
                          <td
                            colSpan={selectedRuns.length * 2}
                            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#81c995] font-semibold"
                          >
                            {sec.title}
                          </td>
                        </tr>
                        {PARAM_FIELDS.filter((f) => f.section === sec.id).map(
                          (field) => {
                            const vals = selectedRuns.map((r) =>
                              field.getValue(r)
                            );
                            return (
                              <tr
                                key={field.key}
                                className="border-b border-[#292a2d] hover:bg-[#252629]/60"
                              >
                                <td className="sticky left-0 z-10 bg-[#202124] px-3 py-1.5 font-mono text-[11px] text-[#9aa0a6] border-r border-[#3c4043]">
                                  {field.label}
                                </td>
                                {selectedRuns.map((run, idx) => {
                                  const v = vals[idx];
                                  const nextV = vals[idx + 1];
                                  const changed =
                                    idx < selectedRuns.length - 1 &&
                                    String(v) !== String(nextV);
                                  const numDiff =
                                    changed &&
                                    typeof v === 'number' &&
                                    typeof nextV === 'number'
                                      ? nextV - v
                                      : null;
                                  return (
                                    <React.Fragment key={run.id}>
                                      <td className="px-3 py-1.5 text-center font-mono text-[11px] text-[#e8eaed] border-r border-[#3c4043]">
                                        {String(v)}
                                      </td>
                                      {idx < selectedRuns.length - 1 && (
                                        <td className="px-2 py-1.5 text-center font-mono text-[10px] bg-[#18191a]/80 border-r border-[#3c4043]">
                                          {changed ? (
                                            <span className="text-[#fdd663] font-medium">
                                              {numDiff !== null
                                                ? `${numDiff > 0 ? '+' : ''}${Number(
                                                    numDiff.toFixed(4)
                                                  )} (${v}→${nextV})`
                                                : `${v} → ${nextV}`}
                                            </span>
                                          ) : (
                                            <span className="text-[#5f6368]">
                                              =
                                            </span>
                                          )}
                                        </td>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tr>
                            );
                          }
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
