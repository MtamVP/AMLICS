import React, { useEffect, useState } from 'react';
import { Cloud, Copy, Download, RefreshCw, Upload, X } from 'lucide-react';
import { generateOneClickColabScript } from '../engine/supabaseCloudClient';
import { SYNC_MIGRATION_SQL } from '../engine/supabaseSyncService';
import { HardwareInfo, SupabaseCredentials, WorkerStatus } from '../types/studio';
import { downloadCloudRunnerIpynb } from '../utils/ipynbExporter';

interface CloudConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onRegenerateSession: () => void;
  credentials: SupabaseCredentials;
  onSaveCredentials: (creds: SupabaseCredentials) => void;
  cloudConnected: boolean;
  workerStatus: WorkerStatus;
  hardwareInfo: HardwareInfo | null;
  onPingWorker: () => void;
  syncKey: string;
  onChangeSyncKey: (nextKey: string) => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncMessage: string | null;
  syncNeedsSchema: boolean;
  onPushAllToCloud: () => void;
  onPullAllFromCloud: () => void;
}

export const CloudConnectModal: React.FC<CloudConnectModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  onRegenerateSession,
  credentials,
  onSaveCredentials,
  cloudConnected,
  workerStatus,
  hardwareInfo,
  onPingWorker,
  syncKey,
  onChangeSyncKey,
  syncStatus,
  syncMessage,
  syncNeedsSchema,
  onPushAllToCloud,
  onPullAllFromCloud,
}) => {
  const [urlInput, setUrlInput] = useState(credentials.url);
  const [keyInput, setKeyInput] = useState(credentials.anonKey);
  const [syncKeyDraft, setSyncKeyDraft] = useState(syncKey);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSyncKeyDraft(syncKey);
      setUrlInput(credentials.url);
      setKeyInput(credentials.anonKey);
    }
  }, [isOpen, syncKey, credentials.url, credentials.anonKey]);

  if (!isOpen) return null;

  const oneClickScript = generateOneClickColabScript(sessionId, urlInput, keyInput);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCredentials({ url: urlInput, anonKey: keyInput });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(oneClickScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#202124] border border-[#3c4043] rounded shadow-xl overflow-hidden flex flex-col max-h-[88vh] text-[#e8eaed]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#292a2d] border-b border-[#3c4043] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold">
              Connect Remote Runtime (Google Colab / Kaggle)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#3c4043]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs custom-scrollbar">
          {/* Cross-Device Supabase Full Persistence Section */}
          <div className="p-3 rounded-lg bg-[#18191a] border border-[#8ab4f8]/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#8ab4f8]" />
                <span className="font-semibold text-[#e8eaed]">
                  Đồng bộ Toàn bộ Web lên Supabase (Đa máy)
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  syncStatus === 'synced'
                    ? 'bg-[#81c995]/15 border-[#81c995]/40 text-[#81c995]'
                    : syncStatus === 'syncing'
                    ? 'bg-[#fdd663]/15 border-[#fdd663]/40 text-[#fdd663]'
                    : syncStatus === 'error'
                    ? 'bg-[#f28b82]/15 border-[#f28b82]/40 text-[#f28b82]'
                    : 'bg-[#303134] border-[#3c4043] text-[#9aa0a6]'
                }`}
              >
                {syncStatus === 'synced'
                  ? 'Đã đồng bộ Supabase'
                  : syncStatus === 'syncing'
                  ? 'Đang đồng bộ...'
                  : syncStatus === 'error'
                  ? 'Cần kiểm tra DB'
                  : 'Sẵn sàng'}
              </span>
            </div>

            <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
              Lưu toàn bộ <b>Notebooks, Code/Markdown Cells, Cấu hình Pipeline, DataProfile, CSV (≤15MB), Leaderboard &amp; Kho API Key AI</b> lên Supabase. Nhập cùng <b>Mã đồng bộ (Sync Key)</b> trên máy khác để lấy toàn bộ dữ liệu về ngay.
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="text"
                value={syncKeyDraft}
                onChange={(e) => setSyncKeyDraft(e.target.value)}
                placeholder="VD: amlics-main-studio hoặc mã riêng của bạn"
                className="flex-1 min-w-[180px] bg-[#202124] border border-[#3c4043] rounded px-2.5 py-1.5 text-xs font-mono text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
              />
              <button
                type="button"
                onClick={() => onChangeSyncKey(syncKeyDraft)}
                className="px-2.5 py-1.5 rounded bg-[#303134] hover:bg-[#3c4043] border border-[#3c4043] text-[#e8eaed] text-[11px] font-medium"
              >
                Áp dụng Mã
              </button>
              <button
                type="button"
                onClick={onPushAllToCloud}
                disabled={syncStatus === 'syncing'}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#18191a] text-[11px] font-semibold disabled:opacity-50"
                title="Đẩy toàn bộ Notebooks & Cài đặt hiện tại lên Supabase"
              >
                <Upload className="w-3 h-3" />
                <span>Đẩy lên</span>
              </button>
              <button
                type="button"
                onClick={onPullAllFromCloud}
                disabled={syncStatus === 'syncing'}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043] text-[#81c995] text-[11px] font-medium disabled:opacity-50"
                title="Tải toàn bộ Notebooks & Cài đặt từ Supabase về máy này"
              >
                <Download className="w-3 h-3" />
                <span>Tải về</span>
              </button>
            </div>

            {syncMessage && (
              <div className="text-[11px] font-mono text-[#bdc1c6] bg-[#202124] border border-[#3c4043] rounded px-2.5 py-1.5">
                {syncMessage}
              </div>
            )}

            {syncNeedsSchema && (
              <div className="p-2.5 rounded bg-[#2d261b] border border-[#fdd663]/40 space-y-2 text-[11px]">
                <div className="text-[#fdd663] font-medium">
                  Supabase của bạn chưa có 2 bảng đồng bộ (<code>amlics_notebooks</code> &amp; <code>amlics_user_settings</code>).
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SYNC_MIGRATION_SQL);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#fdd663] text-[#18191a] font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSql ? 'Đã copy SQL!' : 'Copy SQL tạo bảng (Chạy trong Supabase SQL Editor)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onPushAllToCloud}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#303134] text-[#e8eaed]"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Thử lại</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Row */}
          <div className="p-3 rounded bg-[#18191a] border border-[#3c4043] flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    workerStatus === 'idle'
                      ? 'bg-[#81c995]'
                      : workerStatus === 'busy'
                      ? 'bg-[#fdd663]'
                      : 'bg-[#5f6368]'
                  }`}
                />
                <span className="font-medium">
                  Worker: {workerStatus !== 'offline' ? 'Connected' : 'Disconnected'}
                </span>
                {hardwareInfo && (
                  <span className="text-[#9aa0a6] font-mono">
                    ({hardwareInfo.platform} • {hardwareInfo.gpu} • {hardwareInfo.ram_used_gb}/
                    {hardwareInfo.ram_total_gb} GB)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9aa0a6] font-mono">
                Session ID: {sessionId}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPingWorker}
                className="px-2.5 py-1 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043]"
              >
                Ping
              </button>
              <button
                type="button"
                onClick={onRegenerateSession}
                className="px-2.5 py-1 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043]"
              >
                New Session
              </button>
            </div>
          </div>

          {/* Step 1: Runner Code */}
          <div className="space-y-2 p-3 rounded bg-[#18191a] border border-[#3c4043]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                1. Paste and run this cell in Google Colab or Kaggle
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-2.5 py-1 rounded font-medium bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                >
                  {copiedCode ? 'Copied' : 'Copy code'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadCloudRunnerIpynb(sessionId, urlInput, keyInput)}
                  className="px-2.5 py-1 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043]"
                >
                  Download .ipynb
                </button>
              </div>
            </div>

            <pre className="p-2.5 rounded bg-[#202124] border border-[#3c4043] text-[11px] font-mono text-[#9aa0a6] max-h-44 overflow-y-auto select-all">
              {oneClickScript}
            </pre>

            <div className="flex items-center gap-3 pt-1 text-[11px]">
              <a
                href="https://colab.research.google.com/#create=true"
                target="_blank"
                rel="noreferrer"
                className="text-[#8ab4f8] hover:underline"
              >
                Open Google Colab ↗
              </a>
              <a
                href="https://www.kaggle.com/code"
                target="_blank"
                rel="noreferrer"
                className="text-[#8ab4f8] hover:underline"
              >
                Open Kaggle Notebooks ↗
              </a>
            </div>

            <div className="mt-2 p-2.5 rounded bg-[#202124] border border-[#3c4043] text-[11px] text-[#9aa0a6] space-y-1">
              <div className="font-medium text-[#e8eaed]">Cách hoạt động & Lưu ý quan trọng (Colab / Kaggle):</div>
              <div>• <span className="text-[#e8eaed]">Chạy ngầm không khóa Colab:</span> Cell kết nối sẽ tự chạy ngầm trên background thread và hoàn tất sau ~2–5 giây — bạn vẫn có thể tạo & chạy cell mới ngay trên Colab dùng chung biến với AMLICS Web Studio.</div>
              <div>• <span className="text-[#e8eaed]">Đồng bộ 2 chiều qua Web Studio:</span> Mọi nút <b>Run / Run all</b>, vẽ biểu đồ, Leaderboard và bài học <b>Học ML</b> trên web AMLICS sẽ gửi code sang Colab thực thi và trả kết quả về lại giao diện AMLICS (Colab không tự chèn thêm cell mới vào file .ipynb của bạn).</div>
              <div>• <span className="text-[#e8eaed]">Kaggle:</span> Bắt buộc bật <span className="text-[#fdd663]">Internet ON</span> ở thanh Settings bên phải Notebook để Worker cài thư viện và kết nối WebSocket. Dữ liệu cuộc thi tự động nhận ở <code className="text-[#8ab4f8]">/kaggle/input/...</code>.</div>
              <div>• <span className="text-[#e8eaed]">Google Colab:</span> Để đọc file Drive cá nhân (Private), mount Drive bằng <code className="text-[#8ab4f8]">drive.mount('/content/drive')</code> ở cell bất kỳ trên Colab.</div>
              <div>• <span className="text-[#e8eaed]">Import bằng URL:</span> Chỉ hỗ trợ link <b>Public</b> (Google Drive phải bật <i>"Anyone with the link"</i>). Link Private sẽ bị chặn 403.</div>
            </div>
          </div>

          {/* Step 2: Supabase Endpoint */}
          <form
            onSubmit={handleSave}
            className="space-y-2.5 p-3 rounded bg-[#18191a] border border-[#3c4043]"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">2. Supabase Realtime Broker</span>
              <span className="text-[11px] font-mono text-[#9aa0a6]">
                {cloudConnected ? 'Subscribed' : 'Not connected'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-[#9aa0a6] block mb-1">
                  Project URL
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-[#202124] border border-[#3c4043] rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#8ab4f8]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#9aa0a6] block mb-1">
                  Anon Public Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-[#202124] border border-[#3c4043] rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#8ab4f8]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3 py-1 rounded bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043]"
              >
                {savedNotice ? 'Saved' : 'Save broker config'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
