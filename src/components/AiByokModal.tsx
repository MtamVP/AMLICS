import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AiOptimizationPlan,
  AiProvider,
  askAiToGenerateCode,
  askAiToOptimizePipeline,
  fetchProviderModels,
  getStoredByokState,
  PROVIDER_CATALOG,
  saveByokState,
  StoredByokState,
} from '../utils/aiByokClient';
import {
  DataProfile,
  ExperimentRecord,
  PipelineConfig,
} from '../types/studio';

interface AiByokModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataProfile: DataProfile | null;
  config: PipelineConfig;
  experiments: ExperimentRecord[];
  lastErrorText?: string;
  activeCell?: { id: string; title: string; code: string } | null;
  onApplyAiOptimization: (plan: AiOptimizationPlan) => void;
  onInsertAiCell: (title: string, code: string) => void;
  onReplaceCellCode?: (cellId: string, newCode: string) => void;
}

interface AiTaskPreset {
  id: string;
  label: string;
  description: string;
  prompt?: string;
}

const AI_TASK_PRESETS: AiTaskPreset[] = [
  {
    id: 'auto_optimize',
    label: '[Auto] AI Auto-Optimize Toàn Bộ Pipeline',
    description:
      'Tự chọn Model, CV Strategy, Preprocessing & Hyperparameters tối ưu nhất cho dataset hiện tại + gắn nhãn [Auto].',
  },
  {
    id: 'complete_pipeline_code',
    label: '[Code] Viết Code Python Hoàn Thiện (End-to-End Clean Code)',
    description:
      'Sinh 1 cell Python hoàn chỉnh, sạch đẹp, có comment tiếng Việt giải thích từng bước từ tiền xử lý đến đánh giá & lưu submission.',
    prompt:
      'Viết một cell Python hoàn thiện, sạch sẽ, chạy độc lập trên df hiện tại: xử lý missing/inf, chia tập chống leakage, huấn luyện mô hình tốt nhất với Pipeline, in chi tiết metric Holdout + CV và vẽ biểu đồ đánh giá. Có comment tiếng Việt rõ ràng.',
  },
  {
    id: 'refactor_active_cell',
    label: '[Refactor] Hoàn thiện, Tối ưu & Chú thích lại Cell đang chọn',
    description:
      'Đọc code của cell bạn đang chọn trong Notebook, sửa lỗi tiềm ẩn, tối ưu tốc độ và thêm chú thích học tập dễ hiểu.',
    prompt:
      'Hãy đọc code của cell đang chọn, hoàn thiện các phần còn thiếu, xử lý edge case (NaN/inf/dtype), tối ưu hiệu năng và thêm comment tiếng Việt giải thích dễ hiểu.',
  },
  {
    id: 'feature_engineering',
    label: '[Feature] + Feature Engineering Cell (Tạo đặc trưng mới)',
    description:
      'Sinh cell Python tạo 4-6 biến tương tác, tỷ lệ hoặc biến thời gian mới dựa trên schema cột thật, không rò rỉ Target.',
    prompt:
      'Viết Python feature engineering tạo 4-6 đặc trưng mới có ý nghĩa dựa trên các cột hiện có của df (tỷ lệ, tương tác, nhóm thống kê), đảm bảo an toàn không rò rỉ target và kiểm tra lại shape/NaN.',
  },
  {
    id: 'deep_eda_charts',
    label: '[EDA] + Deep EDA & Visualization Cell (Biểu đồ chuyên sâu)',
    description:
      'Sinh cell vẽ 3-4 biểu đồ phân tích phân phối, ngoại lai, tương quan với Target phù hợp đúng các cột hiện có.',
    prompt:
      'Viết code EDA bằng matplotlib vẽ 3-4 biểu đồ trực quan (dark_background #202124) phân tích phân phối các cột quan trọng, outlier và mối liên hệ với cột target của df.',
  },
  {
    id: 'ensemble_blending',
    label: '[Ensemble] + Ensemble / Stacking (Kết hợp nhiều Model tăng điểm)',
    description:
      'Viết code Voting / Stacking kết hợp HistGradientBoosting, RandomForest, ExtraTrees và Linear/Ridge để tăng điểm CV & Holdout.',
    prompt:
      'Viết code Python xây dựng mô hình Ensemble (Voting/Stacking) kết hợp HistGradientBoosting, RandomForest, ExtraTrees và Linear/Ridge trên X_train, y_train sử dụng preprocessor hiện tại, so sánh điểm CV/Holdout với mô hình đơn lẻ.',
  },
  {
    id: 'hyperparam_tuning_code',
    label: '[Tuning] + Hyperparameter Search Chuyên sâu (RandomizedSearchCV)',
    description:
      'Sinh cell tìm kiếm bộ siêu tham số tối ưu với không gian tìm kiếm thông minh và in ra Top 5 cấu hình tốt nhất.',
    prompt:
      'Viết code RandomizedSearchCV chuyên sâu cho mô hình hiện tại trên X_train, y_train với pipeline anti-leakage, in Top 5 bộ tham số tốt nhất và cập nhật full_pipeline.',
  },
  {
    id: 'diagnose_fix',
    label: '[Debug] Chẩn đoán Lỗi & Audit Pipeline (Leakage / Outlier / Bug)',
    description:
      'Đọc traceback lỗi gần nhất (nếu có) và viết code khắc phục, hoặc kiểm tra rò rỉ dữ liệu & các điểm làm tụt điểm CV.',
  },
  {
    id: 'explain_results',
    label: '[Coach] Phân tích Điểm số & Kế hoạch Tăng điểm (Coach ML)',
    description:
      'Phân tích kết quả các lần chạy trên Leaderboard (Overfit/Underfit) và sinh cell kiểm chứng bước cải thiện tiếp theo.',
    prompt:
      'Dựa trên lịch sử các lần chạy (experiments) và cấu hình hiện tại, hãy phân tích nguyên nhân điểm chưa tối ưu (Overfit, Underfit, mất cân bằng lớp hay thiếu feature) và viết code kiểm chứng giải pháp cải thiện điểm.',
  },
  {
    id: 'markdown_report',
    label: '[Report] Sinh Báo cáo Tổng kết Thí nghiệm (Report Printer)',
    description:
      'Tạo cell tổng hợp bài toán, dữ liệu, bảng kết quả mô hình, nhận xét ưu/nhược điểm sẵn sàng copy vào báo cáo.',
    prompt:
      'Viết cell Python in ra một báo cáo tổng kết thí nghiệm Machine Learning hoàn chỉnh bằng tiếng Việt (tổng quan dataset, phương pháp chống leakage, kết quả các lần chạy, phân tích Feature Importance và kết luận).',
  },
];

