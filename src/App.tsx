import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { LeftPipelineSidebar } from './components/LeftPipelineSidebar';
import { CenterNotebookPane } from './components/CenterNotebookPane';
import { RightStudioPane, WhatIfResult } from './components/RightStudioPane';
import { CloudConnectModal } from './components/CloudConnectModal';
import { AiByokModal } from './components/AiByokModal';
import { computeAutoOptimizedConfig } from './utils/autoOptimizer';
import { AiOptimizationPlan } from './utils/aiByokClient';
import {
  createDefaultPipelineConfig,
  PUBLIC_URL_PRESETS,
  PublicDatasetPreset,
} from './data/sampleDatasets';
import {
  buildAllPipelineCells,
  buildCellsFromTemplate,
  generateQuickSnippetCell,
  normalizeUrlForPython,
} from './engine/codeGenerator';
import {
  getOrInitSessionId,
  getStoredSupabaseCredentials,
  regenerateSessionId,
  saveSupabaseCredentials,
  SupabaseCloudBroker,
} from './engine/supabaseCloudClient';
import {
  CellType,
  CliLogEntry,
  DataProfile,
  ExperimentRecord,
  HardwareInfo,
  NotebookCell,
  NotebookWorkspaceMeta,
  PipelineConfig,
  PipelineTemplateId,
  QuickSnippetId,
  RuntimeMode,
  SupabaseCredentials,
  WorkerStatus,
} from './types/studio';
import {
  loadCsvFileFromCache,
  loadWorkspaceStateFromCache,
  saveCsvFileToCache,
  saveWorkspaceStateToCache,
} from './utils/datasetCacheDb';
import {
  exportPipelineToIpynb,
  parseImportedIpynb,
} from './utils/ipynbExporter';

const EXP_STORAGE_KEY = 'amlics_experiments_v2';
const CONFIG_STORAGE_KEY = 'amlics_pipeline_config_v2';
const WORKSPACES_STORAGE_KEY = 'amlics_workspaces_v1';

interface StoredWorkspaceSnapshot extends NotebookWorkspaceMeta {
  config: PipelineConfig;
  cells: NotebookCell[];
  dataProfile: DataProfile | null;
}

