/// <reference lib="webworker" />

interface PyodideInterface {
  loadPackage: (packages: string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (msg: string) => void }) => void;
  setStderr: (options: { batched: (msg: string) => void }) => void;
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    mkdirTree: (path: string) => void;
  };
  globals: {
    get: (name: string) => unknown;
  };
}

let pyodideInstance: PyodideInterface | null = null;
let isInitializing = false;
let currentCellId: string | null = null;

const BOOTSTRAP_PYTHON = `
import io
import os
import sys
import json
import base64
import time
import traceback
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

_last_emitted_profile_json = None
_automl_experiment_result = None

def _extract_data_profile_dict(df, dataset_name="Dataset.csv"):
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

        col_entry = {
            "name": str(col),
            "dtype": dtype_str,
            "inferred_type": inferred,
            "missing_pct": missing_pct,
            "nunique": nunique
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
        "dataset_name": str(dataset_name),
        "shape": [int(df.shape[0]), int(df.shape[1])],
        "memory_mb": mem_mb,
        "columns": cols_info,
        "head": head_records
    }

def _emit_data_profile(df, dataset_name="Dataset.csv"):
    global _last_emitted_profile_json
    prof = _extract_data_profile_dict(df, dataset_name)
    _last_emitted_profile_json = json.dumps(prof)
    return prof

def _collect_execution_artifacts():
    global _last_emitted_profile_json, _automl_experiment_result
    figs = []
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=125, facecolor='#0f172a')
        buf.seek(0)
        b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
        figs.append(b64)
    plt.close('all')

    # Nếu df tồn tại mà chưa gọi _emit_data_profile thì tự động trích xuất
    if _last_emitted_profile_json is None and 'df' in globals() and isinstance(globals()['df'], pd.DataFrame):
        ds_name = globals().get('DATASET_NAME', 'Dataset.csv')
        _last_emitted_profile_json = json.dumps(_extract_data_profile_dict(globals()['df'], ds_name))

    payload = {
        "figures": figs,
        "data_profile": json.loads(_last_emitted_profile_json) if _last_emitted_profile_json else None,
        "experiment_record": _automl_experiment_result,
        "namespace_vars": [k for k in globals().keys() if not k.startswith('_')]
    }
    _last_emitted_profile_json = None
    _automl_experiment_result = None
    return json.dumps(payload)
`;

async function ensurePyodideLoaded(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 150));
    }
    if (pyodideInstance) return pyodideInstance;
  }

  isInitializing = true;
  try {
    self.postMessage({
      type: 'status',
      status: 'initializing',
      message: 'Đang khởi tạo Python 3.11 WebAssembly (Pyodide)...',
    });

    const pyodideCdnUrl = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.mjs';
    const pyodideModule = (await import(
      /* @vite-ignore */ pyodideCdnUrl
    )) as { loadPyodide: (cfg: { indexURL: string }) => Promise<PyodideInterface> };
    const pyodide: PyodideInterface = await pyodideModule.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/',
    });

    self.postMessage({
      type: 'status',
      status: 'initializing',
      message: 'Đang nạp gói khoa học dữ liệu (numpy, pandas, scikit-learn, matplotlib)...',
    });

    await pyodide.loadPackage(['numpy', 'pandas', 'scikit-learn', 'matplotlib']);

    pyodide.setStdout({
      batched: (msg: string) => {
        self.postMessage({
          type: 'log_chunk',
          cellId: currentCellId,
          stream: 'stdout',
          text: msg + '\n',
        });
      },
    });

    pyodide.setStderr({
      batched: (msg: string) => {
        self.postMessage({
          type: 'log_chunk',
          cellId: currentCellId,
          stream: 'stderr',
          text: msg + '\n',
        });
      },
    });

    await pyodide.runPythonAsync(BOOTSTRAP_PYTHON);
    pyodideInstance = pyodide;

    self.postMessage({
      type: 'status',
      status: 'idle',
      message: 'Tier 1: Browser Wasm Runtime sẵn sàng (0đ Server)',
    });
    return pyodide;
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    try {
      await ensurePyodideLoaded();
    } catch (err) {
      self.postMessage({
        type: 'status',
        status: 'error',
        message: `Lỗi khởi tạo Pyodide: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return;
  }

  if (type === 'write_csv') {
    try {
      const pyodide = await ensurePyodideLoaded();
      const { filename, content } = payload;
      pyodide.FS.mkdirTree('/tmp');
      pyodide.FS.writeFile(`/tmp/${filename}`, content);

      // Đọc nhanh để trích xuất Data Profile ngay khi người dùng upload file CSV
      const profileJson = (await pyodide.runPythonAsync(`
DATASET_NAME = '${filename.replace(/'/g, "\\'")}'
df = pd.read_csv('/tmp/' + DATASET_NAME)
json.dumps(_extract_data_profile_dict(df, DATASET_NAME))
      `)) as string;

      self.postMessage({
        type: 'csv_uploaded',
        filename,
        dataProfile: JSON.parse(profileJson),
      });
    } catch (err) {
      self.postMessage({
        type: 'log_chunk',
        stream: 'stderr',
        text: `Lỗi đọc CSV: ${err instanceof Error ? err.message : String(err)}\n`,
      });
    }
    return;
  }

  if (type === 'run_cell') {
    const { cellId, executionId, code } = payload;
    currentCellId = cellId;
    const t0 = performance.now();

    try {
      const pyodide = await ensurePyodideLoaded();
      self.postMessage({
        type: 'status',
        status: 'busy',
        message: `Đang thực thi ${cellId} trên Browser Wasm...`,
      });

      await pyodide.runPythonAsync(`plt.close('all')\n_automl_experiment_result = None`);
      await pyodide.runPythonAsync(code);

      const rawArtifacts = (await pyodide.runPythonAsync(
        `_collect_execution_artifacts()`
      )) as string;
      const artifacts = JSON.parse(rawArtifacts);
      const durationMs = Math.round(performance.now() - t0);

      if (artifacts.data_profile) {
        self.postMessage({
          type: 'data_profile',
          dataProfile: artifacts.data_profile,
        });
      }

      self.postMessage({
        type: 'cell_result',
        payload: {
          cell_id: cellId,
          execution_id: executionId,
          status: 'success',
          duration_ms: durationMs,
          figures_base64: artifacts.figures || [],
          experiment_record: artifacts.experiment_record || null,
          namespace_vars: artifacts.namespace_vars || [],
        },
      });
    } catch (err) {
      const durationMs = Math.round(performance.now() - t0);
      const errText = err instanceof Error ? err.message : String(err);
      self.postMessage({
        type: 'log_chunk',
        cellId,
        stream: 'stderr',
        text: `\n${errText}\n`,
      });
      self.postMessage({
        type: 'cell_result',
        payload: {
          cell_id: cellId,
          execution_id: executionId,
          status: 'error',
          duration_ms: durationMs,
          figures_base64: [],
          experiment_record: null,
          error_message: errText,
        },
      });
    } finally {
      currentCellId = null;
      self.postMessage({
        type: 'status',
        status: 'idle',
        message: 'Browser Wasm Idle',
      });
    }
  }
};
