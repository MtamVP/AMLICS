import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  DataProfile,
  ExperimentRecord,
  HardwareInfo,
  NotebookCell,
  PipelineConfig,
  RuntimeIntrospection,
  SupabaseCredentials,
} from '../types/studio';

const STORAGE_CREDS_KEY = 'automl_studio_supabase_creds_v1';
const STORAGE_SESSION_KEY = 'automl_studio_session_id_v1';
const STORAGE_SECRET_KEY = 'automl_studio_worker_secret_v1';

const DEFAULT_SUPABASE_URL = 'https://wymxwsxqbsbtlficvdaf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_wffYh8Oma94f6qwRR59PSw_63GzH0oc';

export function getOrInitSessionId(): string {
  let sid = localStorage.getItem(STORAGE_SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
    localStorage.setItem(STORAGE_SESSION_KEY, sid);
  }
  return sid;
}

export function getOrInitWorkerSecret(): string {
  let sec = localStorage.getItem(STORAGE_SECRET_KEY);
  if (!sec) {
    const arr = new Uint8Array(18);
    crypto.getRandomValues(arr);
    sec = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(STORAGE_SECRET_KEY, sec);
  }
  return sec;
}

export function regenerateSessionId(): string {
  const sid = crypto.randomUUID();
  localStorage.setItem(STORAGE_SESSION_KEY, sid);
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  const sec = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(STORAGE_SECRET_KEY, sec);
  return sid;
}

export function getStoredSupabaseCredentials(): SupabaseCredentials {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  try {
    const raw = localStorage.getItem(STORAGE_CREDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
      };
    }
  } catch {
    // ignore
  }
  return { url: envUrl, anonKey: envKey };
}

export function saveSupabaseCredentials(creds: SupabaseCredentials): void {
  localStorage.setItem(
    STORAGE_CREDS_KEY,
    JSON.stringify({
      url: creds.url.trim().replace(/\/$/, ''),
      anonKey: creds.anonKey.trim(),
    })
  );
}

export interface CloudBroadcastCallbacks {
  onLogChunk: (data: {
    cell_id?: string;
    execution_id?: string;
    stream: 'stdout' | 'stderr';
    text: string;
  }) => void;
  onCellResult: (data: {
    cell_id: string;
    execution_id: string;
    status: 'success' | 'error' | 'stopped';
    duration_ms: number;
    stdout_summary?: string;
    html_output?: string;
    figures_base64?: string[];
    experiment_record?: Record<string, unknown> | null;
    runtime_introspection?: RuntimeIntrospection | null;
    has_submission_csv?: boolean;
    runtime_info?: HardwareInfo;
  }) => void;
  onDataProfile: (profile: DataProfile) => void;
  onHeartbeat: (data: {
    session_id: string;
    status: 'idle' | 'busy';
    runtime_info: HardwareInfo;
    namespace_vars: string[];
    ts: number;
  }) => void;
  onSubmissionCsv?: (content: string) => void;
  onChannelStatus: (connected: boolean, message: string) => void;
}

export class SupabaseCloudBroker {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private sessionId: string;
  private workerSecret: string;
  private creds: SupabaseCredentials;
  private callbacks: CloudBroadcastCallbacks;

  constructor(
    sessionId: string,
    creds: SupabaseCredentials,
    callbacks: CloudBroadcastCallbacks
  ) {
    this.sessionId = sessionId;
    this.workerSecret = getOrInitWorkerSecret();
    this.creds = creds;
    this.callbacks = callbacks;
  }

  public isConfigured(): boolean {
    return Boolean(this.creds.url && this.creds.anonKey);
  }

