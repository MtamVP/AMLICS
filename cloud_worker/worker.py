#!/usr/bin/env python3
"""
AutoML & Interactive Code Studio — Remote Cloud Runtime Daemon (Colab / Kaggle)
================================================================================
- Giữ `global_namespace` xuyên suốt giữa các Cell (df, X_train, pipeline, model...)
- Stream stdout/stderr mỗi 500ms qua Supabase Realtime Broadcast (không nghẽn DB)
- Hỗ trợ Interrupt / Stop Cell khẩn cấp qua `PyThreadState_SetAsyncExc`
- Tự động trích xuất `data_profile` (schema, % missing, nunique, head(5)) khi biến `df` thay đổi
- Tự động chụp biểu đồ Matplotlib (Base64 PNG) & kết quả thực nghiệm (`_automl_experiment_result`)
- Gửi Heartbeat mỗi 30 giây giữ kết nối Colab/Kaggle sống liên tục
"""

import asyncio
import base64
import ctypes
import io
import json
import os
import platform
import queue
import sys
import threading
import time
import traceback
from typing import Any, Dict, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import psutil
import requests
import websockets


def detect_hardware_info() -> Dict[str, Any]:
    env_name = "Local Python"
    if "COLAB_GPU" in os.environ or os.path.exists("/content"):
        env_name = "Google Colab"
    elif "KAGGLE_KERNEL_RUN_TYPE" in os.environ or os.path.exists("/kaggle"):
        env_name = "Kaggle Notebooks"

    gpu_name = "CPU Only"
    try:
        import subprocess
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            stderr=subprocess.DEVNULL,
            timeout=2,
        ).decode("utf-8").strip()
        if out:
            gpu_name = out.split("\n")[0]
    except Exception:
        pass

    vm = psutil.virtual_memory()
    return {
        "platform": env_name,
        "gpu": gpu_name,
        "ram_used_gb": round((vm.total - vm.available) / (1024 ** 3), 2),
        "ram_total_gb": round(vm.total / (1024 ** 3), 2),
        "python": platform.python_version(),
    }


def extract_data_profile(df: pd.DataFrame, dataset_name: str = "DataFrame") -> Dict[str, Any]:
    """Trích xuất gói JSON nhẹ chứa thông tin cột, kiểu dữ liệu, % missing, nunique và 5 dòng đầu."""
    cols_info = []
    n_rows = max(len(df), 1)
    for col in df.columns:
        s = df[col]
        dtype_str = str(s.dtype)
        missing_count = int(s.isna().sum())
        missing_pct = round((missing_count / n_rows) * 100.0, 2)
        nunique = int(s.nunique(dropna=True))

        if pd.api.types.is_bool_dtype(s):
            inferred = "categorical"
        elif pd.api.types.is_numeric_dtype(s):
            if nunique <= 2:
                inferred = "binary"
            elif nunique <= 15 and pd.api.types.is_integer_dtype(s):
                inferred = "categorical"
            else:
                inferred = "numeric"
        else:
            inferred = "categorical" if nunique <= 50 else "text_or_id"

        col_entry: Dict[str, Any] = {
            "name": str(col),
            "dtype": dtype_str,
            "inferred_type": inferred,
            "missing_pct": missing_pct,
            "nunique": nunique,
        }
        if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            clean = s.dropna()
            if len(clean) > 0:
                col_entry["mean"] = round(float(clean.mean()), 4)
                col_entry["std"] = round(float(clean.std()), 4) if len(clean) > 1 else 0.0
                col_entry["min"] = round(float(clean.min()), 4)
                col_entry["max"] = round(float(clean.max()), 4)
        else:
            top_vals = s.dropna().astype(str).value_counts().head(4).to_dict()
            col_entry["top_values"] = {str(k): int(v) for k, v in top_vals.items()}

        cols_info.append(col_entry)

    head_records = json.loads(df.head(5).to_json(orient="records", date_format="iso"))
    mem_mb = round(float(df.memory_usage(deep=True).sum()) / (1024 * 1024), 2)

    return {
        "dataset_name": dataset_name,
        "shape": [int(df.shape[0]), int(df.shape[1])],
        "memory_mb": mem_mb,
        "columns": cols_info,
        "head": head_records,
    }


