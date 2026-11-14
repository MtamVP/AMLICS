import React, { useState } from 'react';
import { X } from 'lucide-react';
import { generateOneClickColabScript } from '../engine/supabaseCloudClient';
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
}) => {
  const [urlInput, setUrlInput] = useState(credentials.url);
  const [keyInput, setKeyInput] = useState(credentials.anonKey);
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

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