  public connect(): void {
    this.disconnect();
    if (!this.isConfigured()) {
      this.callbacks.onChannelStatus(
        false,
        'Supabase URL & Key not configured'
      );
      return;
    }

    try {
      this.client = createClient(this.creds.url, this.creds.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      });

      this.channel = this.client.channel(`session:${this.sessionId}`, {
        config: {
          broadcast: { self: false, ack: false },
        },
      });

      this.channel
        .on('broadcast', { event: 'log_chunk' }, ({ payload }) => {
          if (payload) this.callbacks.onLogChunk(payload);
        })
        .on('broadcast', { event: 'cell_result' }, ({ payload }) => {
          if (payload) this.callbacks.onCellResult(payload);
        })
        .on('broadcast', { event: 'data_profile' }, ({ payload }) => {
          if (payload) this.callbacks.onDataProfile(payload as DataProfile);
        })
        .on('broadcast', { event: 'heartbeat' }, ({ payload }) => {
          if (payload) this.callbacks.onHeartbeat(payload);
        })
        .on('broadcast', { event: 'submission_csv_content' }, ({ payload }) => {
          if (payload?.content && this.callbacks.onSubmissionCsv) {
            this.callbacks.onSubmissionCsv(String(payload.content));
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.callbacks.onChannelStatus(
              true,
              `Subscribed to session:${this.sessionId.slice(0, 8)}`
            );
            this.sendPing();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.callbacks.onChannelStatus(
              false,
              `Realtime error (${status})`
            );
          }
        });
    } catch (err) {
      this.callbacks.onChannelStatus(
        false,
        `Supabase connection error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  public disconnect(): void {
    if (this.channel && this.client) {
      this.client.removeChannel(this.channel);
    }
    this.channel = null;
  }

  public async sendRunCell(cell: NotebookCell): Promise<string> {
    const executionId = `exec_${Date.now()}`;
    if (!this.channel) {
      throw new Error('Supabase Realtime channel is not connected.');
    }
    await this.channel.send({
      type: 'broadcast',
      event: 'run_cell',
      payload: {
        session_id: this.sessionId,
        auth_token: this.workerSecret,
        cell_id: cell.id,
        execution_id: executionId,
        step_type: cell.stepType,
        code: cell.currentCode,
      },
    });
    return executionId;
  }

  public async sendStopCell(executionId?: string): Promise<void> {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'stop_cell',
      payload: {
        session_id: this.sessionId,
        auth_token: this.workerSecret,
        execution_id: executionId || 'current',
        reason: 'user_interrupt',
      },
    });
  }

  public async requestSubmissionDownload(): Promise<void> {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'download_submission',
      payload: {
        session_id: this.sessionId,
        auth_token: this.workerSecret,
      },
    });
  }

  public async sendUploadCsv(
    filename: string,
    content: string,
    isTestFile = false,
    alsoCacheAsUrl = false
  ): Promise<void> {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'upload_csv',
      payload: {
        session_id: this.sessionId,
        auth_token: this.workerSecret,
        filename,
        content,
        is_test_file: isTestFile,
        also_cache_as_url: alsoCacheAsUrl,
      },
    });
  }

  public async sendPing(): Promise<void> {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'ping_worker',
      payload: {
        session_id: this.sessionId,
        ts: Date.now(),
      },
    });
  }

  public async uploadCsvToStorage(file: File): Promise<string | null> {
    if (!this.client) return null;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${this.sessionId}/${Date.now()}_${safeName}`;
      const { error } = await this.client.storage
        .from('datasets')
        .upload(storagePath, file, { upsert: true });
      if (error) return null;
      const { data } = this.client.storage
        .from('datasets')
        .getPublicUrl(storagePath);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  public async persistStateToDb(
    config: PipelineConfig,
    cells: NotebookCell[],
    dataProfile: DataProfile | null
  ): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('sessions').upsert({
        id: this.sessionId,
        ui_pipeline_config: config,
        data_profile: dataProfile,
        updated_at: new Date().toISOString(),
      });

      const cellRows = cells.map((c, idx) => ({
        session_id: this.sessionId,
        cell_order: idx + 1,
        cell_type: c.cellType,
        step_type: c.stepType,
        title: c.title,
        generated_code: c.generatedCode,
        current_code: c.currentCode,
        is_locked: c.isLocked,
        last_status: c.status,
        last_output_text: c.outputText.slice(-8000),
        last_duration_ms: c.durationMs || 0,
        updated_at: new Date().toISOString(),
      }));

      await this.client
        .from('cells')
        .upsert(cellRows, { onConflict: 'session_id,cell_order' });
    } catch {
      // ignore if schema not applied
    }
  }

