import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  AiOptimizationPlan,
  AiProvider,
  askAiToGenerateCode,
  askAiToOptimizePipeline,
  getStoredAiSettings,
  saveAiSettings,
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
  onApplyAiOptimization: (plan: AiOptimizationPlan) => void;
  onInsertAiCell: (title: string, code: string) => void;
}

export const AiByokModal: React.FC<AiByokModalProps> = ({
  isOpen,
  onClose,
  dataProfile,
  config,
  experiments,
  lastErrorText,
  onApplyAiOptimization,
  onInsertAiCell,
}) => {
  const stored = getStoredAiSettings();
  const [provider, setProvider] = useState<AiProvider>(stored.provider);
  const [apiKey, setApiKey] = useState<string>(stored.apiKey);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    saveAiSettings(provider, apiKey);
    setStatusMsg('Đã lưu API Key cục bộ trên trình duyệt (LocalStorage).');
    setErrorMsg(null);
  };

  const handleAutoOptimize = async () => {
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    saveAiSettings(provider, apiKey);
    try {
      const plan = await askAiToOptimizePipeline(
        provider,
        apiKey,
        dataProfile,
        config,
        experiments,
        customPrompt || 'Tối ưu toàn bộ tham số và tiền xử lý để đạt điểm CV cao nhất.'
      );
      onApplyAiOptimization(plan);
      setStatusMsg(`AI đã tối ưu cấu hình [Auto]: ${plan.explanation}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCell = async (presetPrompt?: string) => {
    const promptToSend = (presetPrompt || customPrompt).trim();
    if (!promptToSend) {
      setErrorMsg('Hãy nhập yêu cầu hoặc chọn 1 nút gợi ý bên dưới.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    saveAiSettings(provider, apiKey);
    try {
      const res = await askAiToGenerateCode(
        provider,
        apiKey,
        dataProfile,
        config,
        experiments,
        promptToSend,
        lastErrorText
      );
      onInsertAiCell(res.title, res.code);
      setStatusMsg(`Đã chèn cell "${res.title}": ${res.explanation}`);
      setCustomPrompt('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded border border-[#3c4043] bg-[#202124] text-[#e8eaed] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#252629] border-b border-[#3c4043] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              AMLICS Plugin AI (Multi-Key BYOK)
            </h2>
            <p className="text-[11px] text-[#9aa0a6]">
              Cắm API Key từ nhiều AI khác nhau (Gemini / OpenAI) lưu trên trình duyệt • Chỉ gửi tên cột &amp; thống kê schema, không gửi dữ liệu thô.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-[#e8eaed]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs">
          {/* Step 1: API Key Config */}
          <div className="p-3 rounded bg-[#18191a] border border-[#3c4043] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#e8eaed]">
                1. Kết nối API Key (Chạy trực tiếp từ trình duyệt)
              </span>
              <span className="text-[10px] font-mono text-[#81c995]">
                Gemini AI Studio miễn phí
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AiProvider)}
                className="bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs font-mono"
              >
                <option value="gemini">Google Gemini (2.5 Flash)</option>
                <option value="openai">OpenAI (GPT-4o-mini)</option>
              </select>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  provider === 'gemini'
                    ? 'Dán Gemini API Key (AIza...)'
                    : 'Dán OpenAI API Key (sk-...)'
                }
                className="flex-1 bg-[#202124] border border-[#3c4043] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#8ab4f8]"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-3 py-1.5 rounded bg-[#303134] hover:bg-[#3c4043] text-xs font-medium"
              >
                Lưu Key
              </button>
            </div>
          </div>

          {/* Step 2: 1-Click Actions */}
          <div className="space-y-2">
            <span className="font-medium text-[#e8eaed] block">
              2. Thao tác nhanh theo dữ liệu{' '}
              <code className="text-[#8ab4f8]">
                {dataProfile?.dataset_name || 'hiện tại'}
              </code>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={handleAutoOptimize}
                className="p-2.5 rounded border border-[#8ab4f8]/50 bg-[#292a2d] hover:bg-[#303134] text-left space-y-0.5 disabled:opacity-50"
              >
                <div className="font-mono text-[#8ab4f8] font-medium">
                  AI Auto-Optimize (Điểm cao nhất)
                </div>
                <div className="text-[11px] text-[#9aa0a6]">
                  Tự chọn Imputer, Scaler, Encoder, Model &amp; Hyperparameters tối ưu và gắn nhãn [Auto].
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  handleGenerateCell(
                    'Viết code tạo thêm các Feature mới hữu ích (Feature Engineering) dựa trên các cột hiện có của df và hiển thị 5 dòng đầu.'
                  )
                }
                className="p-2.5 rounded border border-[#3c4043] bg-[#292a2d] hover:bg-[#303134] text-left space-y-0.5 disabled:opacity-50"
              >
                <div className="font-mono text-[#81c995] font-medium">
                  + Sinh Cell Feature Engineering
                </div>
                <div className="text-[11px] text-[#9aa0a6]">
                  AI tự viết code tạo đặc trưng mới theo đúng tên cột của file CSV bạn tải lên.
                </div>
              </button>

              {lastErrorText && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    handleGenerateCell(
                      'Hãy chẩn đoán và viết lại đoạn code Python sửa triệt để lỗi gần nhất ở trên.'
                    )
                  }
                  className="sm:col-span-2 p-2.5 rounded border border-[#f28b82]/50 bg-[#3c1f1f]/40 hover:bg-[#3c1f1f]/70 text-left space-y-0.5 disabled:opacity-50"
                >
                  <div className="font-mono text-[#f28b82] font-medium">
                    AI Chẩn đoán &amp; Sửa lỗi Cell vừa gặp
                  </div>
                  <div className="text-[11px] text-[#e8eaed]/80 truncate">
                    {lastErrorText.split('\n').slice(-2).join(' ')}
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Step 3: Custom Prompt */}
          <div className="space-y-1.5">
            <label className="font-medium text-[#e8eaed] block">
              3. Hoặc yêu cầu AI viết cell phân tích / biểu đồ riêng:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleGenerateCell();
                  }
                }}
                placeholder="VD: Vẽ biểu đồ phân tích tỷ lệ sống sót theo độ tuổi và giới tính..."
                className="flex-1 bg-[#18191a] border border-[#3c4043] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#8ab4f8]"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGenerateCell()}
                className="px-3 py-1.5 rounded bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] font-medium disabled:opacity-50 shrink-0"
              >
                {loading ? 'Đang xử lý...' : 'Tạo Cell'}
              </button>
            </div>
          </div>

          {statusMsg && (
            <div className="p-2.5 rounded bg-[#1b2d22] border border-[#81c995]/40 text-[#81c995] text-[11px]">
              {statusMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded bg-[#3c1f1f] border border-[#f28b82]/40 text-[#f28b82] text-[11px]">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
