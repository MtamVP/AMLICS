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
  const [projectName, setProjectName] = useState<string>('AMLICS_Telco_Churn');
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('pyodide');

  const [config, setConfig] = useState<PipelineConfig>(() =>
    createDefaultPipelineConfig('telco_churn')
  );
  const [dataProfile, setDataProfile] = useState<DataProfile | null>(
    () => SAMPLE_DATASETS[0].initialProfile
  );

  const [cells, setCells] = useState<NotebookCell[]>(() =>
    buildAllPipelineCells(createDefaultPipelineConfig('telco_churn'))
  );

  const [runningCellId, setRunningCellId] = useState<string | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState<boolean>(false);

  const [pyodideStatus, setPyodideStatus] = useState<WorkerStatus>('initializing');
  const [pyodideStatusText, setPyodideStatusText] = useState<string>(
    'Initializing Pyodide...'
  );

  const [sessionId, setSessionId] = useState<string>(() => getOrInitSessionId());
  const [supabaseCreds, setSupabaseCreds] = useState<SupabaseCredentials>(() =>
    getStoredSupabaseCredentials()
  );
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [cloudWorkerStatus, setCloudWorkerStatus] = useState<WorkerStatus>('offline');
  const [cloudHardware, setCloudHardware] = useState<HardwareInfo | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);

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

  useEffect(() => {
    try {
      localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(experiments));
    } catch {
      // ignore
    }
  }, [experiments]);

  useEffect(() => {
    setCells((prevCells) => buildAllPipelineCells(config, prevCells));
  }, [config]);

  const syncColumnsFromProfile = useCallback((profile: DataProfile) => {
    setDataProfile(profile);
    setConfig((prev) => {
      const allColNames = profile.columns.map((c) => c.name);
      if (
        allColNames.includes(prev.targetColumn) &&
        prev.numericColumns.some((c) => allColNames.includes(c))
      ) {
        return prev;
      }

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
              : 'Browser (Pyodide)',
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
            `Recorded Run #${nextRunNum} (${newExp.modelName}) to Leaderboard.`
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
      } else if (type === 'csv_uploaded' && prof) {
        syncColumnsFromProfile(prof);
        appendCliLog(
          'system',
          `Loaded ${filename} (${prof.shape[0]} rows, ${prof.shape[1]} cols).`
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
      },
      onHeartbeat: (hb) => {
        setCloudWorkerStatus(hb.status === 'busy' ? 'busy' : 'idle');
        setCloudHardware(hb.runtime_info);
        if (hb.namespace_vars) setNamespaceVars(hb.namespace_vars);
      },
      onChannelStatus: (connected, msg) => {
        setCloudConnected(connected);
        appendCliLog('system', `[Realtime] ${msg}`);
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
              'Cloud runtime not connected. Open "Connect Cloud" to start worker.'
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
              appendCliLog('stderr', `Cloud error: ${String(err)}`);
              setRunningCellId(null);
              pendingCellResolverRef.current = null;
              resolve(false);
            });
        } else {
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

  const handleRunAllCells = useCallback(async () => {
    if (runningCellId) return;
    stopRequestedRef.current = false;
    setIsPipelineRunning(true);

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
  }, [runningCellId, executeSingleCell, dataProfile]);

  const handleStopExecution = useCallback(() => {
    stopRequestedRef.current = true;
    setIsPipelineRunning(false);

    if (runtimeMode === 'cloud') {
      cloudBrokerRef.current?.sendStopCell();
      appendCliLog('system', 'Sent interrupt signal to Cloud Worker.');
    } else {
      appendCliLog('system', 'Execution interrupted. Restarting local kernel...');
      initPyodideWorker();
      if (runningCellId) {
        setCells((prev) =>
          prev.map((c) =>
            c.id === runningCellId
              ? {
                  ...c,
                  status: 'stopped',
                  outputText: c.outputText + '\nKeyboardInterrupt',
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

  const handleEditCellCode = (cellId: string, newCode: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? {
              ...c,
              currentCode: newCode,
              isLocked: true,
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
  };

  const handleAddCustomCell = () => {
    const nextOrder = cells.length + 1;
    const newCell: NotebookCell = {
      id: `cell_custom_${Date.now()}`,
      order: nextOrder,
      stepType: 'custom',
      title: `${nextOrder}. Custom Code`,
      subtitle: 'Shared kernel namespace (df, X_train, full_pipeline)',
      generatedCode: '',
      currentCode: `# Custom analysis\ndf.head(3)`,
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

  const handleSelectSampleDataset = (sampleId: string) => {
    const sample =
      SAMPLE_DATASETS.find((s) => s.id === sampleId) || SAMPLE_DATASETS[0];
    const nextCfg = createDefaultPipelineConfig(sample.id);
    setDataProfile(sample.initialProfile);
    setConfig(nextCfg);
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const textContent = await file.text();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    pyodideWorkerRef.current?.postMessage({
      type: 'write_csv',
      payload: {
        filename: safeFilename,
        content: textContent,
      },
    });

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

  const handleRestoreExperiment = (exp: ExperimentRecord) => {
    setConfig(JSON.parse(JSON.stringify(exp.configSnapshot)));
    appendCliLog(
      'system',
      `Restored configuration from Run #${exp.runNumber} (${exp.modelName}).`
    );
  };

  const handleRunQuickCommand = (cmd: string) => {
    appendCliLog('system', `> ${cmd}`);
    if (runtimeMode === 'cloud' && cloudBrokerRef.current && cloudConnected) {
      cloudBrokerRef.current.sendRunCell({
        id: 'quick_repl',
        order: 99,
        stepType: 'custom',
        title: 'REPL',
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#18191a] text-[#e8eaed]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleCsvFileChange}
        className="hidden"
      />

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

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[290px] xl:w-[320px] shrink-0 h-full overflow-hidden">
          <LeftPipelineSidebar
            config={config}
            dataProfile={dataProfile}
            onChangeConfig={setConfig}
            onSelectSampleDataset={handleSelectSampleDataset}
            onUploadCsvClick={() => fileInputRef.current?.click()}
          />
        </div>

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

        <div className="w-[360px] xl:w-[400px] shrink-0 h-full overflow-hidden">
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

      {/* Minimal Colab-style Bottom Status Bar */}
      <footer className="h-6 px-3 bg-[#202124] border-t border-[#3c4043] flex items-center justify-between text-[11px] text-[#9aa0a6] select-none shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span>
            {runtimeMode === 'pyodide'
              ? `Python 3 (Pyodide) — ${pyodideStatus}`
              : cloudWorkerStatus !== 'offline'
              ? `Connected (${cloudHardware?.platform} • ${cloudHardware?.gpu})`
              : 'Remote disconnected'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            {dataProfile?.dataset_name} ({dataProfile?.shape[0]}×{dataProfile?.shape[1]})
          </span>
          <span>•</span>
          <span>{config.modelFamily}</span>
        </div>
      </footer>

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
