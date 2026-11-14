import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { LeftPipelineSidebar } from './components/LeftPipelineSidebar';
import { CenterNotebookPane } from './components/CenterNotebookPane';
import { RightStudioPane } from './components/RightStudioPane';
import { CloudConnectModal } from './components/CloudConnectModal';
import {
  createDefaultPipelineConfig,
  SAMPLE_DATASETS,
} from './data/sampleDatasets';
import { buildAllPipelineCells } from './engine/codeGenerator';
import {
  getOrInitSessionId,
  getStoredSupabaseCredentials,
  regenerateSessionId,
  saveSupabaseCredentials,
  SupabaseCloudBroker,
} from './engine/supabaseCloudClient';
import {
  CliLogEntry,
  DataProfile,
  ExperimentRecord,
  HardwareInfo,
  NotebookCell,
  PipelineConfig,
  RuntimeMode,
  SupabaseCredentials,
  WorkerStatus,
} from './types/studio';
import { exportPipelineToIpynb } from './utils/ipynbExporter';

const EXP_STORAGE_KEY = 'automl_studio_experiments_v1';

export function App() {
  const [projectName, setProjectName] = useState<string>('AMLICS_Telco_Churn_Pipeline');
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('pyodide');

  // Cấu hình Pipeline & Data Profile
  const [config, setConfig] = useState<PipelineConfig>(() =>
    createDefaultPipelineConfig('telco_churn')
  );
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(
    () => SAMPLE_DATASETS[0].initialProfile
  );

  // Danh sách các Cell trên Monaco Notebook
  const [cells, setCells] = useState<NotebookCell[]>(() =>
    buildAllPipelineCells(createDefaultPipelineConfig('telco_churn'))
  );

  // Trạng thái thực thi
  const [runningCellId, setRunningCellId] = useState<string | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState<boolean>(false);

  // Trạng thái Tier 1: Pyodide Web Worker
  const [pyodideStatus, setPyodideStatus] = useState<WorkerStatus>('initializing');
  const [pyodideStatusText, setPyodideStatusText] = useState<string>(
    'Đang khởi tạo Pyodide Wasm...'
  );

  // Trạng thái Tier 2: Cloud Runtime (Colab / Kaggle qua Supabase)
  const [sessionId, setSessionId] = useState<string>(() => getOrInitSessionId());
  const [supabaseCreds, setSupabaseCreds] = useState<SupabaseCredentials>(() =>
    getStoredSupabaseCredentials()
  );
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [cloudWorkerStatus, setCloudWorkerStatus] = useState<WorkerStatus>('offline');
  const [cloudHardware, setCloudHardware] = useState<HardwareInfo | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);

  // Experiment Leaderboard & Logs
  const [experiments, setExperiments] = useState<ExperimentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(EXP_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [cliLogs, setCliLogs] = useState<CliLogEntry[]>([]);
  const [namespaceVars, setNamespaceVars] = useState<string[]>([
    'pd',
    'np',
    'plt',
  ]);

  // Refs cho Worker, Supabase Broker & Promise đợi kết quả Cell
  const pyodideWorkerRef = useRef<Worker | null>(null);
  const cloudBrokerRef = useRef<SupabaseCloudBroker | null>(null);
  const pendingCellResolverRef = useRef<((success: boolean) => void) | null>(null);
  const stopRequestedRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const configRef = useRef(config);
  configRef.current = config;
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const runtimeModeRef = useRef(runtimeMode);
  runtimeModeRef.current = runtimeMode;
  const cloudHardwareRef = useRef(cloudHardware);
  cloudHardwareRef.current = cloudHardware;

  const appendCliLog = useCallback(
    (stream: CliLogEntry['stream'], text: string, cellId?: string) => {
      const clean = text.replace(/\n$/, '');
      if (!clean) return;
      const now = new Date();
      const ts = now.toTimeString().split(' ')[0];
      setCliLogs((prev) => [
        ...prev.slice(-180),
        {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: ts,
          stream,
          text: clean,
          cellId,
        },
      ]);
    },
    []
  );

  // Lưu lịch sử Experiments xuống localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(experiments));
    } catch {
      // ignore quota errors
    }
  }, [experiments]);

  // Tự động đồng bộ UI Config -> Code cho các Cell chưa bị khóa (isLocked === false)
  useEffect(() => {
    setCells((prevCells) => buildAllPipelineCells(config, prevCells));
  }, [config]);

  // Tự động cập nhật danh sách cột trên UI khi nhận được gói DataProfile mới
  const syncColumnsFromProfile = useCallback((profile: DataProfile) => {
    setDataProfile(profile);
    setConfig((prev) => {
      const allColNames = profile.columns.map((c) => c.name);
      // Nếu target hiện tại vẫn nằm trong bảng dữ liệu và các cột đã khớp thì giữ nguyên
      if (
        allColNames.includes(prev.targetColumn) &&
        prev.numericColumns.some((c) => allColNames.includes(c))
      ) {
        return prev;
      }

      // Ngược lại (ví dụ vừa Upload file CSV mới), tự động chọn cột cuối làm Target
      const targetCand =
        profile.columns[profile.columns.length - 1]?.name || prev.targetColumn;
      const targetMeta = profile.columns.find((c) => c.name === targetCand);
      const inferredTask =
        targetMeta && targetMeta.nunique <= 10 ? 'classification' : 'regression';

      const dropCols = profile.columns
        .filter((c) => c.name !== targetCand && c.inferred_type === 'text_or_id')
        .map((c) => c.name);

      const numCols = profile.columns
        .filter(
          (c) =>
            c.name !== targetCand &&
            !dropCols.includes(c.name) &&
            (c.inferred_type === 'numeric' || c.inferred_type === 'binary')
        )
        .map((c) => c.name);

      const catCols = profile.columns
        .filter(
          (c) =>
            c.name !== targetCand &&
            !dropCols.includes(c.name) &&
            c.inferred_type === 'categorical'
        )
        .map((c) => c.name);

      return {
        ...prev,
        targetColumn: targetCand,
        taskType: inferredTask,
        dropColumns: dropCols,
        numericColumns: numCols,
        categoricalColumns: catCols,
      };
    });
  }, []);

  // Xử lý khi 1 Cell hoàn tất thực thi (từ cả Pyodide Wasm hoặc Cloud Worker)
  const handleIncomingCellResult = useCallback(
    (payload: {
      cell_id: string;
      status: 'success' | 'error' | 'stopped';
      duration_ms: number;
      stdout_summary?: string;
      figures_base64?: string[];
      experiment_record?: Record<string, unknown> | null;
      namespace_vars?: string[];
      runtime_info?: HardwareInfo;
    }) => {
      const {
        cell_id,
        status,
        duration_ms,
        stdout_summary,
        figures_base64,
        experiment_record,
        namespace_vars,
        runtime_info,
      } = payload;

      if (namespace_vars && namespace_vars.length > 0) {
        setNamespaceVars(namespace_vars);
      }
      if (runtime_info) {
        setCloudHardware(runtime_info);
      }

      setCells((prev) =>
        prev.map((c) => {
          if (c.id !== cell_id) return c;
          return {
            ...c,
            status,
            durationMs: duration_ms,
            outputText: stdout_summary ? stdout_summary : c.outputText,
            figures:
              figures_base64 && figures_base64.length > 0
                ? figures_base64
                : c.figures,
          };
        })
      );

      // Nếu Cell trả về gói kết quả thực nghiệm (_automl_experiment_result) -> Đẩy vào Leaderboard!
      if (experiment_record && status === 'success') {
        const curConfig = configRef.current;
        const curCells = cellsRef.current;
        const isCloud = runtimeModeRef.current === 'cloud';
        const hw = cloudHardwareRef.current;

        setExperiments((prevExps) => {
          const nextRunNum =
            prevExps.length > 0
              ? Math.max(...prevExps.map((e) => e.runNumber)) + 1
              : 1;

          const newExp: ExperimentRecord = {
            id: `exp_${Date.now()}`,
            runNumber: nextRunNum,
            timestamp: new Date().toLocaleTimeString(),
            modelName: String(
              experiment_record.model_name || curConfig.modelFamily
            ),
            modelFamily: curConfig.modelFamily,
            taskType:
              (experiment_record.task_type as ExperimentRecord['taskType']) ||
              curConfig.taskType,
            runtimeUsed: isCloud
              ? `${hw?.platform || 'Cloud'} (${hw?.gpu || 'CPU'})`
              : 'Browser Wasm (Pyodide)',
            hyperparameters: { ...curConfig.hyperparameters },
            preprocessingSummary: {
              numericImputer: curConfig.numericImputer,
              numericScaler: curConfig.numericScaler,
              categoricalEncoder: curConfig.categoricalEncoder,
              imbalanceStrategy: curConfig.imbalanceStrategy,
              cvFolds: curConfig.cvFolds,
              featureCount:
                curConfig.numericColumns.length +
                curConfig.categoricalColumns.length,
            },
            metrics: (experiment_record.metrics || {}) as ExperimentRecord['metrics'],
            featureImportance: (experiment_record.feature_importance ||
              []) as ExperimentRecord['featureImportance'],
            rocCurve: (experiment_record.roc_curve ||
              undefined) as ExperimentRecord['rocCurve'],
            confusionMatrix: (experiment_record.confusion_matrix ||
              undefined) as ExperimentRecord['confusionMatrix'],
            figures: figures_base64 || [],
            durationMs: duration_ms,
            codeSnapshot: curCells.map((c) => ({
              title: c.title,
              code: c.currentCode,
            })),
            configSnapshot: JSON.parse(JSON.stringify(curConfig)),
          };

          setSelectedExpId(newExp.id);
          cloudBrokerRef.current?.persistExperimentToDb(newExp);
          appendCliLog(
            'system',
            `🏆 Đã ghi nhận Run #${nextRunNum} (${newExp.modelName}) vào Experiment Leaderboard!`
          );
          return [newExp, ...prevExps];
        });
      }

      setRunningCellId(null);
      if (pendingCellResolverRef.current) {
        const resolve = pendingCellResolverRef.current;
        pendingCellResolverRef.current = null;
        resolve(status === 'success');
      }
    },
    [appendCliLog]
  );

  // Khởi tạo Pyodide Web Worker (Tier 1)
  const initPyodideWorker = useCallback(() => {
    if (pyodideWorkerRef.current) {
      pyodideWorkerRef.current.terminate();
    }
    const worker = new Worker(
      new URL('./engine/pyodideWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent) => {
      const { type, status, message, cellId, stream, text, dataProfile: prof, payload, filename } =
        event.data;

      if (type === 'status') {
        setPyodideStatus(status);
        if (message) setPyodideStatusText(message);
      } else if (type === 'log_chunk') {
        appendCliLog(stream || 'stdout', text, cellId);
        if (cellId) {
          setCells((prev) =>
            prev.map((c) =>
              c.id === cellId ? { ...c, outputText: c.outputText + text } : c
            )
          );
        }
      } else if (type === 'data_profile' && prof) {
        syncColumnsFromProfile(prof);
        appendCliLog(
          'system',
          `📊 Đã đồng bộ Data Profile: ${prof.dataset_name} (${prof.shape[0]} dòng × ${prof.shape[1]} cột)`
        );
      } else if (type === 'csv_uploaded' && prof) {
        syncColumnsFromProfile(prof);
        appendCliLog(
          'system',
          `✅ Đã nạp CSV "${filename}" (${prof.shape[0]} dòng × ${prof.shape[1]} cột) và tự động cấu hình cột!`
        );
      } else if (type === 'cell_result' && payload) {
        handleIncomingCellResult(payload);
      }
    };

    worker.postMessage({ type: 'init' });
    pyodideWorkerRef.current = worker;
  }, [appendCliLog, handleIncomingCellResult, syncColumnsFromProfile]);

  useEffect(() => {
    initPyodideWorker();
    return () => {
      pyodideWorkerRef.current?.terminate();
    };
  }, [initPyodideWorker]);

  // Khởi tạo Supabase Cloud Broker (Tier 2)
  useEffect(() => {
    const broker = new SupabaseCloudBroker(sessionId, supabaseCreds, {
      onLogChunk: ({ cell_id, stream, text }) => {
        appendCliLog(stream, text, cell_id);
        setCells((prev) =>
          prev.map((c) =>
            (cell_id && c.id === cell_id) || c.status === 'running'
              ? { ...c, outputText: c.outputText + text }
              : c
          )
        );
      },
      onCellResult: (payload) => {
        setCloudWorkerStatus('idle');
        handleIncomingCellResult(payload);
      },
      onDataProfile: (prof) => {
        syncColumnsFromProfile(prof);
        appendCliLog(
          'system',
          `☁️ [Cloud Sync] Đã nhận Data Profile từ Colab/Kaggle: ${prof.dataset_name} (${prof.shape[0]}×${prof.shape[1]})`
        );
      },
      onHeartbeat: (hb) => {
        setCloudWorkerStatus(hb.status === 'busy' ? 'busy' : 'idle');
        setCloudHardware(hb.runtime_info);
        if (hb.namespace_vars) setNamespaceVars(hb.namespace_vars);
      },
      onChannelStatus: (connected, msg) => {
        setCloudConnected(connected);
        appendCliLog('system', `🔗 [Supabase Realtime] ${msg}`);
      },
    });

    if (broker.isConfigured()) {
      broker.connect();
    }
    cloudBrokerRef.current = broker;

    return () => {
      broker.disconnect();
    };
  }, [sessionId, supabaseCreds, appendCliLog, handleIncomingCellResult, syncColumnsFromProfile]);

  // Thực thi 1 Cell đơn lẻ (trả về Promise<boolean>)
  const executeSingleCell = useCallback(
    (cellId: string): Promise<boolean> => {
      const targetCell = cellsRef.current.find((c) => c.id === cellId);
      if (!targetCell) return Promise.resolve(false);

      setRunningCellId(cellId);
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? { ...c, status: 'running', outputText: '', figures: [] }
            : c
        )
      );

      const executionId = `exec_${Date.now()}`;

      return new Promise<boolean>((resolve) => {
        pendingCellResolverRef.current = resolve;

        if (runtimeModeRef.current === 'cloud') {
          if (!cloudBrokerRef.current || !cloudConnected) {
            appendCliLog(
              'stderr',
              '⚠️ Chưa kết nối Cloud Runtime (Colab/Kaggle). Mở cửa sổ Connect Cloud để lấy mã 1-Click!'
            );
            setIsCloudModalOpen(true);
            setRunningCellId(null);
            pendingCellResolverRef.current = null;
            setCells((prev) =>
              prev.map((c) => (c.id === cellId ? { ...c, status: 'error' } : c))
            );
            resolve(false);
            return;
          }
          setCloudWorkerStatus('busy');
          cloudBrokerRef.current
            .sendRunCell(targetCell)
            .catch((err) => {
              appendCliLog('stderr', `Lỗi gửi lệnh Cloud: ${String(err)}`);
              setRunningCellId(null);
              pendingCellResolverRef.current = null;
              resolve(false);
            });
        } else {
          // Chạy trên Tier 1: Pyodide Browser Wasm
          pyodideWorkerRef.current?.postMessage({
            type: 'run_cell',
            payload: {
              cellId: targetCell.id,
              executionId,
              code: targetCell.currentCode,
            },
          });
        }
      });
    },
    [appendCliLog, cloudConnected]
  );

  // Chạy toàn bộ các Cell tuần tự từ trên xuống dưới (Run Full Pipeline)
  const handleRunAllCells = useCallback(async () => {
    if (runningCellId) return;
    stopRequestedRef.current = false;
    setIsPipelineRunning(true);
    appendCliLog(
      'system',
      `🚀 Bắt đầu chạy toàn bộ Pipeline (${cellsRef.current.length} Cells) trên [${
        runtimeMode === 'cloud' ? 'Tier 2: Cloud Runtime' : 'Tier 1: Browser Wasm'
      }]...`
    );

    for (const cell of cellsRef.current) {
      if (stopRequestedRef.current) break;
      const ok = await executeSingleCell(cell.id);
      if (!ok || stopRequestedRef.current) {
        break;
      }
    }

    setIsPipelineRunning(false);
    cloudBrokerRef.current?.persistStateToDb(
      configRef.current,
      cellsRef.current,
      dataProfile
    );
  }, [runningCellId, runtimeMode, appendCliLog, executeSingleCell, dataProfile]);

  // Dừng thực thi khẩn cấp (Stop / Interrupt)
  const handleStopExecution = useCallback(() => {
    stopRequestedRef.current = true;
    setIsPipelineRunning(false);

    if (runtimeMode === 'cloud') {
      cloudBrokerRef.current?.sendStopCell();
      appendCliLog('system', '⏹ Đã gửi tín hiệu Interrupt (Stop Cell) tới Cloud Worker...');
    } else {
      appendCliLog(
        'system',
        '⏹ Đã dừng thực thi Cell trên Browser Wasm và khởi động lại Kernel sạch...'
      );
      initPyodideWorker();
      if (runningCellId) {
        setCells((prev) =>
          prev.map((c) =>
            c.id === runningCellId
              ? {
                  ...c,
                  status: 'stopped',
                  outputText: c.outputText + '\n[Stopped by user]',
                }
              : c
          )
        );
      }
      setRunningCellId(null);
      if (pendingCellResolverRef.current) {
        pendingCellResolverRef.current(false);
        pendingCellResolverRef.current = null;
      }
    }
  }, [runtimeMode, runningCellId, appendCliLog, initPyodideWorker]);

  // Khi người dùng tự gõ sửa code trong Monaco Editor -> Tự động khóa Cell (Custom Locked)
  const handleEditCellCode = (cellId: string, newCode: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? {
              ...c,
              currentCode: newCode,
              isLocked: true, // Tự động bật cờ Custom Locked để bảo vệ code sửa tay
            }
          : c
      )
    );
  };

  const handleToggleLockCell = (cellId: string) => {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, isLocked: !c.isLocked } : c))
    );
  };

  const handleResetCellToTemplate = (cellId: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? {
              ...c,
              currentCode: c.generatedCode,
              isLocked: false,
            }
          : c
      )
    );
    appendCliLog(
      'system',
      `↺ Đã khôi phục Cell [${cellId}] về mẫu chuẩn Anti-Leakage UI và mở khóa đồng bộ.`
    );
  };

  const handleAddCustomCell = () => {
    const nextOrder = cells.length + 1;
    const newCell: NotebookCell = {
      id: `cell_custom_${Date.now()}`,
      order: nextOrder,
      stepType: 'custom',
      title: `0${nextOrder}. Custom Exploration / Tuning Cell`,
      subtitle: 'Cell tùy chỉnh dùng chung bộ nhớ biến (df, X_train, full_pipeline)',
      generatedCode: '',
      currentCode: `# Thử nghiệm code tùy chỉnh của bạn (truy cập trực tiếp df, X_train, full_pipeline)\nprint("Các biến đang có trong Kernel:", [k for k in globals().keys() if not k.startswith('_')])\ndf.head(3)`,
      isLocked: true,
      status: 'idle',
      outputText: '',
      figures: [],
    };
    setCells((prev) => [...prev, newCell]);
  };

  const handleDeleteCustomCell = (cellId: string) => {
    setCells((prev) => prev.filter((c) => c.id !== cellId));
  };

  // Chọn bộ dữ liệu mẫu có sẵn
  const handleSelectSampleDataset = (sampleId: string) => {
    const sample =
      SAMPLE_DATASETS.find((s) => s.id === sampleId) || SAMPLE_DATASETS[0];
    const nextCfg = createDefaultPipelineConfig(sample.id);
    setDataProfile(sample.initialProfile);
    setConfig(nextCfg);
    appendCliLog(
      'system',
      `📂 Đã chuyển sang bộ dữ liệu mẫu: ${sample.name} (${sample.rowsCount} dòng)`
    );
  };

  // Xử lý Upload file CSV từ máy tính
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const textContent = await file.text();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    // 1. Nạp vào Pyodide Virtual FS để chạy được ngay trên trình duyệt
    pyodideWorkerRef.current?.postMessage({
      type: 'write_csv',
      payload: {
        filename: safeFilename,
        content: textContent,
      },
    });

    // 2. Nếu đã kết nối Supabase, đồng bộ luôn lên Supabase Storage cho Colab/Kaggle
    let publicUrl: string | null = null;
    if (cloudBrokerRef.current?.isConfigured()) {
      publicUrl = await cloudBrokerRef.current.uploadCsvToStorage(file);
    }

    setConfig((prev) => ({
      ...prev,
      datasetSource: publicUrl && runtimeMode === 'cloud' ? 'cloud_url' : 'upload',
      uploadedFileName: safeFilename,
      cloudDatasetUrl: publicUrl || prev.cloudDatasetUrl,
    }));

    e.target.value = '';
  };

  // Khôi phục lại cấu hình từ 1 lần chạy trong Experiment Leaderboard
  const handleRestoreExperiment = (exp: ExperimentRecord) => {
    setConfig(JSON.parse(JSON.stringify(exp.configSnapshot)));
    appendCliLog(
      'system',
      `⏪ Đã khôi phục cấu hình Pipeline & Hyperparameters từ Run #${exp.runNumber} (${exp.modelName})!`
    );
  };

  // Chạy lệnh Python nhanh từ thanh REPL ở góc dưới phải
  const handleRunQuickCommand = (cmd: string) => {
    appendCliLog('system', `>>> ${cmd}`);
    if (runtimeMode === 'cloud' && cloudBrokerRef.current && cloudConnected) {
      cloudBrokerRef.current.sendRunCell({
        id: 'quick_repl',
        order: 99,
        stepType: 'custom',
        title: 'Quick REPL',
        subtitle: '',
        generatedCode: cmd,
        currentCode: cmd,
        isLocked: true,
        status: 'running',
        outputText: '',
        figures: [],
      });
    } else {
      pyodideWorkerRef.current?.postMessage({
        type: 'run_cell',
        payload: {
          cellId: 'quick_repl',
          executionId: `repl_${Date.now()}`,
          code: cmd,
        },
      });
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Hidden File Input for CSV Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleCsvFileChange}
        className="hidden"
      />

      {/* Top Navigation & Runtime Switcher */}
      <TopNavbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        runtimeMode={runtimeMode}
        onRuntimeModeChange={setRuntimeMode}
        pyodideStatus={pyodideStatus}
        pyodideStatusText={pyodideStatusText}
        cloudConnected={cloudConnected}
        cloudWorkerStatus={cloudWorkerStatus}
        cloudHardware={cloudHardware}
        isExecuting={runningCellId !== null || isPipelineRunning}
        onRunAllCells={handleRunAllCells}
        onStopExecution={handleStopExecution}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onExportIpynb={() => exportPipelineToIpynb(projectName, config, cells)}
        onUploadCsvClick={() => fileInputRef.current?.click()}
      />

      {/* Main 3-Pane Single-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: 4-Step Visual Anti-Leakage Configurator (24%) */}
        <div className="w-[310px] xl:w-[340px] shrink-0 h-full overflow-hidden">
          <LeftPipelineSidebar
            config={config}
            dataProfile={dataProfile}
            onChangeConfig={setConfig}
            onSelectSampleDataset={handleSelectSampleDataset}
            onUploadCsvClick={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Center Pane: Lockable Monaco Notebook Cells (44%) */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <CenterNotebookPane
            cells={cells}
            runningCellId={runningCellId}
            onRunCell={executeSingleCell}
            onStopCell={handleStopExecution}
            onEditCellCode={handleEditCellCode}
            onToggleLockCell={handleToggleLockCell}
            onResetCellToTemplate={handleResetCellToTemplate}
            onAddCustomCell={handleAddCustomCell}
            onDeleteCustomCell={handleDeleteCustomCell}
          />
        </div>

        {/* Right Pane: Experiment Leaderboard, Plots, Data Profile & Live CLI (32%) */}
        <div className="w-[380px] xl:w-[430px] shrink-0 h-full overflow-hidden">
          <RightStudioPane
            taskType={config.taskType}
            dataProfile={dataProfile}
            experiments={experiments}
            selectedExpId={selectedExpId}
            onSelectExperiment={setSelectedExpId}
            onRestoreExperiment={handleRestoreExperiment}
            onClearExperiments={() => setExperiments([])}
            cliLogs={cliLogs}
            onClearLogs={() => setCliLogs([])}
            namespaceVars={namespaceVars}
            onRunQuickCommand={handleRunQuickCommand}
          />
        </div>
      </div>

      {/* Bottom IDE Status Bar */}
      <footer className="h-6 px-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                runtimeMode === 'pyodide'
                  ? pyodideStatus === 'idle'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400 animate-pulse'
                  : cloudWorkerStatus !== 'offline'
                  ? 'bg-emerald-400'
                  : 'bg-rose-400'
              }`}
            />
            <strong className="text-slate-200">
              {runtimeMode === 'pyodide'
                ? pyodideStatusText
                : cloudWorkerStatus !== 'offline'
                ? `Cloud Worker Active (${cloudHardware?.platform} • ${cloudHardware?.gpu})`
                : 'Cloud Worker Offline (Click Connect Cloud)'}
            </strong>
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline font-mono">
            Session: {sessionId.slice(0, 8)}...
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            Dataset: <strong className="text-slate-200">{dataProfile?.dataset_name}</strong> (
            {dataProfile?.shape[0]}×{dataProfile?.shape[1]})
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Model: <strong className="text-indigo-300">{config.modelFamily}</strong>
          </span>
        </div>
      </footer>

      {/* Modal Kết nối Google Colab / Kaggle & Supabase */}
      <CloudConnectModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        sessionId={sessionId}
        onRegenerateSession={() => setSessionId(regenerateSessionId())}
        credentials={supabaseCreds}
        onSaveCredentials={(creds) => {
          saveSupabaseCredentials(creds);
          setSupabaseCreds(creds);
        }}
        cloudConnected={cloudConnected}
        workerStatus={cloudWorkerStatus}
        hardwareInfo={cloudHardware}
        onPingWorker={() => cloudBrokerRef.current?.sendPing()}
      />
    </div>
  );
}

export default App;