class StreamQueueWriter(io.TextIOBase):
    """Bắt stdout/stderr trong lúc chạy Cell để gom chunk mỗi 500ms."""

    def __init__(self, log_queue: "queue.Queue[tuple[str, str]]", stream_name: str, orig_stream: Any):
        self.log_queue = log_queue
        self.stream_name = stream_name
        self.orig_stream = orig_stream
        self.full_buffer = io.StringIO()

    def write(self, s: str) -> int:
        if s:
            self.full_buffer.write(s)
            self.log_queue.put((self.stream_name, s))
            if self.orig_stream:
                try:
                    self.orig_stream.write(s)
                    self.orig_stream.flush()
                except Exception:
                    pass
        return len(s)

    def flush(self) -> None:
        if self.orig_stream:
            try:
                self.orig_stream.flush()
            except Exception:
                pass


def terminate_thread(thread: threading.Thread) -> bool:
    """Ngắt khẩn cấp luồng đang chạy Cell bằng cách ném KeyboardInterrupt vào C-level thread state."""
    if not thread.is_alive() or thread.ident is None:
        return False
    tid = ctypes.c_long(thread.ident)
    res = ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, ctypes.py_object(KeyboardInterrupt))
    if res == 0:
        return False
    elif res > 1:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(tid, None)
        return False
    return True


