import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TopNavbar } from './components/TopNavbar';
import { LeftPipelineSidebar } from './components/LeftPipelineSidebar';
import { CenterNotebookPane } from './components/CenterNotebookPane';
import { RightStudioPane, WhatIfResult } from './components/RightStudioPane';
import { CloudConnectModal } from './components/CloudConnectModal';
import { AiByokModal } from './components/AiByokModal';
import {
  CommandPaletteModal,
  CommandPaletteAction,
} from './components/CommandPaletteModal';
import { computeAutoOptimizedConfig } from './utils/autoOptimizer';
import { AiOptimizationPlan } from './utils/aiByokClient';
import { exportStandaloneHtmlReport } from './utils/htmlReportExporter';
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
  ConfigProvenance,
  DataProfile,
  ExperimentRecord,
  HardwareInfo,
  ModelFamily,
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

type ViewportMode = 'mobile' | 'compact' | 'desktop';
type MobileTab = 'config' | 'notebook' | 'results';

function detectViewportMode(): ViewportMode {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth < 768) return 'mobile';
  if (window.innerWidth < 1280) return 'compact';
  return 'desktop';
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
  const [isTournamentRunning, setIsTournamentRunning] = useState<boolean>(false);
  const configProvenanceRef = useRef<ConfigProvenance>('manual');
  const [hasSubmissionCsv, setHasSubmissionCsv] = useState<boolean>(false);
  const [viewportMode, setViewportMode] = useState<ViewportMode>(() => detectViewportMode());
  const [mobileTab, setMobileTab] = useState<MobileTab>('notebook');
  const [showLeftPanel, setShowLeftPanel] = useState<boolean>(() => detectViewportMode() === 'desktop');
  const [showRightPanel, setShowRightPanel] = useState<boolean>(() => detectViewportMode() === 'desktop');

  useEffect(() => {
    let prevMode = detectViewportMode();
    const handleResize = () => {
      const next = detectViewportMode();
      setViewportMode(next);
      if (next !== prevMode) {
        if (next === 'desktop') {
          setShowLeftPanel(true);
          setShowRightPanel(true);
        } else {
          setShowLeftPanel(false);
          setShowRightPanel(false);
        }
        prevMode = next;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleLeftPanel = useCallback(() => {
    if (viewportMode === 'mobile') {
      setMobileTab((t) => (t === 'config' ? 'notebook' : 'config'));
      return;
    }
    setShowLeftPanel((prev) => {
      const next = !prev;
      if (next && viewportMode === 'compact') {
        setShowRightPanel(false);
      }
      return next;
    });
  }, [viewportMode]);

  const handleToggleRightPanel = useCallback(() => {
    if (viewportMode === 'mobile') {
      setMobileTab((t) => (t === 'results' ? 'notebook' : 'results'));
      return;
    }
    setShowRightPanel((prev) => {
      const next = !prev;
      if (next && viewportMode === 'compact') {
        setShowLeftPanel(false);
      }
      return next;
    });
  }, [viewportMode]);

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
  const cloudSyncedKeysRef = useRef<Set<string>>(new Set());
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState<boolean>(false);
  const [whatIfLoading, setWhatIfLoading] = useState<boolean>(false);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [batchPredictLoading, setBatchPredictLoading] = useState<boolean>(false);
  const [batchPredictMessage, setBatchPredictMessage] = useState<string | null>(null);
  const [rightTabOverride, setRightTabOverride] = useState<
    'leaderboard' | 'diagnostics' | 'data' | 'predict' | null
  >(null);
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
  const whatIfBufferRef = useRef<string>('');
  const batchPredictBufferRef = useRef<string>('');
  const batchPredictFileNameRef = useRef<string>('predicted.csv');

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
            alsoCacheAsUrl: configRef.current.datasetSource === 'public_url',
          },
        });
        configProvenanceRef.current = 'ai_copilot';
    setConfig((prev) => ({
          ...prev,
          uploadedFileName: prev.uploadedFileName || cachedTrain.filename,
        }));
      } else if (
        !cachedTrain &&
        configRef.current.datasetSource === 'public_url' &&
        configRef.current.publicDatasetUrl
      ) {
        handleFetchPublicUrl(configRef.current.publicDatasetUrl);
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
        configProvenanceRef.current = 'ai_copilot';
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
        const text = [whatIfBufferRef.current, stdout_summary || '']
          .filter(Boolean)
          .join('\n')
          .trim();
        whatIfBufferRef.current = '';
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

      if (cell_id === 'batch_predict') {
        setBatchPredictLoading(false);
        const text = [batchPredictBufferRef.current, stdout_summary || '']
          .filter(Boolean)
          .join('\n');
        batchPredictBufferRef.current = '';
        const sIdx = text.indexOf('__BATCH_CSV_START__');
        const eIdx = text.indexOf('__BATCH_CSV_END__');
        if (sIdx !== -1 && eIdx !== -1 && eIdx > sIdx) {
          const csvBody = text
            .slice(sIdx + '__BATCH_CSV_START__'.length, eIdx)
            .trim();
          const outName = `predicted_${batchPredictFileNameRef.current}`;
          triggerBrowserDownload(outName, csvBody);
          setBatchPredictMessage(`Đã tải về ${outName} thành công!`);
        } else {
          setBatchPredictMessage(
            text.trim() || 'Lỗi khi Batch Predict. Hãy chạy Run all trước.'
          );
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
            configSource:
              configProvenanceRef.current !== 'manual'
                ? configProvenanceRef.current
                : curConfig.autoSelectedFields && curConfig.autoSelectedFields.length > 0
                ? 'auto_advisor'
                : 'manual',
            autoSelectedFields: [...(curConfig.autoSelectedFields || [])],
            tuningStrategy: curConfig.tuningStrategy,
            tuningIterations: curConfig.tuningIterations,
            hyperparameters: { ...curConfig.hyperparameters },
            preprocessingSummary: {
              numericImputer: curConfig.numericImputer,
              categoricalImputer: curConfig.categoricalImputer,
              numericScaler: curConfig.numericScaler,
              categoricalEncoder: curConfig.categoricalEncoder,
              imbalanceStrategy: curConfig.imbalanceStrategy,
              featureSelection: curConfig.featureSelection,
              varianceThreshold: curConfig.varianceThreshold,
              logTransformNumeric: curConfig.logTransformNumeric,
              polynomialInteractions: curConfig.polynomialInteractions,
              cvStrategy: curConfig.cvStrategy,
              cvFolds: curConfig.cvFolds,
              testSize: curConfig.testSize,
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
        if (cellId === 'whatif_predict') {
          whatIfBufferRef.current += text;
          return;
        }
        if (cellId === 'batch_predict') {
          batchPredictBufferRef.current += text;
          return;
        }
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
        if (cell_id === 'whatif_predict') {
          whatIfBufferRef.current += text;
          return;
        }
        if (cell_id === 'batch_predict') {
          batchPredictBufferRef.current += text;
          return;
        }
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

  useEffect(() => {
    if (!cloudConnected || cloudWorkerStatus === 'offline') {
      cloudSyncedKeysRef.current.clear();
      return;
    }
    const broker = cloudBrokerRef.current;
    if (!broker) return;

    let cancelled = false;
    (async () => {
      try {
        const [cachedTrain, cachedTest] = await Promise.all([
          loadCsvFileFromCache('train'),
          loadCsvFileFromCache('test'),
        ]);
        if (cancelled) return;
        const MAX_CLOUD_SYNC_BYTES = 4 * 1024 * 1024;
        if (cachedTrain && cachedTrain.content.length <= MAX_CLOUD_SYNC_BYTES) {
          const key = `${sessionId}:train:${cachedTrain.filename}:${cachedTrain.content.length}`;
          if (!cloudSyncedKeysRef.current.has(key)) {
            cloudSyncedKeysRef.current.add(key);
            await broker.sendUploadCsv(cachedTrain.filename, cachedTrain.content, false, false);
            appendCliLog('system', `[Cloud Sync] Synced ${cachedTrain.filename} to Colab/Kaggle /tmp/.`);
          }
        }
        if (cachedTest && cachedTest.content.length <= MAX_CLOUD_SYNC_BYTES) {
          const key = `${sessionId}:test:${cachedTest.filename}:${cachedTest.content.length}`;
          if (!cloudSyncedKeysRef.current.has(key)) {
            cloudSyncedKeysRef.current.add(key);
            await broker.sendUploadCsv(cachedTest.filename, cachedTest.content, true, false);
            appendCliLog('system', `[Cloud Sync] Synced test ${cachedTest.filename} to Colab/Kaggle /tmp/.`);
          }
        }
      } catch {
        // ignore cache sync errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cloudConnected, cloudWorkerStatus, sessionId, appendCliLog]);

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

  const handleRunModelTournament = useCallback(async () => {
    if (runningCellId || isPipelineRunning || isTournamentRunning) return;
    if (cellsRef.current.length === 0) return;

    const models: ModelFamily[] =
      runtimeModeRef.current === 'cloud'
        ? ['LinearModel', 'RandomForest', 'ExtraTrees', 'HistGradientBoosting', 'LightGBM']
        : ['LinearModel', 'RandomForest', 'ExtraTrees', 'HistGradientBoosting'];

    stopRequestedRef.current = false;
    configProvenanceRef.current = 'tournament';
    setIsPipelineRunning(true);
    setIsTournamentRunning(true);
    appendCliLog('system', `[Tournament] Bắt đầu so sánh ${models.length} mô hình: ${models.join(', ')}...`);

    try {
      // Ensure prerequisite steps (data_load, preprocess, split_cv) succeeded
      const prereqSteps = ['data_load', 'preprocess', 'split_cv'];
      for (const step of prereqSteps) {
        if (stopRequestedRef.current) break;
        const c = cellsRef.current.find((cell) => cell.stepType === step);
        if (c && c.status !== 'success') {
          const ok = await executeSingleCell(c.id);
          if (!ok || stopRequestedRef.current) return;
        }
      }

      for (const model of models) {
        if (stopRequestedRef.current) break;
        appendCliLog('system', `[Tournament] Đang huấn luyện ${model}...`);
        configProvenanceRef.current = 'ai_copilot';
    setConfig((prev) => ({
          ...prev,
          modelFamily: model,
          autoSelectedFields: (prev.autoSelectedFields || []).filter((f) => f !== 'modelFamily'),
        }));
        await new Promise((r) => setTimeout(r, 80));

        const trainCell = cellsRef.current.find((c) => c.stepType === 'model_train');
        const evalCell = cellsRef.current.find((c) => c.stepType === 'evaluate');
        if (!trainCell || !evalCell) break;

        const okTrain = await executeSingleCell(trainCell.id);
        if (!okTrain || stopRequestedRef.current) continue;
        await executeSingleCell(evalCell.id);
      }

      if (!stopRequestedRef.current) {
        appendCliLog('system', '[Tournament] Hoàn tất so sánh! Xem bảng xếp hạng ở tab Leaderboard.');
      }
    } finally {
      configProvenanceRef.current = 'manual';
      setIsTournamentRunning(false);
      setIsPipelineRunning(false);
    }
  }, [runningCellId, isPipelineRunning, isTournamentRunning, appendCliLog, executeSingleCell]);

  const handleApplyQuickFix = useCallback(
    (kind: 'regularize' | 'balance' | 'boost') => {
      if (kind === 'regularize') {
        configProvenanceRef.current = 'ai_copilot';
    setConfig((prev) => ({
          ...prev,
          hyperparameters: {
            ...prev.hyperparameters,
            maxDepth: Math.max(2, Math.min(4, prev.hyperparameters.maxDepth - 2)),
            minSamplesLeaf: Math.max(10, prev.hyperparameters.minSamplesLeaf * 2),
            l2Regularization: Number(Math.max(2.0, prev.hyperparameters.l2Regularization * 2).toFixed(2)),
            earlyStopping: true,
          },
        }));
        appendCliLog('system', '[ML Coach] Đã giảm max_depth, tăng min_samples_leaf & L2 để chống Overfitting. Hãy bấm Run all để kiểm chứng.');
      } else if (kind === 'balance') {
        configProvenanceRef.current = 'ai_copilot';
    setConfig((prev) => ({ ...prev, imbalanceStrategy: 'class_weight' }));
        appendCliLog('system', '[ML Coach] Đã bật imbalanceStrategy = class_weight để cân bằng lớp thiểu số.');
      } else {
        configProvenanceRef.current = 'ai_copilot';
    setConfig((prev) => ({
          ...prev,
          modelFamily: 'HistGradientBoosting',
          hyperparameters: {
            ...prev.hyperparameters,
            nEstimators: Math.min(400, Math.max(150, prev.hyperparameters.nEstimators + 80)),
            maxDepth: Math.max(6, prev.hyperparameters.maxDepth + 2),
          },
        }));
        appendCliLog('system', '[ML Coach] Đã tăng n_estimators & max_depth với HistGradientBoosting để cải thiện Underfitting.');
      }
    },
    [appendCliLog]
  );

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
    configProvenanceRef.current = 'tournament';
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
    configProvenanceRef.current = 'tournament';
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
          alsoCacheAsUrl: configRef.current.datasetSource === 'public_url',
        },
      });
    } else if (
      !cachedTrain &&
      configRef.current.datasetSource === 'public_url' &&
      configRef.current.publicDatasetUrl
    ) {
      handleFetchPublicUrl(configRef.current.publicDatasetUrl);
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

  const handleDeleteCells = (cellIds: string[]) => {
    const idSet = new Set(cellIds);
    setCells((prev) =>
      prev
        .filter((c) => !idSet.has(c.id))
        .map((c, i) => ({ ...c, order: i + 1 }))
    );
    if (activeCellId && idSet.has(activeCellId)) {
      setActiveCellId(null);
    }
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

      configProvenanceRef.current = 'ai_copilot';
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
    if (cloudBrokerRef.current && cloudConnected && cloudWorkerStatus !== 'offline' && textContent.length <= 4 * 1024 * 1024) {
      const key = `${sessionId}:train:${safeFilename}:${textContent.length}`;
      cloudSyncedKeysRef.current.add(key);
      void cloudBrokerRef.current.sendUploadCsv(safeFilename, textContent, false, false);
    }

    configProvenanceRef.current = 'ai_copilot';
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

    if (cloudBrokerRef.current && cloudConnected && cloudWorkerStatus !== 'offline' && textContent.length <= 4 * 1024 * 1024) {
      const key = `${sessionId}:test:${safeFilename}:${textContent.length}`;
      cloudSyncedKeysRef.current.add(key);
      void cloudBrokerRef.current.sendUploadCsv(safeFilename, textContent, true, false);
    }

    configProvenanceRef.current = 'ai_copilot';
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
    configProvenanceRef.current = 'auto_advisor';
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

    configProvenanceRef.current = 'ai_copilot';
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
    whatIfBufferRef.current = '';
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleRunModelArena = async () => {
    if (isPipelineRunning || runningCellId) return;
    const arenaModels: ModelFamily[] = [
      'HistGradientBoosting',
      'XGBoost',
      'LightGBM',
      'RandomForest',
      'LinearModel',
    ];
    setIsPipelineRunning(true);
    stopRequestedRef.current = false;
    appendCliLog(
      'system',
      `[Model Arena] Bắt đầu chạy đua ${arenaModels.length} thuật toán: ${arenaModels.join(', ')}...`
    );

    try {
      // Ensure prep cells (1, 2, 3) have run once
      const prepCells = cellsRef.current.filter(
        (c) =>
          c.cellType === 'code' &&
          (c.stepType === 'data_load' ||
            c.stepType === 'preprocess' ||
            c.stepType === 'split_cv')
      );
      for (const c of prepCells) {
        if (stopRequestedRef.current) break;
        if (c.status !== 'success') {
          const ok = await executeSingleCell(c.id);
          if (!ok) {
            setIsPipelineRunning(false);
            return;
          }
        }
      }

      const baseConfig = configRef.current;
      for (const mf of arenaModels) {
        if (stopRequestedRef.current) break;
        const nextCfg: PipelineConfig = {
          ...baseConfig,
          modelFamily: mf,
          tuningStrategy: 'none',
          autoSelectedFields: Array.from(
            new Set([...(baseConfig.autoSelectedFields || []), 'modelFamily'])
          ),
        };
        setConfig(nextCfg);
        const rebuilt = buildAllPipelineCells(nextCfg, cellsRef.current);
        cellsRef.current = rebuilt;
        setCells(rebuilt);

        const trainCell = rebuilt.find((c) => c.stepType === 'model_train');
        const evalCell = rebuilt.find((c) => c.stepType === 'evaluate');
        if (trainCell) {
          const okTrain = await executeSingleCell(trainCell.id);
          if (!okTrain || stopRequestedRef.current) continue;
        }
        if (evalCell) {
          await executeSingleCell(evalCell.id);
        }
      }

      appendCliLog(
        'system',
        '[Model Arena] Đã hoàn tất chạy đua! Xem bảng xếp hạng Leaderboard ở cột phải.'
      );
      setRightTabOverride('leaderboard');
    } finally {
      setIsPipelineRunning(false);
    }
  };

  const handleBatchPredictCsv = async (file: File) => {
    setBatchPredictLoading(true);
    setBatchPredictMessage(null);
    batchPredictFileNameRef.current = file.name;
    batchPredictBufferRef.current = '';
    const csvText = await file.text();
    const b64 = btoa(unescape(encodeURIComponent(csvText)));
    const code = [
      'import base64, io, pandas as pd',
      "if 'full_pipeline' not in globals():",
      "    print('Chưa train full_pipeline. Hãy bấm Run all trước.')",
      'else:',
      `    _raw = base64.b64decode('${b64}').decode('utf-8')`,
      '    _bdf = pd.read_csv(io.StringIO(_raw))',
      '    _req = list(X_train.columns)',
      '    _missing = [c for c in _req if c not in _bdf.columns]',
      '    if _missing:',
      "        print(f'Thiếu cột so với lúc train: {_missing}')",
      '    else:',
      '        _out_df = _bdf.copy()',
      "        _out_df['prediction'] = full_pipeline.predict(_bdf[_req])",
      "        if hasattr(full_pipeline, 'predict_proba') and len(getattr(full_pipeline, 'classes_', [])) == 2:",
      "            _out_df['probability'] = full_pipeline.predict_proba(_bdf[_req])[:, 1].round(6)",
      "        print('__BATCH_CSV_START__')",
      '        print(_out_df.to_csv(index=False))',
      "        print('__BATCH_CSV_END__')",
    ].join('\n');

    if (runtimeMode === 'cloud') {
      if (!cloudConnected || cloudWorkerStatus === 'offline') {
        setBatchPredictLoading(false);
        setBatchPredictMessage('Cloud runtime chưa kết nối.');
        return;
      }
      cloudBrokerRef.current?.sendRunCell({
        id: 'batch_predict',
        order: 999,
        cellType: 'code',
        stepType: 'custom',
        title: 'Batch Predict',
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
        payload: { cellId: 'batch_predict', code },
      });
    }
  };

  const handleDropHighMissing = () => {
    if (!dataProfile) return;
    const highMissing = dataProfile.columns
      .filter((c) => c.name !== config.targetColumn && c.missing_pct >= 50)
      .map((c) => c.name);
    if (highMissing.length === 0) {
      appendCliLog('system', '[Data Surgery] Không có cột nào thiếu >= 50% dữ liệu.');
      return;
    }
    setConfig((p) => ({
      ...p,
      numericColumns: p.numericColumns.filter((c) => !highMissing.includes(c)),
      categoricalColumns: p.categoricalColumns.filter((c) => !highMissing.includes(c)),
      dropColumns: Array.from(new Set([...p.dropColumns, ...highMissing])),
    }));
    appendCliLog('system', `[Data Surgery] Đã drop ${highMissing.length} cột >50% NaN: [${highMissing.join(', ')}]`);
  };

  const handleDropLeakageCols = () => {
    if (!dataProfile) return;
    const leaky = dataProfile.columns
      .filter(
        (c) =>
          c.name !== config.targetColumn &&
          c.target_corr !== undefined &&
          Math.abs(c.target_corr) >= 0.95
      )
      .map((c) => c.name);
    if (leaky.length === 0) {
      appendCliLog('system', '[Data Surgery] Không phát hiện cột có |corr| >= 0.95 với Target.');
      return;
    }
    setConfig((p) => ({
      ...p,
      numericColumns: p.numericColumns.filter((c) => !leaky.includes(c)),
      categoricalColumns: p.categoricalColumns.filter((c) => !leaky.includes(c)),
      dropColumns: Array.from(new Set([...p.dropColumns, ...leaky])),
    }));
    appendCliLog('system', `[Data Surgery] Đã drop ${leaky.length} cột nghi Leakage: [${leaky.join(', ')}]`);
  };

  const handleInsertDatetimeCell = () => {
    const code = [
      '# [Feature Engineering] Auto-extract Year, Month, DayOfWeek from datetime-like columns',
      'import pandas as pd',
      '_date_cols = []',
      'for _col in df.select_dtypes(include=["object", "string"]).columns:',
      '    if _col == TARGET_COL: continue',
      '    _parsed = pd.to_datetime(df[_col], errors="coerce")',
      '    if _parsed.notna().mean() > 0.7:',
      '        df[f"{_col}_year"] = _parsed.dt.year',
      '        df[f"{_col}_month"] = _parsed.dt.month',
      '        df[f"{_col}_dayofweek"] = _parsed.dt.dayofweek',
      '        _date_cols.append(_col)',
      'print(f"Extracted datetime features from: {_date_cols}" if _date_cols else "No datetime string columns detected.")',
    ].join('\n');
    handleInsertAiCell('Tách đặc trưng Datetime (Year/Month/DayOfWeek)', code);
  };

  const handleInstallPackage = (pkg: string) => {
    const clean = pkg.replace(/[^a-zA-Z0-9_.\-\s]/g, '').trim();
    if (!clean) return;
    if (runtimeMode === 'cloud') {
      handleRunQuickCommand(`!pip install -q ${clean}`);
    } else {
      handleRunQuickCommand(
        `import micropip; await micropip.install(${JSON.stringify(clean.split(/\s+/))}); print("Installed: ${clean}")`
      );
    }
  };

  const handleExportHtmlReport = () => {
    exportStandaloneHtmlReport(
      projectName,
      config,
      dataProfile,
      experiments,
      cells
    );
    appendCliLog('system', `Exported standalone report: ${projectName}_report.html`);
  };

  const commandPaletteActions: CommandPaletteAction[] = [
    {
      id: 'run-all',
      label: 'Run all cells',
      category: 'Run',
      shortcut: 'All',
      onSelect: handleRunAllCells,
    },
    {
      id: 'run-arena',
      label: 'Run Model Arena (Chạy đua Top 5 thuật toán)',
      category: 'Run',
      onSelect: handleRunModelArena,
    },
    {
      id: 'auto-opt',
      label: 'Smart Auto-Optimize (Chọn cấu hình điểm cao nhất)',
      category: 'Auto',
      onSelect: handleAutoOptimize,
    },
    {
      id: 'open-ai',
      label: 'Mở AMLICS Plugin AI (Multi-Key BYOK)',
      category: 'AI',
      onSelect: () => setIsAiModalOpen(true),
    },
    {
      id: 'new-nb',
      label: 'Tạo Notebook mới',
      category: 'File',
      onSelect: handleCreateWorkspace,
    },
    {
      id: 'export-html',
      label: 'Export Standalone HTML Report (.html)',
      category: 'Export',
      onSelect: handleExportHtmlReport,
    },
    {
      id: 'export-ipynb',
      label: 'Export Jupyter Notebook (.ipynb)',
      category: 'Export',
      onSelect: () => exportPipelineToIpynb(projectName, config, cells),
    },
    {
      id: 'tab-lb',
      label: 'Mở tab Leaderboard',
      category: 'View',
      onSelect: () => {
        setShowRightPanel(true);
        setRightTabOverride('leaderboard');
      },
    },
    {
      id: 'tab-data',
      label: 'Mở tab Data Explorer & Warnings',
      category: 'View',
      onSelect: () => {
        setShowRightPanel(true);
        setRightTabOverride('data');
      },
    },
    {
      id: 'tab-predict',
      label: 'Mở tab Try / Predict & Batch CSV',
      category: 'View',
      onSelect: () => {
        setShowRightPanel(true);
        setRightTabOverride('predict');
      },
    },
  ];

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
        showLeftPanel={viewportMode === 'mobile' ? mobileTab === 'config' : showLeftPanel}
        showRightPanel={viewportMode === 'mobile' ? mobileTab === 'results' : showRightPanel}
        onToggleLeftPanel={handleToggleLeftPanel}
        onToggleRightPanel={handleToggleRightPanel}
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
        onRunModelArena={handleRunModelArena}
        onExportHtmlReport={handleExportHtmlReport}
        onOpenCommandPalette={() => setIsCmdPaletteOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Compact (half-screen / tablet) backdrop when an overlay drawer is open */}
        {viewportMode === 'compact' && (showLeftPanel || showRightPanel) && (
          <div
            onClick={() => {
              setShowLeftPanel(false);
              setShowRightPanel(false);
            }}
            className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[1px]"
          />
        )}

        {/* Left Pipeline Configuration: full-width on mobile tab, slide-over drawer on compact, docked on desktop */}
        {((viewportMode === 'mobile' && mobileTab === 'config') ||
          (viewportMode !== 'mobile' && showLeftPanel)) && (
          <div
            className={
              viewportMode === 'mobile'
                ? 'w-full h-full overflow-hidden'
                : viewportMode === 'compact'
                ? 'absolute inset-y-0 left-0 z-40 w-[320px] max-w-[85vw] h-full overflow-hidden shadow-2xl border-r border-[#3c4043] bg-[#202124]'
                : 'w-[300px] xl:w-[320px] shrink-0 h-full overflow-hidden'
            }
          >
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

        {/* Center Notebook Pane: full-width on mobile tab, always 100% flex-1 on compact & desktop */}
        {(viewportMode !== 'mobile' || mobileTab === 'notebook') && (
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
              onDeleteCells={handleDeleteCells}
              onApplyTemplate={handleApplyTemplate}
              onInsertQuickSnippet={handleInsertQuickSnippet}
              onDropCsvFile={processTrainCsvFile}
            />
          </div>
        )}

        {/* Right Studio Pane: full-width on mobile tab, slide-over drawer on compact, docked on desktop */}
        {((viewportMode === 'mobile' && mobileTab === 'results') ||
          (viewportMode !== 'mobile' && showRightPanel)) && (
          <div
            className={
              viewportMode === 'mobile'
                ? 'w-full h-full overflow-hidden'
                : viewportMode === 'compact'
                ? 'absolute inset-y-0 right-0 z-40 w-[370px] max-w-[90vw] h-full overflow-hidden shadow-2xl border-l border-[#3c4043] bg-[#202124]'
                : 'w-[350px] xl:w-[390px] shrink-0 h-full overflow-hidden'
            }
          >
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
              onBatchPredictCsv={handleBatchPredictCsv}
              batchPredictLoading={batchPredictLoading}
              batchPredictMessage={batchPredictMessage}
              onDropHighMissing={handleDropHighMissing}
              onDropLeakageCols={handleDropLeakageCols}
              onInsertDatetimeCell={handleInsertDatetimeCell}
              onInstallPackage={handleInstallPackage}
              onRunTournament={handleRunModelTournament}
              isTournamentRunning={isTournamentRunning}
              onStopTournament={handleStopExecution}
              onApplyQuickFix={handleApplyQuickFix}
              externalTab={rightTabOverride}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Tab Switcher (< 768px) */}
      <nav className="md:hidden h-12 bg-[#202124] border-t border-[#3c4043] grid grid-cols-3 shrink-0 select-none z-30">
        <button
          type="button"
          onClick={() => setMobileTab('config')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            mobileTab === 'config'
              ? 'text-[#8ab4f8] bg-[#292a2d]/60 border-t-2 border-[#8ab4f8]'
              : 'text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          <span>Cấu hình</span>
          <span className="text-[9px] font-mono opacity-80 truncate max-w-[90px]">
            {dataProfile ? dataProfile.dataset_name : 'Dataset & Model'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('notebook')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            mobileTab === 'notebook'
              ? 'text-[#8ab4f8] bg-[#292a2d]/60 border-t-2 border-[#8ab4f8]'
              : 'text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          <span>Notebook</span>
          <span className="text-[9px] font-mono opacity-80">
            {cells.length} cells
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('results')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            mobileTab === 'results'
              ? 'text-[#8ab4f8] bg-[#292a2d]/60 border-t-2 border-[#8ab4f8]'
              : 'text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          <span>Kết quả ({experiments.length})</span>
          <span className="text-[9px] font-mono opacity-80">
            Leaderboard &amp; Plots
          </span>
        </button>
      </nav>

      {/* Bottom Status Bar (tablet/desktop) */}
      <footer className="hidden md:flex h-6 px-3 bg-[#202124] border-t border-[#3c4043] items-center justify-between text-[11px] text-[#9aa0a6] select-none shrink-0 font-mono">
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
        activeCell={(() => {
          const found = cells.find((c) => c.id === activeCellId);
          return found ? { id: found.id, title: found.title, code: found.currentCode } : null;
        })()}
        onApplyAiOptimization={handleApplyAiOptimization}
        onInsertAiCell={handleInsertAiCell}
        onReplaceCellCode={handleEditCellCode}
      />

      <CommandPaletteModal
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        actions={commandPaletteActions}
      />
    </div>
  );
}

export default App;