  public async persistExperimentToDb(exp: ExperimentRecord): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('experiments').insert({
        id: exp.id,
        session_id: this.sessionId,
        run_number: exp.runNumber,
        dataset_name: exp.datasetName,
        target_column: exp.targetColumn,
        model_name: exp.modelName,
        task_type: exp.taskType,
        runtime_used: exp.runtimeUsed,
        hyperparameters: exp.hyperparameters,
        preprocessing_summary: exp.preprocessingSummary,
        metrics: exp.metrics,
        plots: { figures: exp.figures, roc_curve: exp.rocCurve, cm: exp.confusionMatrix },
        feature_importance: exp.featureImportance,
        code_snapshot: exp.codeSnapshot,
        duration_ms: exp.durationMs,
      });
    } catch {
      // ignore
    }
  }
}

export function generateOneClickColabScript(
  sessionId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): string {
  const urlVal = supabaseUrl || DEFAULT_SUPABASE_URL;
  const keyVal = supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;
  const workerSecret = getOrInitWorkerSecret();

  return `# ==============================================================================
# AMLICS — Remote Cloud Worker (Google Colab / Kaggle)
# Run this cell once, then control execution directly from the AMLICS Web Studio.
# ==============================================================================
!pip install -q websockets requests psutil nest_asyncio lightgbm xgboost catboost scikit-learn pandas matplotlib

import ast, asyncio, base64, ctypes, io, json, os, platform, queue, sys, threading, time, traceback
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import psutil, requests, websockets, nest_asyncio
nest_asyncio.apply()

SUPABASE_URL = "${urlVal}"
SUPABASE_ANON_KEY = "${keyVal}"
SESSION_ID = "${sessionId}"
WORKER_SECRET = "${workerSecret}"

def discover_local_datasets():
    found = []
    for root_dir in ["/kaggle/input", "/content"]:
        if os.path.exists(root_dir):
            for r, _, files in os.walk(root_dir):
                for f in files:
                    if f.lower().endswith((".csv", ".parquet", ".tsv")):
                        found.append(os.path.join(r, f))
                        if len(found) >= 25: break
    return found

def detect_hw():
    env = "Google Colab" if os.path.exists("/content") else ("Kaggle" if os.path.exists("/kaggle") else "Cloud Python")
    gpu = "CPU"
    try:
        import subprocess
        out = subprocess.check_output(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], stderr=subprocess.DEVNULL, timeout=2).decode().strip()
        if out: gpu = out.split("\\n")[0]
    except Exception: pass
    vm = psutil.virtual_memory()
    return {"platform": env, "gpu": gpu, "ram_used_gb": round((vm.total - vm.available)/(1024**3), 2), "ram_total_gb": round(vm.total/(1024**3), 2), "available_files": discover_local_datasets()}

def is_id_col(name):
    c = str(name).strip().lower()
    return c in ("id", "index", "uuid", "row_id", "passengerid", "customerid", "loan_id", "user_id") or c.endswith("_id") or c.startswith("id_")

def extract_profile(df, name="Cloud_Dataset.csv"):
    cols, warnings_list = [], []
    n = max(len(df), 1)
    dup_rows = int(df.duplicated().sum()) if len(df) <= 250000 else 0
    for idx, c in enumerate(df.columns):
        s = df[c]
        miss = round(float(s.isna().sum()) / n * 100.0, 2)
        nu = int(s.nunique(dropna=True))
        is_const = (nu <= 1 and len(df) > 1)
        is_likely_target = (idx == len(df.columns) - 1 and nu <= 20)
        is_id = (not is_likely_target) and ((is_id_col(c) and nu > 10) or (len(df) >= 20 and pd.api.types.is_integer_dtype(s) and (nu / n) >= 0.95) or (len(df) >= 20 and not pd.api.types.is_numeric_dtype(s) and (nu / n) >= 0.90))
        if is_const or is_id:
            inf = "id_or_constant"
            warnings_list.append({"level": "warning", "column": str(c), "kind": "id_column" if is_id else "constant_column", "message": f"Column '{c}' detected as {'ID' if is_id else 'constant'} (nunique={nu}) -> Auto-dropped."})
        elif pd.api.types.is_bool_dtype(s): inf = "categorical"
        elif pd.api.types.is_numeric_dtype(s): inf = "binary" if nu <= 2 else ("categorical" if nu <= 12 and pd.api.types.is_integer_dtype(s) else "numeric")
        else: inf = "categorical" if nu <= 50 else "text"
        info = {"name": str(c), "dtype": str(s.dtype), "inferred_type": inf, "missing_pct": miss, "nunique": nu, "is_id_like": is_id, "is_constant": is_const}
        if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            cl = s.dropna()
            if len(cl) > 0: info.update({"mean": round(float(cl.mean()), 4), "std": round(float(cl.std()), 4) if len(cl) > 1 else 0.0, "min": round(float(cl.min()), 4), "max": round(float(cl.max()), 4)})
        cols.append(info)
    return {"dataset_name": name, "shape": [int(df.shape[0]), int(df.shape[1])], "memory_mb": round(float(df.memory_usage(deep=True).sum())/(1024*1024), 2), "duplicate_rows": dup_rows, "columns": cols, "head": json.loads(df.head(5).to_json(orient="records", date_format="iso")), "warnings": warnings_list}

class StreamCapture(io.TextIOBase):
    def __init__(self, q, stream_name, orig):
        self.q, self.stream_name, self.orig, self.buf = q, stream_name, orig, io.StringIO()
    def write(self, s):
        if s:
            self.buf.write(s); self.q.put((self.stream_name, s))
            if self.orig: self.orig.write(s); self.orig.flush()
        return len(s)
    def flush(self):
        if self.orig: self.orig.flush()

def stop_thread(t):
    if t and t.is_alive() and t.ident:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_long(t.ident), ctypes.py_object(KeyboardInterrupt))

log_q, ev_q = queue.Queue(), queue.Queue()
GLOBAL_NS = globals()
GLOBAL_NS.update({"pd": pd, "np": np, "plt": plt, "SESSION_ID": SESSION_ID})
GLOBAL_NS["_emit_data_profile"] = lambda df, name="Cloud_Dataset.csv": ev_q.put(("data_profile", extract_profile(df, name)))
worker_state = {"status": "idle", "thread": None, "exec_id": None, "cell_id": None}
_connected_ev = threading.Event()

def introspect_active_model(ns):
    for _nm in ("full_pipeline", "pipeline", "pipe", "best_model", "search", "model", "clf", "reg", "estimator"):
        _obj = ns.get(_nm)
        if _obj is not None and (hasattr(_obj, "predict") or hasattr(_obj, "best_estimator_")):
            if "full_pipeline" not in ns:
                ns["full_pipeline"] = _obj
            final_est = getattr(_obj, "best_estimator_", _obj)
            if hasattr(final_est, "steps") and getattr(final_est, "steps", None):
                final_est = final_est.steps[-1][1]
            model_class = type(final_est).__name__
            params = {}
            if hasattr(final_est, "get_params"):
                try:
                    for _pk, _pv in final_est.get_params(deep=False).items():
                        if isinstance(_pv, (bool, int, float, str)) or _pv is None:
                            params[str(_pk)] = _pv
                except Exception: pass
            inferred_task = None
            _clow = model_class.lower()
            if hasattr(final_est, "predict_proba") or "classifier" in _clow or "logistic" in _clow or model_class == "SVC":
                inferred_task = "classification"
            elif "regressor" in _clow or "regression" in _clow or model_class in ("Ridge", "Lasso", "ElasticNet", "SVR"):
                inferred_task = "regression"
            res = {"model_class": model_class, "model_name": str(ns.get("ACTIVE_MODEL_NAME") or model_class), "params": params}
            if inferred_task: res["task_type"] = inferred_task
            if isinstance(ns.get("TARGET_COL"), str): res["target_col"] = ns.get("TARGET_COL")
            for _mk in ("cv_mean", "cv_std", "train_score"):
                _mv = ns.get(_mk)
                if isinstance(_mv, (int, float)): res[_mk] = float(_mv)
            return res
    return None

def run_cell_job(payload):
    cid, eid, code = payload.get("cell_id", "cell"), payload.get("execution_id", "exec"), payload.get("code", "")
    worker_state["status"], worker_state["exec_id"], worker_state["cell_id"] = "busy", eid, cid
    GLOBAL_NS["_automl_experiment_result"] = None
    o_out, o_err = sys.stdout, sys.stderr
    c_out, c_err = StreamCapture(log_q, "stdout", o_out), StreamCapture(log_q, "stderr", o_err)
    plt.close("all")
    t0, status, html_out = time.perf_counter(), "success", None
    try:
        sys.stdout, sys.stderr = c_out, c_err
        tree = ast.parse(code, mode="exec")
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            if len(tree.body) > 1:
                exec(compile(ast.Module(body=tree.body[:-1], type_ignores=[]), f"<{cid}>", "exec"), GLOBAL_NS)
            val = eval(compile(ast.Expression(body=tree.body[-1].value), f"<{cid}>", "eval"), GLOBAL_NS)
            if val is not None:
                if isinstance(val, pd.DataFrame): html_out = val.head(15).to_html(border=0)
                elif isinstance(val, pd.Series): html_out = val.head(15).to_frame().to_html(border=0)
                else: print(repr(val))
        else:
            exec(compile(tree, f"<{cid}>", "exec"), GLOBAL_NS)
    except KeyboardInterrupt:
        status = "stopped"; c_err.write("\\nKeyboardInterrupt: Execution stopped by user.\\n")
    except Exception:
        status = "error"; c_err.write(traceback.format_exc() + "\\n")
    finally:
        sys.stdout, sys.stderr = o_out, o_err
    dur = int((time.perf_counter() - t0) * 1000)
    figs = []
    for fnum in plt.get_fignums():
        b = io.BytesIO()
        plt.figure(fnum).savefig(b, format="png", bbox_inches="tight", dpi=120, facecolor="#202124")
        b.seek(0)
        figs.append("data:image/png;base64," + base64.b64encode(b.read()).decode())
    plt.close("all")
    has_sub = os.path.exists("/tmp/submission.csv") or os.path.exists("submission.csv")
    ev_q.put(("cell_result", {"cell_id": cid, "execution_id": eid, "status": status, "duration_ms": dur, "stdout_summary": c_out.buf.getvalue()[-10000:], "html_output": html_out, "figures_base64": figs, "experiment_record": GLOBAL_NS.get("_automl_experiment_result"), "runtime_introspection": introspect_active_model(GLOBAL_NS), "has_submission_csv": has_sub, "namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")], "runtime_info": detect_hw()}))
    worker_state["status"] = "idle"

async def main_daemon(stop_ev):
    host = SUPABASE_URL.rstrip("/").split("://", 1)[-1]
    ws_url = f"wss://{host}/realtime/v1/websocket?apikey={SUPABASE_ANON_KEY}&vsn=1.0.0"
    topic = f"realtime:session:{SESSION_ID}"
    hw = detect_hw()
    print(f"AMLICS Cloud Worker started on {hw['platform']} ({hw['gpu']}, RAM {hw['ram_total_gb']}GB)")
    ref = 1
    while not stop_ev.is_set():
        try:
            async with websockets.connect(ws_url, ping_interval=20, max_size=16*1024*1024) as ws:
                await ws.send(json.dumps({"topic": topic, "event": "phx_join", "payload": {"config": {"broadcast": {"ack": False, "self": False}}}, "ref": "1"}))
                print("CONNECTED TO AMLICS WEB STUDIO! Running in background — you can keep running other Colab cells freely.")
                _connected_ev.set()
                async def bcast(ev, data):
                    nonlocal ref; ref += 1
                    await ws.send(json.dumps({"topic": topic, "event": "broadcast", "payload": {"type": "broadcast", "event": ev, "payload": data}, "ref": str(ref)}))
                await bcast("heartbeat", {"session_id": SESSION_ID, "status": worker_state["status"], "runtime_info": detect_hw(), "namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")], "ts": int(time.time()*1000)})
                last_hb = time.time()
                while not stop_ev.is_set():
                    try:
                        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=0.18))
                        if msg.get("event") == "broadcast":
                            ev = msg["payload"].get("event")
                            pl = msg["payload"].get("payload", {})
                            if ev in ("run_cell", "stop_cell", "download_submission", "upload_csv"):
                                if pl.get("auth_token") != WORKER_SECRET:
                                    print("Rejected unauthorized command (invalid auth_token).")
                                    continue
                            if ev == "run_cell":
                                old_t = worker_state["thread"]
                                if old_t and old_t.is_alive():
                                    stop_thread(old_t)
                                    old_t.join(timeout=1.5)
                                t = threading.Thread(target=run_cell_job, args=(pl,), daemon=True)
                                worker_state["thread"] = t; t.start()
                            elif ev == "stop_cell":
                                stop_thread(worker_state["thread"])
                            elif ev == "upload_csv":
                                fname = os.path.basename(pl.get("filename", "dataset.csv"))
                                content = pl.get("content", "")
                                target_p = os.path.join("/tmp", fname)
                                with open(target_p, "w", encoding="utf-8") as f:
                                    f.write(content)
                                if pl.get("also_cache_as_url"):
                                    with open("/tmp/_cached_url_dataset.csv", "w", encoding="utf-8") as f:
                                        f.write(content)
                                print(f"Synced CSV from Web Studio -> {target_p} ({len(content):,} chars)")
                            elif ev == "download_submission":
                                p = "/tmp/submission.csv" if os.path.exists("/tmp/submission.csv") else "submission.csv"
                                if os.path.exists(p):
                                    with open(p, "r", encoding="utf-8") as f:
                                        await bcast("submission_csv_content", {"content": f.read()})
                            elif ev == "ping_worker":
                                await bcast("heartbeat", {"session_id": SESSION_ID, "status": worker_state["status"], "runtime_info": detect_hw(), "namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")], "ts": int(time.time()*1000)})
                    except asyncio.TimeoutError: pass
                    out_buf, err_buf = [], []
                    while not log_q.empty():
                        st, tx = log_q.get_nowait()
                        (err_buf if st == "stderr" else out_buf).append(tx)
                    if out_buf: await bcast("log_chunk", {"cell_id": worker_state["cell_id"], "execution_id": worker_state["exec_id"], "stream": "stdout", "text": "".join(out_buf)})
                    if err_buf: await bcast("log_chunk", {"cell_id": worker_state["cell_id"], "execution_id": worker_state["exec_id"], "stream": "stderr", "text": "".join(err_buf)})
                    while not ev_q.empty():
                        et, ed = ev_q.get_nowait()
                        await bcast(et, ed)
                    if time.time() - last_hb >= 25:
                        last_hb = time.time()
                        await ws.send(json.dumps({"topic": "phoenix", "event": "heartbeat", "payload": {}, "ref": "hb"}))
                        await bcast("heartbeat", {"session_id": SESSION_ID, "status": worker_state["status"], "runtime_info": detect_hw(), "namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")], "ts": int(last_hb*1000)})
        except KeyboardInterrupt:
            print("Worker stopped."); break
        except Exception as e:
            if stop_ev.is_set():
                break
            print(f"Reconnecting ({e})..."); await asyncio.sleep(3)

if isinstance(globals().get("_amlics_stop_ev"), threading.Event):
    globals()["_amlics_stop_ev"].set()
_amlics_stop_ev = threading.Event()

def _amlics_bg_loop(stop_ev):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(main_daemon(stop_ev))
    finally:
        loop.close()

_connected_ev.clear()
_amlics_worker_thread = threading.Thread(target=_amlics_bg_loop, args=(_amlics_stop_ev,), daemon=True)
_amlics_worker_thread.start()
if not _connected_ev.wait(timeout=8.0):
    print("AMLICS Worker is still connecting in background — check Web Studio status indicator.")
`;
}