const PROVIDERS: AiProvider[] = ['gemini', 'gpt', 'deepseek'];

export const AiByokModal: React.FC<AiByokModalProps> = ({
  isOpen,
  onClose,
  dataProfile,
  config,
  experiments,
  lastErrorText,
  activeCell,
  onApplyAiOptimization,
  onInsertAiCell,
  onReplaceCellCode,
}) => {
  const [byok, setByok] = useState<StoredByokState>(() => getStoredByokState());
  const [selectedTaskId, setSelectedTaskId] = useState<string>('auto_optimize');
  const [replaceActiveCell, setReplaceActiveCell] = useState<boolean>(true);
  const [showKey, setShowKey] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [liveModels, setLiveModels] = useState<Record<AiProvider, string[]>>({
    gemini: [],
    gpt: [],
    deepseek: [],
  });
  const [fetchingModels, setFetchingModels] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loading = loadingAction !== null;

  useEffect(() => {
    if (isOpen) {
      setByok(getStoredByokState());
      setStatusMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const provider = byok.activeProvider;
  const meta = PROVIDER_CATALOG[provider];
  const currentKey = byok.keys[provider] || '';
  const currentModel = byok.models[provider] || meta.defaultModel;
  const hasKey = currentKey.trim().length > 0;

  const updateByok = (next: StoredByokState) => {
    setByok(next);
    saveByokState(next);
  };

  const handleSelectProvider = (p: AiProvider) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setCustomModelMode(false);
    updateByok({ ...byok, activeProvider: p });
  };

  const handleKeyChange = (val: string) => {
    const next: StoredByokState = {
      ...byok,
      keys: { ...byok.keys, [provider]: val },
    };
    setByok(next);
  };

  const handleModelChange = (val: string) => {
    updateByok({
      ...byok,
      models: { ...byok.models, [provider]: val },
    });
  };

  const handleSaveKey = () => {
    const trimmed = currentKey.trim();
    const next: StoredByokState = {
      ...byok,
      keys: { ...byok.keys, [provider]: trimmed },
    };
    updateByok(next);
    setErrorMsg(null);
    setStatusMsg(`Đã lưu API Key ${meta.label} vào trình duyệt (LocalStorage).`);
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const fetched = await fetchProviderModels(provider, currentKey);
      setLiveModels((prev) => ({ ...prev, [provider]: fetched }));
      if (fetched.length > 0 && !fetched.includes(currentModel)) {
        // Keep user's model unless empty
      }
      setStatusMsg(
        `Đã tải ${fetched.length} model khả dụng từ API ${meta.label}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingModels(false);
    }
  };

  const handleAutoOptimize = async () => {
    if (!hasKey) {
      setErrorMsg(`Vui lòng nhập ${meta.label} API Key ở bước 2 trước khi gọi AI.`);
      return;
    }
    setLoadingAction('optimize');
    setErrorMsg(null);
    setStatusMsg(null);
    saveByokState(byok);
    try {
      const plan = await askAiToOptimizePipeline(
        provider,
        currentKey,
        currentModel,
        dataProfile,
        config,
        experiments,
        customPrompt ||
          'Tối ưu toàn bộ tham số và tiền xử lý để đạt điểm CV cao nhất.'
      );
      onApplyAiOptimization(plan);
      setStatusMsg(
        `[${meta.label} • ${currentModel}] Đã tối ưu [Auto]: ${plan.explanation}`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateCell = async (
    presetPrompt?: string,
    actionKey: string = 'custom'
  ) => {
    if (!hasKey) {
      setErrorMsg(`Vui lòng nhập ${meta.label} API Key ở bước 2 trước khi gọi AI.`);
      return;
    }
    const activeCellContext =
      activeCell && actionKey === 'refactor_active_cell'
        ? `\n\n[CELL ĐANG CHỌN: "${activeCell.title}"]\n\`\`\`python\n${activeCell.code}\n\`\`\``
        : '';
    const promptToSend = `${(presetPrompt || customPrompt).trim()}${activeCellContext}`;
    if (!promptToSend) {
      setErrorMsg('Hãy nhập yêu cầu hoặc chọn 1 tác vụ gợi ý trong danh sách.');
      return;
    }
    setLoadingAction(actionKey);
    setErrorMsg(null);
    setStatusMsg(null);
    saveByokState(byok);
    try {
      const res = await askAiToGenerateCode(
        provider,
        currentKey,
        currentModel,
        dataProfile,
        config,
        experiments,
        promptToSend,
        lastErrorText
      );
      if (
        actionKey === 'refactor_active_cell' &&
        replaceActiveCell &&
        activeCell &&
        onReplaceCellCode
      ) {
        onReplaceCellCode(activeCell.id, res.code);
        setStatusMsg(
          `[${meta.label} • ${currentModel}] Đã cập nhật trực tiếp cell "${activeCell.title}": ${res.explanation}`
        );
      } else {
        onInsertAiCell(res.title || 'AI Generated Cell', res.code);
        setStatusMsg(
          `[${meta.label} • ${currentModel}] Đã chèn cell "${res.title}": ${res.explanation}`
        );
      }
      if (!presetPrompt) setCustomPrompt('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingAction(null);
    }
  };

  // Merge curated + live-fetched models without duplicates
  const curatedIds = new Set(meta.models.map((m) => m.id));
  const extraLive = (liveModels[provider] || []).filter(
    (id) => !curatedIds.has(id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-lg border border-[#3c4043] bg-[#202124] text-[#e8eaed] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#18191a] border-b border-[#3c4043] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#8ab4f8]/15 border border-[#8ab4f8]/40 flex items-center justify-center text-[#8ab4f8]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">
                  AMLICS Plugin AI
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-[#292a2d] border border-[#3c4043] text-[10px] font-mono text-[#81c995]">
                  Multi-Key BYOK
                </span>
              </div>
              <p className="text-[11px] text-[#9aa0a6]">
                Cắm API Key của Gemini, GPT hoặc DeepSeek • Chỉ gửi schema cột &amp; điểm số, không gửi dữ liệu thô.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#303134] text-[#9aa0a6] hover:text-[#e8eaed] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs custom-scrollbar">
          {/* Provider Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#9aa0a6] uppercase tracking-wider font-mono">
                1. Chọn nền tảng AI
              </span>
              <a
                href={meta.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#8ab4f8] hover:underline font-mono"
              >
                Lấy {meta.label} API Key ↗
              </a>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((pId) => {
                const pMeta = PROVIDER_CATALOG[pId];
                const active = provider === pId;
                const configured = Boolean((byok.keys[pId] || '').trim());
                return (
                  <button
                    key={pId}
                    type="button"
                    onClick={() => handleSelectProvider(pId)}
                    className={`px-3 py-2.5 rounded-md border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#292a2d] border-[#8ab4f8] shadow-sm'
                        : 'bg-[#18191a] border-[#3c4043] hover:border-[#5f6368]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          active ? 'text-[#8ab4f8]' : 'text-[#e8eaed]'
                        }`}
                      >
                        {pMeta.label}
                      </span>
                      <span
                        title={configured ? 'Đã có API Key' : 'Chưa nhập Key'}
                        className={`w-2 h-2 rounded-full ${
                          configured ? 'bg-[#81c995]' : 'bg-[#5f6368]'
                        }`}
                      />
                    </div>
                    <div className="text-[10px] text-[#9aa0a6] mt-0.5 truncate">
                      {pMeta.tagline}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: API Key + Model Selection */}
          <div className="p-3.5 rounded-md bg-[#18191a] border border-[#3c4043] space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-[#e8eaed] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  <span>2. Nhập {meta.label} API Key</span>
                </label>
                {hasKey && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#81c995]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Sẵn sàng</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={currentKey}
                    onChange={(e) => handleKeyChange(e.target.value)}
                    placeholder={`Dán ${meta.label} API Key (${meta.keyPlaceholder})`}
                    className="w-full bg-[#202124] border border-[#3c4043] rounded pl-2.5 pr-8 py-1.5 text-xs font-mono text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    title={showKey ? 'Ẩn Key' : 'Hiện Key'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#e8eaed]"
                  >
                    {showKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-3 py-1.5 rounded bg-[#303134] hover:bg-[#3c4043] border border-[#3c4043] text-xs font-medium text-[#e8eaed] cursor-pointer"
                >
                  Lưu Key
                </button>
              </div>
            </div>

            {/* Model Picker (unlocked after key entered, or visible with hint) */}
            <div className="pt-2.5 border-t border-[#292a2d] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#e8eaed]">
                  3. Chọn Model ({meta.label})
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!hasKey || fetchingModels}
                    onClick={handleFetchModels}
                    title="Gọi API lấy danh sách model mới nhất trực tiếp từ tài khoản/key của bạn"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[#8ab4f8] hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {fetchingModels ? 'Đang tải...' : 'Tải model từ Key'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomModelMode((v) => !v)}
                    className="text-[10px] font-mono text-[#9aa0a6] hover:text-[#e8eaed] underline cursor-pointer"
                  >
                    {customModelMode ? 'Chọn từ danh sách' : 'Nhập tay ID model'}
                  </button>
                </div>
              </div>

              {!hasKey ? (
                <div className="px-2.5 py-2 rounded bg-[#202124] border border-dashed border-[#3c4043] text-[11px] text-[#9aa0a6]">
                  Nhập API Key ở bước 2 để mở khóa chọn model (hoặc tải danh sách model trực tiếp từ {meta.label}).
                </div>
              ) : customModelMode ? (
                <input
                  type="text"
                  value={currentModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  placeholder={`Ví dụ: ${meta.defaultModel}`}
                  className="w-full bg-[#202124] border border-[#3c4043] rounded px-2.5 py-1.5 text-xs font-mono text-[#8ab4f8] focus:outline-none focus:border-[#8ab4f8]"
                />
              ) : (
                <select
                  value={currentModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-[#202124] border border-[#3c4043] rounded px-2.5 py-1.5 text-xs font-mono text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                >
                  <optgroup label={`${meta.label} — Đề xuất`}>
                    {meta.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} — {m.note}
                      </option>
                    ))}
                  </optgroup>
                  {extraLive.length > 0 && (
                    <optgroup label="Tải trực tiếp từ API Key của bạn">
                      {extraLive.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Step 4: Quick AI Actions (Compact Dropbox) */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-medium text-[#9aa0a6] uppercase tracking-wider font-mono block">
              4. Tác vụ AI cho Notebook ({dataProfile?.dataset_name || 'Chưa load dataset'})
            </span>

            {(() => {
              const activePreset =
                AI_TASK_PRESETS.find((t) => t.id === selectedTaskId) ||
                AI_TASK_PRESETS[0];

              const runSelectedPreset = () => {
                if (activePreset.id === 'auto_optimize') {
                  void handleAutoOptimize();
                  return;
                }
                if (activePreset.id === 'diagnose_fix') {
                  const diagPrompt = lastErrorText
                    ? 'Phân tích lỗi gần nhất và viết đoạn code sửa lỗi hoặc kiểm tra dữ liệu an toàn.'
                    : 'Viết code kiểm tra nhanh các yếu tố có thể làm giảm điểm CV (leakage, outliers, skewness) và gợi ý cải thiện.';
                  void handleGenerateCell(diagPrompt, 'diagnose_fix');
                  return;
                }
                const extraNote = customPrompt.trim()
                  ? `\nYêu cầu bổ sung từ người dùng: ${customPrompt.trim()}`
                  : '';
                void handleGenerateCell(
                  `${activePreset.prompt || ''}${extraNote}`,
                  activePreset.id
                );
              };

              return (
                <div className="p-3 rounded-md bg-[#18191a] border border-[#3c4043] space-y-2.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="flex-1 bg-[#202124] border border-[#3c4043] rounded-md px-3 py-2 text-xs text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8] cursor-pointer"
                    >
                      {AI_TASK_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={runSelectedPreset}
                      className="px-4 py-2 rounded-md bg-[#8ab4f8] hover:bg-[#aecbfa] disabled:opacity-50 text-[#202124] font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      <Sparkles
                        className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                      />
                      <span>
                        {loading ? 'AI đang xử lý...' : 'Chạy tác vụ AI'}
                      </span>
                    </button>
                  </div>

                  <div className="text-[11px] text-[#9aa0a6] leading-snug">
                    {activePreset.description}
                  </div>

                  {activePreset.id === 'refactor_active_cell' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#292a2d] text-[11px]">
                      <span className="font-mono text-[#8ab4f8] truncate">
                        Cell đang chọn:{' '}
                        {activeCell ? `"${activeCell.title}"` : 'Chưa chọn cell nào'}
                      </span>
                      {activeCell && (
                        <label className="flex items-center gap-1.5 text-[#e8eaed] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={replaceActiveCell}
                            onChange={(e) => setReplaceActiveCell(e.target.checked)}
                            className="accent-[#8ab4f8]"
                          />
                          <span>Ghi đè trực tiếp vào cell này</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {loading && (
              <div className="p-2.5 rounded-md bg-[#8ab4f8]/10 border border-[#8ab4f8]/40 text-[#8ab4f8] text-[11px] font-mono flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>
                  Đang gửi schema tới {meta.label} ({currentModel})...
                </span>
              </div>
            )}
            {statusMsg && (
              <div className="p-2.5 rounded-md bg-[#81c995]/10 border border-[#81c995]/40 text-[#81c995] text-[11px] leading-relaxed">
                {statusMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-2.5 rounded-md bg-[#f28b82]/10 border border-[#f28b82]/40 text-[#f28b82] text-[11px] font-mono whitespace-pre-wrap">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Custom Prompt */}
          <div className="space-y-1.5">
            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Hoặc nhập yêu cầu riêng: VD 'Tạo cell vẽ biểu đồ tương quan top 8 feature với target' hoặc 'Gợi ý cách tăng F1 cho lớp thiểu số'..."
              className="w-full bg-[#18191a] border border-[#3c4043] rounded-md px-3 py-2 text-xs text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#9aa0a6]">
                Active: {meta.label} / {currentModel}
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGenerateCell(undefined, 'custom')}
                className="px-3.5 py-1.5 rounded bg-[#303134] hover:bg-[#3c4043] disabled:opacity-50 border border-[#8ab4f8]/50 text-[#8ab4f8] font-medium cursor-pointer"
              >
                {loadingAction === 'custom'
                  ? 'AI đang xử lý...'
                  : 'Gửi yêu cầu & Sinh Cell'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