function triggerBrowserDownload(filename: string, textContent: string) {
  const blob = new Blob([textContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function App() {
  const [projectName, setProjectName] = useState<string>('AMLICS_Pipeline_Notebook');
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('pyodide');

  const [config, setConfig] = useState<PipelineConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) return { ...createDefaultPipelineConfig(), ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return createDefaultPipelineConfig();
  });

  const [dataProfile, setDataProfile] = useState<DataProfile | null>(null);

  const [cells, setCells] = useState<NotebookCell[]>([]);

  const [runningCellId, setRunningCellId] = useState<string | null>(null);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState<boolean>(false);
  const [hasSubmissionCsv, setHasSubmissionCsv] = useState<boolean>(false);
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(true);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

  const [urlLoading, setUrlLoading] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

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
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [whatIfLoading, setWhatIfLoading] = useState<boolean>(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [workspaces, setWorkspaces] = useState<StoredWorkspaceSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredWorkspaceSnapshot[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'ws_default',
        name: 'AMLICS_Pipeline_Notebook',
        updatedAt: Date.now(),
        config: createDefaultPipelineConfig(),
        cells: [],
        dataProfile: null,
      },
    ];
  });
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(
    () => workspaces[0]?.id || 'ws_default'
  );

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

  const trainCsvInputRef = useRef<HTMLInputElement | null>(null);
  const testCsvInputRef = useRef<HTMLInputElement | null>(null);
  const ipynbInputRef = useRef<HTMLInputElement | null>(null);
  const lastProfileDatasetRef = useRef<string>('');
  const workspaceHydratedRef = useRef<boolean>(false);
  const pendingPresetRef = useRef<PublicDatasetPreset | null>(null);

  const configRef = useRef(config);
  configRef.current = config;
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const dataProfileRef = useRef(dataProfile);
  dataProfileRef.current = dataProfile;
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

  // Auto-save experiments & config
  useEffect(() => {
    try {
      localStorage.setItem(EXP_STORAGE_KEY, JSON.stringify(experiments));
    } catch {
      // ignore
    }
  }, [experiments]);

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  // Hydrate cached workspace state (cells + dataProfile) & cached CSVs from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ dataProfile: savedProfile, cells: savedCells }, cachedTrain, cachedTest] =
        await Promise.all([
          loadWorkspaceStateFromCache(),
          loadCsvFileFromCache('train'),
          loadCsvFileFromCache('test'),
        ]);

      if (cancelled) return;

      if (savedProfile) {
        lastProfileDatasetRef.current = savedProfile.dataset_name;
        setDataProfile(savedProfile);
      }
      if (savedCells && savedCells.length > 0) {
        setCells(savedCells);
      }
      workspaceHydratedRef.current = true;

      if (cachedTrain && pyodideWorkerRef.current) {
        pyodideWorkerRef.current.postMessage({
          type: 'write_csv',
          payload: {
            filename: cachedTrain.filename,
            content: cachedTrain.content,
            isTestFile: false,
            silentRestore: true,
          },
        });
        setConfig((prev) => ({
          ...prev,
          uploadedFileName: prev.uploadedFileName || cachedTrain.filename,
        }));
      }

      if (cachedTest && pyodideWorkerRef.current) {
        pyodideWorkerRef.current.postMessage({
          type: 'write_csv',
          payload: {
            filename: cachedTest.filename,
            content: cachedTest.content,
            isTestFile: true,
            silentRestore: true,
          },
        });
        setConfig((prev) => ({
          ...prev,
          testUploadedFileName: prev.testUploadedFileName || cachedTest.filename,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save cells & dataProfile to IndexedDB
  useEffect(() => {
    if (!workspaceHydratedRef.current) return;
    saveWorkspaceStateToCache(dataProfile, cells);
  }, [dataProfile, cells]);

  // Sync UI config -> code for unlocked pipeline cells
  useEffect(() => {
    setCells((prevCells) =>
      prevCells.length > 0 ? buildAllPipelineCells(config, prevCells) : prevCells
    );
  }, [config]);

  // Synchronize column roles whenever a new DataProfile arrives
  const syncColumnsFromProfile = useCallback(
    (profile: DataProfile, forceReinfer = false) => {
      setDataProfile(profile);
      const isNewDataset =
        forceReinfer || profile.dataset_name !== lastProfileDatasetRef.current;
      lastProfileDatasetRef.current = profile.dataset_name;

      setConfig((prev) => {
        const allColNames = profile.columns.map((c) => c.name);
        if (
          !isNewDataset &&
          allColNames.includes(prev.targetColumn) &&
          (prev.numericColumns.some((c) => allColNames.includes(c)) ||
            prev.categoricalColumns.some((c) => allColNames.includes(c)))
        ) {
          return prev;
        }

        const activePreset = pendingPresetRef.current;
        pendingPresetRef.current = null;

        // Choose the preset targetColumn if available, otherwise the last non-ID column
        const nonIdCols = profile.columns.filter(
          (c) => !c.is_id_like && !c.is_constant
        );
        const targetCand =
          activePreset && allColNames.includes(activePreset.targetColumn)
            ? activePreset.targetColumn
            : nonIdCols[nonIdCols.length - 1]?.name ||
              profile.columns[profile.columns.length - 1]?.name ||
              prev.targetColumn;

        const targetMeta = profile.columns.find((c) => c.name === targetCand);
        const inferredTask = activePreset
          ? activePreset.taskType
          : targetMeta && targetMeta.nunique <= 12
          ? 'classification'
          : 'regression';

        // Automatically drop all ID columns, constant columns, and high-cardinality text columns!
        const autoDropCols = profile.columns
          .filter(
            (c) =>
              c.name !== targetCand &&
              (c.is_id_like ||
                c.is_constant ||
                c.inferred_type === 'id_or_constant' ||
                c.inferred_type === 'text')
          )
          .map((c) => c.name);
        const dropCols = Array.from(
          new Set([
            ...autoDropCols,
            ...(activePreset ? activePreset.dropColumns.filter((c) => c !== targetCand && allColNames.includes(c)) : []),
          ])
        );

        const firstIdCol =
          (activePreset?.idColumn && allColNames.includes(activePreset.idColumn)
            ? activePreset.idColumn
            : profile.columns.find((c) => c.is_id_like)?.name) ||
          profile.columns[0]?.name ||
          'id';

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
          idColumnForSubmission: firstIdCol,
          taskType: inferredTask,
          cvStrategy:
            inferredTask === 'classification' ? 'stratified_kfold' : 'kfold',
          dropColumns: dropCols,
          numericColumns: numCols,
          categoricalColumns: catCols,
          autoSelectedFields: Array.from(
            new Set([
              ...(prev.autoSelectedFields || []),
              'taskType',
              'cvStrategy',
            ]),
          ),
        };
      });
    },
    []
  );

  const handleIncomingCellResult = useCallback(
    (payload: {
      cell_id: string;
      status: 'success' | 'error' | 'stopped';
      duration_ms: number;
      stdout_summary?: string;
      html_output?: string;
      figures_base64?: string[];
      experiment_record?: Record<string, unknown> | null;
      has_submission_csv?: boolean;
      namespace_vars?: string[];
      runtime_info?: HardwareInfo;
    }) => {
      const {
        cell_id,
        status,
        duration_ms,
        stdout_summary,
        html_output,
        figures_base64,
        experiment_record,
        has_submission_csv,
        namespace_vars,
        runtime_info,
      } = payload;

      if (namespace_vars && namespace_vars.length > 0) {
        setNamespaceVars(namespace_vars);
      }
      if (runtime_info) {
        setCloudHardware(runtime_info);
      }
      if (has_submission_csv) {
        setHasSubmissionCsv(true);
      }

      if (cell_id === 'whatif_predict') {
        setWhatIfLoading(false);
        const text = stdout_summary || '';
        const markerIdx = text.lastIndexOf('__WHATIF__:');
        if (markerIdx !== -1) {
          try {
            const jsonStr = text.slice(markerIdx + '__WHATIF__:'.length).trim().split('\n')[0];
            const parsed = JSON.parse(jsonStr) as WhatIfResult;
            setWhatIfResult(parsed);
          } catch {
            setWhatIfResult({
              prediction: '',
              error: text || 'Không parse được kết quả dự đoán.',
            });
          }
        } else {
          setWhatIfResult({
            prediction: '',
            error:
              status === 'error'
                ? text || 'Lỗi khi chạy full_pipeline.predict(). Hãy chạy Run all trước.'
                : text || 'Chưa có full_pipeline trong bộ nhớ. Hãy chạy Run all trước.',
          });
        }
        return;
      }

      setCells((prev) =>
        prev.map((c) => {
          if (c.id !== cell_id) return c;
          return {
            ...c,
            status,
            durationMs: duration_ms,
            outputText: stdout_summary !== undefined ? stdout_summary : c.outputText,
            htmlOutput: html_output,
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
            datasetName: String(
              experiment_record.dataset_name ||
                dataProfileRef.current?.dataset_name ||
                'Dataset.csv'
            ),
            targetColumn: String(
              experiment_record.target_column || curConfig.targetColumn
            ),
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
              cvStrategy: curConfig.cvStrategy,
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
              cellType: c.cellType,
              code: c.currentCode,
            })),
            configSnapshot: JSON.parse(JSON.stringify(curConfig)),
          };

          setSelectedExpId(newExp.id);
          cloudBrokerRef.current?.persistExperimentToDb(newExp);
          appendCliLog(
            'system',
            `Recorded Run #${nextRunNum} (${newExp.modelName}) on ${newExp.datasetName} to Leaderboard.`
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
      const {
        type,
        status,
        message,
        cellId,
        stream,
        text,
        dataProfile: prof,
        payload,
        filename,
        content,
        silentRestore,
      } = event.data;

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
        syncColumnsFromProfile(prof, false);
      } else if (type === 'csv_uploaded' && prof) {
        if (silentRestore) {
          setDataProfile(prof);
          lastProfileDatasetRef.current = prof.dataset_name;
          appendCliLog(
            'system',
            `[Cache] Restored ${filename} (${prof.shape[0].toLocaleString()} rows, ${prof.shape[1]} cols) from browser storage.`
          );
        } else {
          syncColumnsFromProfile(prof, true);
          const droppedIds = prof.columns
            .filter((c: { is_id_like?: boolean; is_constant?: boolean }) => c.is_id_like || c.is_constant)
            .map((c: { name: string }) => c.name);
          appendCliLog(
            'system',
            `Loaded ${filename} (${prof.shape[0].toLocaleString()} rows, ${prof.shape[1]} cols).${
              droppedIds.length > 0
                ? ` Auto-dropped ID/Constant columns: [${droppedIds.join(', ')}]`
                : ''
            }`
          );
          if (cellsRef.current.length === 0) {
            setTimeout(() => {
              setCells((prev) =>
                prev.length === 0 ? buildAllPipelineCells(configRef.current) : prev
              );
            }, 0);
          }
        }
      } else if (type === 'test_csv_uploaded') {
        appendCliLog(
          'system',
          silentRestore
            ? `[Cache] Restored test dataset: ${filename}.`
            : `Loaded test dataset: ${filename} (for submission.csv).`
        );
      } else if (type === 'submission_csv_content' && content) {
        triggerBrowserDownload('submission.csv', content);
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
        syncColumnsFromProfile(prof, false);
      },
      onHeartbeat: (hb) => {
        setCloudWorkerStatus(hb.status === 'busy' ? 'busy' : 'idle');
        setCloudHardware(hb.runtime_info);
        if (hb.namespace_vars) setNamespaceVars(hb.namespace_vars);
      },
      onSubmissionCsv: (content) => {
        triggerBrowserDownload('submission.csv', content);
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
      if (!targetCell || targetCell.cellType === 'markdown') {
        return Promise.resolve(true);
      }

      setRunningCellId(cellId);
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                status: 'running',
                outputText: '',
                htmlOutput: undefined,
                figures: [],
              }
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
              setCells((prev) =>
                prev.map((c) => (c.id === cellId ? { ...c, status: 'error' } : c))
              );
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

  const handleRunFromCell = useCallback(
    async (startCellId: string) => {
      if (runningCellId) return;
      stopRequestedRef.current = false;
      setIsPipelineRunning(true);

      const startIdx = cellsRef.current.findIndex((c) => c.id === startCellId);
      const slice =
        startIdx >= 0 ? cellsRef.current.slice(startIdx) : cellsRef.current;

      for (const cell of slice) {
        if (stopRequestedRef.current) break;
        if (cell.cellType === 'markdown') continue;
        const ok = await executeSingleCell(cell.id);
        if (!ok || stopRequestedRef.current) {
          break;
        }
      }

      setIsPipelineRunning(false);
      cloudBrokerRef.current?.persistStateToDb(
        configRef.current,
        cellsRef.current,
        dataProfileRef.current
      );
    },
    [runningCellId, executeSingleCell]
  );

  const handleRunAllCells = useCallback(async () => {
    const firstCell = cellsRef.current[0];
    if (firstCell) {
      await handleRunFromCell(firstCell.id);
    }
  }, [handleRunFromCell]);

  const handleRunActiveCell = useCallback(async () => {
    if (runningCellId) return;
    const targetId = activeCellId || cellsRef.current[0]?.id;
    if (!targetId) return;
    await executeSingleCell(targetId);
  }, [runningCellId, activeCellId, executeSingleCell]);

  const handleRunBeforeActiveCell = useCallback(async () => {
    if (runningCellId) return;
    const targetId = activeCellId || cellsRef.current[0]?.id;
    const idx = cellsRef.current.findIndex((c) => c.id === targetId);
    if (idx <= 0) return;

    stopRequestedRef.current = false;
    setIsPipelineRunning(true);
    for (const cell of cellsRef.current.slice(0, idx)) {
      if (stopRequestedRef.current) break;
      if (cell.cellType === 'markdown') continue;
      const ok = await executeSingleCell(cell.id);
      if (!ok || stopRequestedRef.current) break;
    }
    setIsPipelineRunning(false);
  }, [runningCellId, activeCellId, executeSingleCell]);

  const handleRunFromActiveCell = useCallback(async () => {
    const targetId = activeCellId || cellsRef.current[0]?.id;
    if (targetId) {
      await handleRunFromCell(targetId);
    }
  }, [activeCellId, handleRunFromCell]);

  const handleRunPendingOrErrorCells = useCallback(async () => {
    if (runningCellId) return;
    stopRequestedRef.current = false;
    setIsPipelineRunning(true);
    for (const cell of cellsRef.current) {
      if (stopRequestedRef.current) break;
      if (cell.cellType === 'markdown') continue;
      if (cell.status === 'idle' || cell.status === 'error' || cell.status === 'stopped') {
        const ok = await executeSingleCell(cell.id);
        if (!ok || stopRequestedRef.current) break;
      }
    }
    setIsPipelineRunning(false);
  }, [runningCellId, executeSingleCell]);

  const handleClearAllOutputs = useCallback(() => {
    setCells((prev) =>
      prev.map((c) => ({
        ...c,
        status: 'idle',
        outputText: '',
        htmlOutput: undefined,
        figures: [],
        durationMs: undefined,
      }))
    );
    appendCliLog('system', 'Cleared all cell outputs.');
  }, [appendCliLog]);

  const restoreCachedCsvsToWorker = useCallback(async () => {
    const [cachedTrain, cachedTest] = await Promise.all([
      loadCsvFileFromCache('train'),
      loadCsvFileFromCache('test'),
    ]);
    if (cachedTrain && pyodideWorkerRef.current) {
      pyodideWorkerRef.current.postMessage({
        type: 'write_csv',
        payload: {
          filename: cachedTrain.filename,
          content: cachedTrain.content,
          isTestFile: false,
          silentRestore: true,
        },
      });
    }
    if (cachedTest && pyodideWorkerRef.current) {
      pyodideWorkerRef.current.postMessage({
        type: 'write_csv',
        payload: {
          filename: cachedTest.filename,
          content: cachedTest.content,
          isTestFile: true,
          silentRestore: true,
        },
      });
    }
  }, []);

  const handleRestartKernel = useCallback(async () => {
    stopRequestedRef.current = true;
    setIsPipelineRunning(false);
    setRunningCellId(null);
    setNamespaceVars(['pd', 'np', 'plt']);
    if (runtimeMode === 'pyodide') {
      initPyodideWorker();
      await restoreCachedCsvsToWorker();
      appendCliLog('system', 'Restarted Browser Pyodide kernel (variables cleared, cached CSV files preserved).');
    } else {
      cloudBrokerRef.current?.sendStopCell();
      appendCliLog('system', 'Sent restart/interrupt signal to Cloud Worker.');
    }
  }, [runtimeMode, initPyodideWorker, restoreCachedCsvsToWorker, appendCliLog]);

  const handleRestartAndRunAll = useCallback(async () => {
    await handleRestartKernel();
    handleClearAllOutputs();
    const firstCell = cellsRef.current[0];
    if (firstCell) {
      await handleRunFromCell(firstCell.id);
    }
  }, [handleRestartKernel, handleClearAllOutputs, handleRunFromCell]);

  const handleStopExecution = useCallback(() => {
    stopRequestedRef.current = true;
    setIsPipelineRunning(false);

    if (runtimeMode === 'cloud') {
      cloudBrokerRef.current?.sendStopCell();
      appendCliLog('system', 'Sent interrupt signal to Cloud Worker.');
    } else {
      appendCliLog(
        'system',
        'Interrupted Browser Wasm worker. Restarting local Python kernel (in-memory variables cleared)...'
      );
      initPyodideWorker();
      if (runningCellId) {
        setCells((prev) =>
          prev.map((c) =>
            c.id === runningCellId
              ? {
                  ...c,
                  status: 'stopped',
                  outputText: c.outputText + '\nKeyboardInterrupt (Worker restarted)',
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
              isLocked: c.cellType === 'code' ? true : c.isLocked,
            }
          : c
      )
    );
  };

  const handleRenameCell = (cellId: string, newTitle: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cellId
          ? {
              ...c,
              title: newTitle,
              customTitle: true,
            }
          : c
      )
    );
  };

  const handleApplyTemplate = (templateId: PipelineTemplateId) => {
    const { nextConfig, cells: newCells } = buildCellsFromTemplate(
      templateId,
      configRef.current
    );
    setConfig(nextConfig);
    setCells(newCells);
    appendCliLog(
      'system',
      `Applied pipeline template: ${templateId} (${newCells.length} cells generated).`
    );
  };

  const handleInsertQuickSnippet = (snippetId: QuickSnippetId) => {
    const newCell = generateQuickSnippetCell(
      snippetId,
      configRef.current,
      cellsRef.current.length + 1
    );
    setCells((prev) => [...prev, newCell]);
    appendCliLog(
      'system',
      `Inserted cell "${newCell.title}" tailored to ${
        dataProfile?.dataset_name || configRef.current.uploadedFileName || 'dataset'
      }.`
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

  const handleInsertCellAt = (index: number, cellType: CellType) => {
    const newCell: NotebookCell =
      cellType === 'markdown'
        ? {
            id: `md_${Date.now()}`,
            order: index + 1,
            cellType: 'markdown',
            stepType: 'markdown_doc',
            title: 'Markdown Note',
            subtitle: 'Documentation',
            generatedCode: '',
            currentCode: `### Notes\nWrite your analysis notes or markdown tables here. Double-click to edit, **Shift+Enter** to render.`,
            isLocked: true,
            status: 'idle',
            outputText: '',
            figures: [],
          }
        : {
            id: `code_${Date.now()}`,
            order: index + 1,
            cellType: 'code',
            stepType: 'custom',
            title: 'Custom Code Cell',
            subtitle: 'Shared kernel namespace (df, X_train, full_pipeline)',
            generatedCode: '',
            currentCode: `# Custom exploration (last expression renders automatically)\ndf.head(5)`,
            isLocked: true,
            status: 'idle',
            outputText: '',
            figures: [],
          };

    setCells((prev) => {
      const copy = [...prev];
      copy.splice(index, 0, newCell);
      return copy.map((c, idx) => ({ ...c, order: idx + 1 }));
    });
  };

  const handleMoveCell = (cellId: string, direction: 'up' | 'down') => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === cellId);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy.map((c, i) => ({ ...c, order: i + 1 }));
    });
  };

  const handleDuplicateCell = (cellId: string) => {
    setCells((prev) => {
      const idx = prev.findIndex((c) => c.id === cellId);
      if (idx < 0) return prev;
      const orig = prev[idx];
      const dup: NotebookCell = {
        ...orig,
        id: `${orig.cellType}_dup_${Date.now()}`,
        stepType: orig.cellType === 'markdown' ? 'markdown_doc' : 'custom',
        title: `${orig.title} (Copy)`,
        isLocked: true,
        status: 'idle',
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, dup);
      return copy.map((c, i) => ({ ...c, order: i + 1 }));
    });
  };

  const handleDeleteCell = (cellId: string) => {
    setCells((prev) =>
      prev
        .filter((c) => c.id !== cellId)
        .map((c, i) => ({ ...c, order: i + 1 }))
    );
  };

  const handleInsertMarkdownSummary = (exp: ExperimentRecord) => {
    const m = exp.metrics;
    const metricLines =
      exp.taskType === 'classification'
        ? `| Metric | Holdout Test | CV (${exp.preprocessingSummary.cvFolds}-Fold) | Train |\n| :--- | :--- | :--- | :--- |\n| **ROC-AUC** | \`${m.roc_auc ?? '-'}\` | \`${m.cv_mean ?? '-'} ± ${m.cv_std ?? '-'}\` | \`${m.train_score ?? '-'}\` |\n| **F1-Score** | \`${m.f1 ?? '-'}\` | - | - |\n| **Accuracy** | \`${m.accuracy ?? '-'}\` | - | - |`
        : `| Metric | Holdout Test | CV (${exp.preprocessingSummary.cvFolds}-Fold) | Train |\n| :--- | :--- | :--- | :--- |\n| **RMSE** | \`${m.rmse ?? '-'}\` | \`${m.cv_mean ?? '-'}\` | \`${m.train_score ?? '-'}\` |\n| **MAE** | \`${m.mae ?? '-'}\` | - | - |\n| **R² Score** | \`${m.r2 ?? '-'}\` | - | - |`;

    const mdText = `## Experiment Report — Run #${exp.runNumber}: ${exp.modelName}
- **Dataset:** \`${exp.datasetName}\` | **Target:** \`${exp.targetColumn}\` | **Runtime:** \`${exp.runtimeUsed}\`
- **Pipeline:** Imputer=\`${exp.preprocessingSummary.numericImputer}\`, Scaler=\`${exp.preprocessingSummary.numericScaler}\`, Encoder=\`${exp.preprocessingSummary.categoricalEncoder}\`, Validation=\`${exp.preprocessingSummary.cvStrategy}\`
- **Hyperparameters:** \`n_estimators=${exp.hyperparameters.nEstimators}\`, \`lr=${exp.hyperparameters.learningRate}\`, \`max_depth=${exp.hyperparameters.maxDepth}\`

${metricLines}`;

    const reportCell: NotebookCell = {
      id: `md_report_${Date.now()}`,
      order: cells.length + 1,
      cellType: 'markdown',
      stepType: 'markdown_doc',
      title: `Experiment Report: Run #${exp.runNumber} (${exp.modelName})`,
      subtitle: 'Auto-generated summary',
      generatedCode: mdText,
      currentCode: mdText,
      isLocked: true,
      status: 'idle',
      outputText: '',
      figures: [],
    };
    setCells((prev) => [...prev, reportCell]);
    appendCliLog('system', `Inserted Markdown summary cell for Run #${exp.runNumber}.`);
  };

  // Load dataset from Public URL (with GitHub/GDrive normalization & CORS proxy fallback)
  const handleFetchPublicUrl = async (rawUrl: string, presetId?: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    setUrlError(null);
    setUrlLoading(true);

    const normalized = normalizeUrlForPython(trimmed);
    const filename =
      normalized.split('/').pop()?.split('?')[0] || 'remote_dataset.csv';

    try {
      let resp: Response;
      try {
        resp = await fetch(normalized);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch {
        // Fallback to Cloudflare Pages CORS Proxy Function
        resp = await fetch(`/api/proxy-csv?url=${encodeURIComponent(normalized)}`);
      }

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `HTTP ${resp.status}`);
      }

      const csvText = await resp.text();
      if (!csvText.trim() || csvText.trim().startsWith('<!DOCTYPE html')) {
        throw new Error(
          'URL returned HTML instead of CSV data. Make sure the link points to a raw CSV file.'
        );
      }

      const preset = PUBLIC_URL_PRESETS.find((p) => p.id === presetId);
      pendingPresetRef.current = preset || null;

      await saveCsvFileToCache('train', filename, csvText);

      pyodideWorkerRef.current?.postMessage({
        type: 'write_csv',
        payload: {
          filename,
          content: csvText,
          isTestFile: false,
          alsoCacheAsUrl: true,
        },
      });

      setConfig((prev) => ({
        ...prev,
        datasetSource: 'public_url',
        publicDatasetUrl: normalized,
        ...(preset
          ? {
              targetColumn: preset.targetColumn,
              idColumnForSubmission: preset.idColumn,
              taskType: preset.taskType,
              dropColumns: preset.dropColumns,
            }
          : {}),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUrlError(`Failed to load URL (${msg}). Check CORS or URL path.`);
      appendCliLog('stderr', `URL load error: ${msg}`);
    } finally {
      setUrlLoading(false);
    }
  };

  const processTrainCsvFile = async (file: File) => {
    const textContent = await file.text();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    await saveCsvFileToCache('train', safeFilename, textContent);

    pyodideWorkerRef.current?.postMessage({
      type: 'write_csv',
      payload: {
        filename: safeFilename,
        content: textContent,
        isTestFile: false,
      },
    });

    let publicUrl: string | null = null;
    if (cloudBrokerRef.current?.isConfigured()) {
      publicUrl = await cloudBrokerRef.current.uploadCsvToStorage(file);
    }

    setConfig((prev) => ({
      ...prev,
      datasetSource: 'upload',
      uploadedFileName: safeFilename,
      cloudDatasetPath: publicUrl || prev.cloudDatasetPath,
      // Auto-enable 10k row subsampling if file > 15MB in browser Wasm
      subsampleRows:
        runtimeMode === 'pyodide' && file.size > 15 * 1024 * 1024 ? 10000 : 0,
    }));
  };

  // Upload Train CSV
  const handleTrainCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processTrainCsvFile(file);
  };

  // Upload Test CSV (for submission.csv)
  const handleTestCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const textContent = await file.text();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    await saveCsvFileToCache('test', safeFilename, textContent);

    pyodideWorkerRef.current?.postMessage({
      type: 'write_csv',
      payload: {
        filename: safeFilename,
        content: textContent,
        isTestFile: true,
      },
    });

    setConfig((prev) => ({
      ...prev,
      testUploadedFileName: safeFilename,
    }));
  };

  // Import .ipynb
  const handleIpynbFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const importedCells = parseImportedIpynb(text);
      if (importedCells.length > 0) {
        setCells(importedCells);
        setProjectName(file.name.replace(/\.ipynb$/i, ''));
        appendCliLog(
          'system',
          `Imported ${importedCells.length} cells from ${file.name}.`
        );
      }
    } catch (err) {
      appendCliLog(
        'stderr',
        `Failed to import .ipynb: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleDownloadSubmissionCsv = () => {
    if (runtimeMode === 'cloud' && cloudBrokerRef.current && cloudConnected) {
      cloudBrokerRef.current.requestSubmissionDownload();
    } else {
      pyodideWorkerRef.current?.postMessage({ type: 'download_submission' });
    }
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
        cellType: 'code',
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

  // ==================== SMART AUTO-OPTIMIZE, AI BYOK, WHAT-IF & MULTI-NOTEBOOK ====================
  useEffect(() => {
    if (!workspaceHydratedRef.current) return;
    setWorkspaces((prev) => {
      const lightweightCells = cells.map((c) => ({ ...c, figures: [] }));
      const next = prev.map((w) =>
        w.id === activeWorkspaceId
          ? {
              ...w,
              name: projectName,
              updatedAt: Date.now(),
              config,
              cells: lightweightCells,
              dataProfile,
            }
          : w
      );
      try {
        localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, [activeWorkspaceId, projectName, config, cells, dataProfile]);

  const handleSelectWorkspace = (targetId: string) => {
    if (targetId === activeWorkspaceId) return;
    const target = workspaces.find((w) => w.id === targetId);
    if (!target) return;
    setActiveWorkspaceId(target.id);
    setProjectName(target.name);
    setConfig(target.config);
    lastProfileDatasetRef.current = target.dataProfile?.dataset_name || '';
    setDataProfile(target.dataProfile);
    setCells(
      target.cells && target.cells.length > 0
        ? target.cells
        : buildAllPipelineCells(target.config, [])
    );
    setWhatIfResult(null);
    appendCliLog('system', `Switched to notebook: ${target.name}.ipynb`);
  };

  const handleCreateWorkspace = () => {
    const newId = `ws_${Date.now()}`;
    const newName = `AMLICS_Notebook_${workspaces.length + 1}`;
    const defaultCfg = createDefaultPipelineConfig();
    const initialCells = buildAllPipelineCells(defaultCfg, []);
    const newWs: StoredWorkspaceSnapshot = {
      id: newId,
      name: newName,
      updatedAt: Date.now(),
      config: defaultCfg,
      cells: initialCells,
      dataProfile: null,
    };
    const nextList = [...workspaces, newWs];
    setWorkspaces(nextList);
    try {
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore
    }
    setActiveWorkspaceId(newId);
    setProjectName(newName);
    setConfig(defaultCfg);
    lastProfileDatasetRef.current = '';
    setDataProfile(null);
    setCells(initialCells);
    setWhatIfResult(null);
    appendCliLog('system', `Created new notebook: ${newName}.ipynb`);
  };

  const handleDeleteWorkspace = (targetId: string) => {
    if (workspaces.length <= 1) return;
    const filtered = workspaces.filter((w) => w.id !== targetId);
    setWorkspaces(filtered);
    try {
      localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      // ignore
    }
    if (activeWorkspaceId === targetId && filtered[0]) {
      const nextWs = filtered[0];
      setActiveWorkspaceId(nextWs.id);
      setProjectName(nextWs.name);
      setConfig(nextWs.config);
      lastProfileDatasetRef.current = nextWs.dataProfile?.dataset_name || '';
      setDataProfile(nextWs.dataProfile);
      setCells(
        nextWs.cells && nextWs.cells.length > 0
          ? nextWs.cells
          : buildAllPipelineCells(nextWs.config, [])
      );
      setWhatIfResult(null);
    }
  };

  const handleAutoOptimize = () => {
    if (!dataProfile) {
      appendCliLog(
        'system',
        '[Auto-Advisor] Vui lòng Load hoặc Upload dataset trước khi Auto-Optimize.'
      );
      return;
    }
    const { nextConfig, reasons } = computeAutoOptimizedConfig(dataProfile, config);
    setConfig(nextConfig);
    appendCliLog(
      'system',
      `[Auto-Advisor] Đã tối ưu hóa cấu hình cho điểm cao nhất (${nextConfig.taskType}, ${nextConfig.modelFamily}, ${nextConfig.cvStrategy} ${nextConfig.cvFolds}-fold):\n- ${reasons.join('\n- ')}`
    );
  };

  const handleApplyAiOptimization = (plan: AiOptimizationPlan) => {
    const autoList = Array.from(
      new Set([
        ...(config.autoSelectedFields || []),
        'taskType',
        'numericImputer',
        'numericScaler',
        'categoricalEncoder',
        'cvStrategy',
        'scoringMetric',
        'imbalanceStrategy',
        'modelFamily',
        'tuningStrategy',
        ...(plan.hyperparameters?.nEstimators !== undefined ? ['hp.nEstimators'] : []),
        ...(plan.hyperparameters?.learningRate !== undefined ? ['hp.learningRate'] : []),
        ...(plan.hyperparameters?.maxDepth !== undefined ? ['hp.maxDepth'] : []),
        ...(plan.hyperparameters?.l2Regularization !== undefined ? ['hp.l2Regularization'] : []),
        ...(plan.hyperparameters?.minSamplesLeaf !== undefined ? ['hp.minSamplesLeaf'] : []),
        ...(plan.hyperparameters?.subsample !== undefined ? ['hp.subsample'] : []),
        ...(plan.hyperparameters?.earlyStopping !== undefined ? ['hp.earlyStopping'] : []),
      ])
    );

    setConfig((prev) => ({
      ...prev,
      ...(plan.taskType ? { taskType: plan.taskType } : {}),
      ...(plan.numericImputer ? { numericImputer: plan.numericImputer } : {}),
      ...(plan.numericScaler ? { numericScaler: plan.numericScaler } : {}),
      ...(typeof plan.logTransformNumeric === 'boolean'
        ? { logTransformNumeric: plan.logTransformNumeric }
        : {}),
      ...(typeof plan.polynomialInteractions === 'boolean'
        ? { polynomialInteractions: plan.polynomialInteractions }
        : {}),
      ...(plan.categoricalEncoder
        ? { categoricalEncoder: plan.categoricalEncoder }
        : {}),
      ...(plan.featureSelection
        ? { featureSelection: plan.featureSelection }
        : {}),
      ...(plan.cvStrategy ? { cvStrategy: plan.cvStrategy } : {}),
      ...(plan.imbalanceStrategy
        ? { imbalanceStrategy: plan.imbalanceStrategy }
        : {}),
      ...(plan.modelFamily ? { modelFamily: plan.modelFamily } : {}),
      ...(plan.tuningStrategy ? { tuningStrategy: plan.tuningStrategy } : {}),
      hyperparameters: {
        ...prev.hyperparameters,
        ...(plan.hyperparameters || {}),
      },
      autoSelectedFields: autoList,
    }));

    appendCliLog(
      'system',
      `[AI Copilot] Đã áp dụng cấu hình AI (${plan.explanation})`
    );
  };

  const handleInsertAiCell = (title: string, code: string) => {
    const newCell: NotebookCell = {
      id: `cell_ai_${Date.now()}`,
      order: cells.length + 1,
      cellType: 'code',
      stepType: 'custom',
      title,
      subtitle: 'Generated by AI Copilot (BYOK)',
      generatedCode: code,
      currentCode: code,
      status: 'idle',
      isLocked: true,
      outputText: '',
      figures: [],
    };
    setCells((prev) => {
      const idx = activeCellId
        ? prev.findIndex((c) => c.id === activeCellId)
        : prev.length - 1;
      const insertAt = idx >= 0 ? idx + 1 : prev.length;
      const copy = [...prev];
      copy.splice(insertAt, 0, newCell);
      return copy.map((c, i) => ({ ...c, order: i + 1 }));
    });
    setActiveCellId(newCell.id);
    appendCliLog('system', `[AI Copilot] Đã chèn cell mới: "${title}"`);
  };

  const handleWhatIfPredict = (row: Record<string, string | number>) => {
    setWhatIfLoading(true);
    setWhatIfResult(null);
    const jsonPayload = JSON.stringify(row).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const code = [
      'import json, pandas as pd',
      "if 'full_pipeline' not in globals():",
      "    print('__WHATIF__:' + json.dumps({'prediction': '', 'error': 'Chưa train full_pipeline. Hãy bấm Run all trước.'}))",
      'else:',
      `    _row_df = pd.DataFrame([json.loads('${jsonPayload}')])`,
      '    _pred = full_pipeline.predict(_row_df)[0]',
      "    _out = {'prediction': _pred.item() if hasattr(_pred, 'item') else str(_pred)}",
      "    if hasattr(full_pipeline, 'predict_proba'):",
      '        _probs = full_pipeline.predict_proba(_row_df)[0]',
      "        _classes = getattr(full_pipeline, 'classes_', list(range(len(_probs))))",
      "        _out['probabilities'] = {str(c): float(p) for c, p in zip(_classes, _probs)}",
      "    print('__WHATIF__:' + json.dumps(_out))",
    ].join('\n');

    if (runtimeMode === 'cloud') {
      if (!cloudConnected || cloudWorkerStatus === 'offline') {
        setWhatIfLoading(false);
        setWhatIfResult({
          prediction: '',
          error: 'Cloud runtime chưa kết nối. Hãy chạy ở Browser (Pyodide) hoặc Connect Cloud.',
        });
        return;
      }
      cloudBrokerRef.current?.sendRunCell({
        id: 'whatif_predict',
        order: 999,
        cellType: 'code',
        stepType: 'custom',
        title: 'What-If Predict',
        subtitle: '',
        generatedCode: code,
        currentCode: code,
        isLocked: true,
        status: 'running',
        outputText: '',
        figures: [],
      });
    } else {
      pyodideWorkerRef.current?.postMessage({
        type: 'run_cell',
        payload: { cellId: 'whatif_predict', code },
      });
    }
  };

  const lastErrorText =
    cells.find((c) => c.status === 'error')?.outputText ||
    [...cliLogs].reverse().find((l) => l.stream === 'stderr')?.text ||
    '';

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#18191a] text-[#e8eaed]">
      {/* Hidden File Inputs */}
      <input
        ref={trainCsvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleTrainCsvChange}
        className="hidden"
      />
      <input
        ref={testCsvInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleTestCsvChange}
        className="hidden"
      />
      <input
        ref={ipynbInputRef}
        type="file"
        accept=".ipynb,application/json"
        onChange={handleIpynbFileChange}
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
        hasSubmissionCsv={hasSubmissionCsv}
        hasActiveCell={cells.length > 0}
        showLeftPanel={showLeftPanel}
        showRightPanel={showRightPanel}
        onToggleLeftPanel={() => setShowLeftPanel((v) => !v)}
        onToggleRightPanel={() => setShowRightPanel((v) => !v)}
        onRunAllCells={handleRunAllCells}
        onRunActiveCell={handleRunActiveCell}
        onRunBeforeActiveCell={handleRunBeforeActiveCell}
        onRunFromActiveCell={handleRunFromActiveCell}
        onRunPendingOrErrorCells={handleRunPendingOrErrorCells}
        onRestartAndRunAll={handleRestartAndRunAll}
        onRestartKernel={handleRestartKernel}
        onClearAllOutputs={handleClearAllOutputs}
        onStopExecution={handleStopExecution}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onExportIpynb={() => exportPipelineToIpynb(projectName, config, cells)}
        onImportIpynbClick={() => ipynbInputRef.current?.click()}
        onUploadCsvClick={() => trainCsvInputRef.current?.click()}
        onDownloadSubmissionCsv={handleDownloadSubmissionCsv}
        workspaces={workspaces.map(({ id, name, updatedAt }) => ({
          id,
          name,
          updatedAt,
        }))}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {showLeftPanel && (
          <div className="w-[300px] xl:w-[320px] shrink-0 h-full overflow-hidden">
            <LeftPipelineSidebar
              config={config}
              runtimeMode={runtimeMode}
              dataProfile={dataProfile}
              availableCloudFiles={cloudHardware?.available_files || []}
              urlLoading={urlLoading}
              urlError={urlError}
              onChangeConfig={setConfig}
              onUploadCsvClick={() => trainCsvInputRef.current?.click()}
              onUploadTestCsvClick={() => testCsvInputRef.current?.click()}
              onFetchPublicUrl={handleFetchPublicUrl}
              onSwitchToCloud={() => {
                setRuntimeMode('cloud');
                setIsCloudModalOpen(true);
              }}
              onAutoOptimize={handleAutoOptimize}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <CenterNotebookPane
            cells={cells}
            runningCellId={runningCellId}
            activeCellId={activeCellId}
            activeDatasetName={dataProfile?.dataset_name || config.uploadedFileName}
            onSelectCell={setActiveCellId}
            onRunCell={executeSingleCell}
            onRunFromCell={handleRunFromCell}
            onStopCell={handleStopExecution}
            onEditCellCode={handleEditCellCode}
            onRenameCell={handleRenameCell}
            onToggleLockCell={handleToggleLockCell}
            onResetCellToTemplate={handleResetCellToTemplate}
            onInsertCellAt={handleInsertCellAt}
            onMoveCell={handleMoveCell}
            onDuplicateCell={handleDuplicateCell}
            onDeleteCell={handleDeleteCell}
            onApplyTemplate={handleApplyTemplate}
            onInsertQuickSnippet={handleInsertQuickSnippet}
            onDropCsvFile={processTrainCsvFile}
          />
        </div>

        {showRightPanel && (
          <div className="w-[350px] xl:w-[390px] shrink-0 h-full overflow-hidden">
            <RightStudioPane
              taskType={config.taskType}
              config={config}
              dataProfile={dataProfile}
              experiments={experiments}
              selectedExpId={selectedExpId}
              onSelectExperiment={setSelectedExpId}
              onRestoreExperiment={handleRestoreExperiment}
              onInsertMarkdownSummary={handleInsertMarkdownSummary}
              onClearExperiments={() => setExperiments([])}
              cliLogs={cliLogs}
              onClearLogs={() => setCliLogs([])}
              namespaceVars={namespaceVars}
              onRunQuickCommand={handleRunQuickCommand}
              onWhatIfPredict={handleWhatIfPredict}
              whatIfLoading={whatIfLoading}
              whatIfResult={whatIfResult}
            />
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 px-3 bg-[#202124] border-t border-[#3c4043] flex items-center justify-between text-[11px] text-[#9aa0a6] select-none shrink-0 font-mono">
        <div className="flex items-center gap-3">
          <span>
            {runtimeMode === 'pyodide'
              ? `Python 3 (Pyodide) — ${pyodideStatus}`
              : cloudWorkerStatus !== 'offline'
              ? `Connected (${cloudHardware?.platform} • ${cloudHardware?.gpu})`
              : 'Remote disconnected'}
          </span>
          {config.subsampleRows > 0 && (
            <span className="text-[#fdd663]">
              • Subsampling: {config.subsampleRows.toLocaleString()} rows
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span>
            {dataProfile
              ? `${dataProfile.dataset_name} (${dataProfile.shape[0].toLocaleString()}×${dataProfile.shape[1]})`
              : 'No dataset loaded'}
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

      <AiByokModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        dataProfile={dataProfile}
        config={config}
        experiments={experiments}
        lastErrorText={lastErrorText}
        onApplyAiOptimization={handleApplyAiOptimization}
        onInsertAiCell={handleInsertAiCell}
      />
    </div>
  );
}

export default App;