class AutoMLCloudWorker:
    def __init__(self, supabase_url: str, supabase_anon_key: str, session_id: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_anon_key.strip()
        self.session_id = session_id.strip()
        self.topic = f"realtime:session:{self.session_id}"

        ws_scheme = "wss" if self.supabase_url.startswith("https") else "ws"
        host_part = self.supabase_url.split("://", 1)[-1]
        self.ws_url = f"{ws_scheme}://{host_part}/realtime/v1/websocket?apikey={self.supabase_key}&vsn=1.0.0"

        self.global_namespace: Dict[str, Any] = {
            "__name__": "__main__",
            "pd": pd,
            "np": np,
            "plt": plt,
            "SESSION_ID": self.session_id,
        }
        self.status = "idle"
        self.current_thread: Optional[threading.Thread] = None
        self.current_execution_id: Optional[str] = None
        self.log_queue: "queue.Queue[tuple[str, str]]" = queue.Queue()
        self.out_event_queue: "queue.Queue[tuple[str, Dict[str, Any]]]" = queue.Queue()
        self._last_df_signature: Optional[str] = None
        self._msg_ref = 10

        # Cài sẵn hàm helper vào global_namespace để code trong Cell có thể gọi trực tiếp
        self.global_namespace["_emit_data_profile"] = self._helper_emit_profile
        self.global_namespace["_register_experiment"] = self._helper_register_experiment

    def _helper_emit_profile(self, df: pd.DataFrame, name: str = "Cloud_Dataset.csv") -> Dict[str, Any]:
        profile = extract_data_profile(df, name)
        self.out_event_queue.put(("data_profile", profile))
        self._persist_session_update({"data_profile": profile, "dataset_name": name})
        return profile

    def _helper_register_experiment(self, exp_data: Dict[str, Any]) -> None:
        self.global_namespace["_automl_experiment_result"] = exp_data

    def _persist_session_update(self, patch: Dict[str, Any]) -> None:
        """Đồng bộ trạng thái lên bảng PostgreSQL `sessions` (nếu có)."""
        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            }
            patch["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            requests.patch(
                f"{self.supabase_url}/rest/v1/sessions?id=eq.{self.session_id}",
                headers=headers,
                json=patch,
                timeout=4,
            )
        except Exception:
            pass

    def _execute_cell_in_thread(self, payload: Dict[str, Any]) -> None:
        cell_id = payload.get("cell_id", "unknown")
        execution_id = payload.get("execution_id", f"exec_{int(time.time()*1000)}")
        code = payload.get("code", "")

        self.status = "busy"
        self.current_execution_id = execution_id
        self.global_namespace["_automl_experiment_result"] = None

        orig_stdout, orig_stderr = sys.stdout, sys.stderr
        stdout_capture = StreamQueueWriter(self.log_queue, "stdout", orig_stdout)
        stderr_capture = StreamQueueWriter(self.log_queue, "stderr", orig_stderr)

        plt.close("all")
        start_t = time.perf_counter()
        exec_status = "success"
        error_msg = None

        try:
            sys.stdout = stdout_capture
            sys.stderr = stderr_capture
            compiled = compile(code, f"<Cell {cell_id}>", "exec")
            exec(compiled, self.global_namespace)
        except KeyboardInterrupt:
            exec_status = "stopped"
            error_msg = "\n[Interrupted] Thực thi Cell đã bị dừng bởi người dùng (Stop Cell)."
            stderr_capture.write(error_msg + "\n")
        except Exception:
            exec_status = "error"
            error_msg = traceback.format_exc()
            stderr_capture.write(error_msg + "\n")
        finally:
            sys.stdout = orig_stdout
            sys.stderr = orig_stderr

        duration_ms = int((time.perf_counter() - start_t) * 1000)

        # Chụp toàn bộ Matplotlib Figures dưới dạng Base64 PNG
        figures_b64 = []
        for fig_num in plt.get_fignums():
            fig = plt.figure(fig_num)
            buf = io.BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight", dpi=130, facecolor="#0f172a")
            buf.seek(0)
            b64_str = "data:image/png;base64," + base64.b64encode(buf.read()).decode("utf-8")
            figures_b64.append(b64_str)
        plt.close("all")

        # Kiểm tra xem biến `df` trong global_namespace có mới hoặc thay đổi không -> tự gửi data_profile
        maybe_df = self.global_namespace.get("df")
        if isinstance(maybe_df, pd.DataFrame):
            sig = f"{maybe_df.shape}_{list(maybe_df.columns)}"
            if sig != self._last_df_signature:
                self._last_df_signature = sig
                try:
                    ds_name = str(self.global_namespace.get("DATASET_NAME", "Cloud_DataFrame.csv"))
                    profile = extract_data_profile(maybe_df, ds_name)
                    self.out_event_queue.put(("data_profile", profile))
                    self._persist_session_update({"data_profile": profile, "dataset_name": ds_name})
                except Exception:
                    pass

        exp_record = self.global_namespace.get("_automl_experiment_result")
        full_output = stdout_capture.full_buffer.getvalue()
        if error_msg and error_msg not in full_output:
            full_output += "\n" + error_msg

        result_payload = {
            "cell_id": cell_id,
            "execution_id": execution_id,
            "status": exec_status,
            "duration_ms": duration_ms,
            "stdout_summary": full_output[-12000:],
            "figures_base64": figures_b64,
            "experiment_record": exp_record,
            "runtime_info": detect_hardware_info(),
        }
        self.out_event_queue.put(("cell_result", result_payload))
        self.status = "idle"
        self.current_execution_id = None

    async def _send_broadcast(self, ws: Any, event_name: str, data: Dict[str, Any]) -> None:
        self._msg_ref += 1
        frame = {
            "topic": self.topic,
            "event": "broadcast",
            "payload": {
                "type": "broadcast",
                "event": event_name,
                "payload": data,
            },
            "ref": str(self._msg_ref),
        }
        await ws.send(json.dumps(frame))

    async def run_forever(self) -> None:
        hw = detect_hardware_info()
        print("=" * 72)
        print(f"🚀 AutoML Studio Cloud Worker đã khởi động trên [{hw['platform']}]")
        print(f"💻 Phần cứng: {hw['gpu']} | RAM: {hw['ram_used_gb']}/{hw['ram_total_gb']} GB")
        print(f"🔗 Session ID: {self.session_id}")
        print("=" * 72)

        while True:
            try:
                async with websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20, max_size=16 * 1024 * 1024) as ws:
                    # 1. Join kênh Realtime Broadcast
                    join_frame = {
                        "topic": self.topic,
                        "event": "phx_join",
                        "payload": {
                            "config": {
                                "broadcast": {"ack": False, "self": False},
                                "presence": {"key": ""},
                            }
                        },
                        "ref": "1",
                    }
                    await ws.send(json.dumps(join_frame))
                    print("✅ Đã kết nối Supabase Realtime Broadcast! Thu nhỏ tab này và thao tác trên Web App.")

                    self._persist_session_update({
                        "worker_status": "idle",
                        "worker_meta": detect_hardware_info(),
                    })

                    # Gửi ngay 1 gói heartbeat báo Online cho Web App
                    await self._send_broadcast(ws, "heartbeat", {
                        "session_id": self.session_id,
                        "status": self.status,
                        "runtime_info": detect_hardware_info(),
                        "namespace_vars": [k for k in self.global_namespace.keys() if not k.startswith("_")],
                        "ts": int(time.time() * 1000),
                    })

                    last_hb = time.time()

                    while True:
                        # A. Xử lý tin nhắn đến từ Web App (không chặn vòng lặp quá 150ms)
                        try:
                            raw_msg = await asyncio.wait_for(ws.recv(), timeout=0.15)
                            msg = json.loads(raw_msg)
                            if msg.get("event") == "broadcast":
                                inner = msg.get("payload", {})
                                ev_name = inner.get("event")
                                ev_payload = inner.get("payload", {})

                                if ev_name == "run_cell":
                                    if self.current_thread and self.current_thread.is_alive():
                                        terminate_thread(self.current_thread)
                                        await asyncio.sleep(0.1)
                                    print(f"▶ Đang thực thi Cell [{ev_payload.get('cell_id')}]...")
                                    self.current_thread = threading.Thread(
                                        target=self._execute_cell_in_thread,
                                        args=(ev_payload,),
                                        daemon=True,
                                    )
                                    self.current_thread.start()

                                elif ev_name == "stop_cell":
                                    print("⏹ Nhận tín hiệu STOP CELL từ Web App...")
                                    if self.current_thread and self.current_thread.is_alive():
                                        terminate_thread(self.current_thread)

                                elif ev_name == "ping_worker":
                                    await self._send_broadcast(ws, "heartbeat", {
                                        "session_id": self.session_id,
                                        "status": self.status,
                                        "runtime_info": detect_hardware_info(),
                                        "namespace_vars": [k for k in self.global_namespace.keys() if not k.startswith("_")],
                                        "ts": int(time.time() * 1000),
                                    })
                        except asyncio.TimeoutError:
                            pass

                        # B. Gom log chunk (stdout/stderr) mỗi ~350-500ms để gửi về Web App
                        chunks_out = []
                        chunks_err = []
                        while not self.log_queue.empty():
                            stream_name, txt = self.log_queue.get_nowait()
                            if stream_name == "stderr":
                                chunks_err.append(txt)
                            else:
                                chunks_out.append(txt)

                        if chunks_out:
                            await self._send_broadcast(ws, "log_chunk", {
                                "execution_id": self.current_execution_id,
                                "stream": "stdout",
                                "text": "".join(chunks_out),
                                "ts": int(time.time() * 1000),
                            })
                        if chunks_err:
                            await self._send_broadcast(ws, "log_chunk", {
                                "execution_id": self.current_execution_id,
                                "stream": "stderr",
                                "text": "".join(chunks_err),
                                "ts": int(time.time() * 1000),
                            })

                        # C. Gửi các sự kiện hoàn tất (cell_result, data_profile)
                        while not self.out_event_queue.empty():
                            ev_type, ev_data = self.out_event_queue.get_nowait()
                            await self._send_broadcast(ws, ev_type, ev_data)
                            if ev_type == "cell_result":
                                print(f"✔ Hoàn tất Cell [{ev_data.get('cell_id')}] ({ev_data.get('duration_ms')} ms) - Status: {ev_data.get('status')}")

                        # D. Phoenix Heartbeat & Worker Heartbeat mỗi 25 giây
                        now = time.time()
                        if now - last_hb >= 25.0:
                            last_hb = now
                            await ws.send(json.dumps({
                                "topic": "phoenix",
                                "event": "heartbeat",
                                "payload": {},
                                "ref": "hb",
                            }))
                            await self._send_broadcast(ws, "heartbeat", {
                                "session_id": self.session_id,
                                "status": self.status,
                                "runtime_info": detect_hardware_info(),
                                "namespace_vars": [k for k in self.global_namespace.keys() if not k.startswith("_")],
                                "ts": int(now * 1000),
                            })

            except KeyboardInterrupt:
                print("\n👋 Đã dừng AutoML Cloud Worker.")
                break
            except Exception as e:
                print(f"⚠️ Mất kết nối Realtime ({e}), tự động kết nối lại sau 3 giây...")
                await asyncio.sleep(3)


def start_worker(supabase_url: str, supabase_anon_key: str, session_id: str) -> None:
    worker = AutoMLCloudWorker(supabase_url, supabase_anon_key, session_id)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Dành cho môi trường Jupyter / Google Colab / Kaggle (đã có sẵn event loop)
        import nest_asyncio
        nest_asyncio.apply()
        loop.run_until_complete(worker.run_forever())
    else:
        asyncio.run(worker.run_forever())


if __name__ == "__main__":
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_ANON_KEY", "")
    sid = os.environ.get("AUTOML_SESSION_ID", "")
    if not (url and key and sid):
        print("Sử dụng: Đặt biến môi trường SUPABASE_URL, SUPABASE_ANON_KEY, AUTOML_SESSION_ID")
        sys.exit(1)
    start_worker(url, key, sid)
