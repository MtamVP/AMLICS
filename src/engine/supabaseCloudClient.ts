import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  DataProfile,
  ExperimentRecord,
  HardwareInfo,
  NotebookCell,
  PipelineConfig,
  SupabaseCredentials,
} from '../types/studio';

const STORAGE_CREDS_KEY = 'automl_studio_supabase_creds_v1';
const STORAGE_SESSION_KEY = 'automl_studio_session_id_v1';

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

export function regenerateSessionId(): string {
  const sid = crypto.randomUUID();
  localStorage.setItem(STORAGE_SESSION_KEY, sid);
  return sid;
}

export function getStoredSupabaseCredentials(): SupabaseCredentials {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
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
    figures_base64?: string[];
    experiment_record?: Record<string, unknown> | null;
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
  onChannelStatus: (connected: boolean, message: string) => void;
}

export class SupabaseCloudBroker {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private sessionId: string;
  private creds: SupabaseCredentials;
  private callbacks: CloudBroadcastCallbacks;

  constructor(
    sessionId: string,
    creds: SupabaseCredentials,
    callbacks: CloudBroadcastCallbacks
  ) {
    this.sessionId = sessionId;
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
        'Chưa cấu hình Supabase URL & Anon Key'
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.callbacks.onChannelStatus(
              true,
              `Đã kết nối kênh Realtime session:${this.sessionId.slice(0, 8)}`
            );
            this.sendPing();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.callbacks.onChannelStatus(
              false,
              `Lỗi kênh Realtime (${status})`
            );
          }
        });
    } catch (err) {
      this.callbacks.onChannelStatus(
        false,
        `Lỗi kết nối Supabase: ${err instanceof Error ? err.message : String(err)}`
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
      throw new Error('Kênh Supabase Realtime chưa được kết nối.');
    }
    await this.channel.send({
      type: 'broadcast',
      event: 'run_cell',
      payload: {
        session_id: this.sessionId,
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
        execution_id: executionId || 'current',
        reason: 'user_interrupt',
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
      // Nếu người dùng chưa tạo bảng SQL mà chỉ dùng Realtime Broadcast thì vẫn chạy mượt mà!
    }
  }

  public async persistExperimentToDb(exp: ExperimentRecord): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.from('experiments').insert({
        id: exp.id,
        session_id: this.sessionId,
        run_number: exp.runNumber,
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
      // Không chặn luồng chính nếu chưa tạo bảng SQL
    }
  }
}

/**
 * Sinh đoạn code 1-Click tự đóng gói (Self-Contained) để người dùng chỉ cần
 * Copy & Paste vào 1 Cell duy nhất trên Google Colab hoặc Kaggle và bấm Run!
 */
export function generateOneClickColabScript(
  sessionId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): string {
  const urlVal = supabaseUrl || 'YOUR_SUPABASE_PROJECT_URL';
  const keyVal = supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY';

  return `# ==============================================================================
# 🚀 AutoML & Interactive Code Studio — 1-CLICK COLAB / KAGGLE CLOUD WORKER
# Hướng dẫn: Chỉ cần bấm Run Cell này 1 lần duy nhất, sau đó thu nhỏ tab Colab/Kaggle
# và thao tác 100% trên giao diện Web App AutoML Studio!
# ==============================================================================
!pip install -q websockets requests psutil nest_asyncio lightgbm xgboost catboost scikit-learn pandas matplotlib

import asyncio, base64, ctypes, io, json, os, platform, queue, sys, threading, time, traceback
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

def detect_hw():
    env = "Google Colab" if os.path.exists("/content") else ("Kaggle Notebooks" if os.path.exists("/kaggle") else "Cloud Python")
    gpu = "CPU Only"
    try:
        import subprocess
        out = subprocess.check_output(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"], stderr=subprocess.DEVNULL, timeout=2).decode().strip()
        if out: gpu = out.split("\\n")[0]
    except Exception: pass
    vm = psutil.virtual_memory()
    return {"platform": env, "gpu": gpu, "ram_used_gb": round((vm.total - vm.available)/(1024**3), 2), "ram_total_gb": round(vm.total/(1024**3), 2)}

def extract_profile(df, name="Cloud_Dataset.csv"):
    cols = []
    n = max(len(df), 1)
    for c in df.columns:
        s = df[c]
        miss = round(float(s.isna().sum()) / n * 100.0, 2)
        nu = int(s.nunique(dropna=True))
        inf = "categorical" if pd.api.types.is_bool_dtype(s) else (("binary" if nu <= 2 else ("categorical" if nu <= 15 and pd.api.types.is_integer_dtype(s) else "numeric")) if pd.api.types.is_numeric_dtype(s) else ("categorical" if nu <= 50 else "text_or_id"))
        info = {"name": str(c), "dtype": str(s.dtype), "inferred_type": inf, "missing_pct": miss, "nunique": nu}
        if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            cl = s.dropna()
            if len(cl) > 0:
                info.update({"mean": round(float(cl.mean()), 4), "std": round(float(cl.std()), 4) if len(cl) > 1 else 0.0, "min": round(float(cl.min()), 4), "max": round(float(cl.max()), 4)})
        cols.append(info)
    return {"dataset_name": name, "shape": [int(df.shape[0]), int(df.shape[1])], "memory_mb": round(float(df.memory_usage(deep=True).sum())/(1024*1024), 2), "columns": cols, "head": json.loads(df.head(5).to_json(orient="records", date_format="iso"))}

class StreamCapture(io.TextIOBase):
    def __init__(self, q, stream_name, orig):
        self.q, self.stream_name, self.orig, self.buf = q, stream_name, orig, io.StringIO()
    def write(self, s):
        if s:
            self.buf.write(s)
            self.q.put((self.stream_name, s))
            if self.orig: self.orig.write(s); self.orig.flush()
        return len(s)
    def flush(self):
        if self.orig: self.orig.flush()

def stop_thread(t):
    if t and t.is_alive() and t.ident:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_long(t.ident), ctypes.py_object(KeyboardInterrupt))

log_q, ev_q = queue.Queue(), queue.Queue()
GLOBAL_NS = {"__name__": "__main__", "pd": pd, "np": np, "plt": plt, "SESSION_ID": SESSION_ID}
GLOBAL_NS["_emit_data_profile"] = lambda df, name="Cloud_Dataset.csv": ev_q.put(("data_profile", extract_profile(df, name)))
worker_state = {"status": "idle", "thread": None, "exec_id": None}

def run_cell_job(payload):
    cid, eid, code = payload.get("cell_id", "cell"), payload.get("execution_id", "exec"), payload.get("code", "")
    worker_state["status"], worker_state["exec_id"] = "busy", eid
    GLOBAL_NS["_automl_experiment_result"] = None
    o_out, o_err = sys.stdout, sys.stderr
    c_out, c_err = StreamCapture(log_q, "stdout", o_out), StreamCapture(log_q, "stderr", o_err)
    plt.close("all")
    t0, status = time.perf_counter(), "success"
    try:
        sys.stdout, sys.stderr = c_out, c_err
        exec(compile(code, f"<{cid}>", "exec"), GLOBAL_NS)
    except KeyboardInterrupt:
        status = "stopped"; c_err.write("\\n[Stopped] Đã dừng thực thi Cell theo yêu cầu.\\n")
    except Exception:
        status = "error"; c_err.write(traceback.format_exc() + "\\n")
    finally:
        sys.stdout, sys.stderr = o_out, o_err
    dur = int((time.perf_counter() - t0) * 1000)
    figs = []
    for fnum in plt.get_fignums():
        b = io.BytesIO()
        plt.figure(fnum).savefig(b, format="png", bbox_inches="tight", dpi=125, facecolor="#0f172a")
        b.seek(0)
        figs.append("data:image/png;base64," + base64.b64encode(b.read()).decode())
    plt.close("all")
    ev_q.put(("cell_result", {"cell_id": cid, "execution_id": eid, "status": status, "duration_ms": dur, "stdout_summary": c_out.buf.getvalue()[-10000:], "figures_base64": figs, "experiment_record": GLOBAL_NS.get("_automl_experiment_result"), "runtime_info": detect_hw()}))
    worker_state["status"] = "idle"

async def main_daemon():
    host = SUPABASE_URL.rstrip("/").split("://", 1)[-1]
    ws_url = f"wss://{host}/realtime/v1/websocket?apikey={SUPABASE_ANON_KEY}&vsn=1.0.0"
    topic = f"realtime:session:{SESSION_ID}"
    hw = detect_hw()
    print(f"✅ Khởi chạy AutoML Cloud Worker trên {hw['platform']} ({hw['gpu']}, RAM {hw['ram_total_gb']}GB) | Session: {SESSION_ID}")
    ref = 1
    while True:
        try:
            async with websockets.connect(ws_url, ping_interval=20, max_size=16*1024*1024) as ws:
                await ws.send(json.dumps({"topic": topic, "event": "phx_join", "payload": {"config": {"broadcast": {"ack": False, "self": False}}}, "ref": "1"}))
                print("🟢 ĐÃ KẾT NỐI REALTIME VỚI WEB APP! Bạn có thể thu nhỏ tab này lại.")
                async def bcast(ev, data):
                    nonlocal ref; ref += 1
                    await ws.send(json.dumps({"topic": topic, "event": "broadcast", "payload": {"type": "broadcast", "event": ev, "payload": data}, "ref": str(ref)}))
                await bcast("heartbeat", {"session_id": SESSION_ID, "status": worker_state["status"], "runtime_info": detect_hw(), "namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")], "ts": int(time.time()*1000)})
                last_hb = time.time()
                while True:
                    try:
                        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=0.18))
                        if msg.get("event") == "broadcast":
                            ev = msg["payload"].get("event")
                            pl = msg["payload"].get("payload", {})
                            if ev == "run_cell":
                                stop_thread(worker_state["thread"])
                                t = threading.Thread(target=run_cell_job, args=(pl,), daemon=True)
                                worker_state["thread"] = t; t.start()
                            elif ev == "stop_cell":
                                stop_thread(worker_state["thread"])
                            elif ev == "ping_worker":
                                await bcast("heartbeat", {"session_id": SESSION_ID, "status": worker_state["status"], "runtime_info": detect_hw(), "namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")], "ts": int(time.time()*1000)})
                    except asyncio.TimeoutError: pass
                    out_buf, err_buf = [], []
                    while not log_q.empty():
                        st, tx = log_q.get_nowait()
                        (err_buf if st == "stderr" else out_buf).append(tx)
                    if out_buf: await bcast("log_chunk", {"execution_id": worker_state["exec_id"], "stream": "stdout", "text": "".join(out_buf)})
                    if err_buf: await bcast("log_chunk", {"execution_id": worker_state["exec_id"], "stream": "stderr", "text": "".join(err_buf)})
                    while not ev_q.empty():
                        et, ed = ev_q.get_nowait()
                        await bcast(et, ed)
                    if time.time() - last_hb >= 25:
                        last_hb = time.time()
                        await ws.send(json.dumps({"topic": "phoenix", "event": "heartbeat", "payload": {}, "ref": "hb"}))
                        await bcast("heartbeat", {"session_id": SESSION_ID, "status": worker_state["status"], "runtime_info": detect_hw(), "namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")], "ts": int(last_hb*1000)})
        except KeyboardInterrupt:
            print("⏹ Đã dừng Cloud Worker."); break
        except Exception as e:
            print(f"Đang kết nối lại ({e})..."); await asyncio.sleep(3)

asyncio.get_event_loop().run_until_complete(main_daemon())
`;
}
