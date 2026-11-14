/// <reference lib="webworker" />

interface PyodideInterface {
  loadPackage: (packages: string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (msg: string) => void }) => void;
  setStderr: (options: { batched: (msg: string) => void }) => void;
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string, opts: { encoding: 'utf8' }) => string;
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
import ast
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
_last_html_output = None

def _is_id_column_name(col_name: str) -> bool:
    c = str(col_name).strip().lower()
    if c in ('id', 'index', 'uuid', 'guid', 'row_id', 'rowid', 'passengerid', 'customerid', 'loan_id', 'loanid', 'user_id', 'userid', 'transaction_id'):
        return True
    if c.endswith('_id') or c.startswith('id_'):
        return True
    return False

def _extract_data_profile_dict(df, dataset_name="Dataset.csv"):
    cols_info = []
    warnings_list = []
    n_rows = max(len(df), 1)
    dup_rows = int(df.duplicated().sum()) if len(df) <= 250000 else 0

    if len(df) > 30000:
        warnings_list.append({
            "level": "warning",
            "kind": "large_dataset",
            "message": f"Large dataset ({len(df):,} rows × {df.shape[1]} cols). In Browser Wasm, enable Subsampling (e.g. 10,000 rows) or switch to Colab/Kaggle Runtime for full-speed training."
        })

    if dup_rows > 0:
        warnings_list.append({
            "level": "warning",
            "kind": "duplicate_rows",
            "message": f"Found {dup_rows:,} duplicate rows ({round(dup_rows/n_rows*100, 2)}%). Duplicate rows across Train/Test can cause data leakage."
        })

    for idx, col in enumerate(df.columns):
        s = df[col]
        dtype_str = str(s.dtype)
        missing_count = int(s.isna().sum())
        missing_pct = round((missing_count / n_rows) * 100.0, 2)
        nunique = int(s.nunique(dropna=True))

        is_const = (nunique <= 1 and len(df) > 1)
        is_id = False

        # Never mark the very last column as ID if it is binary/categorical target
        is_likely_target = (idx == len(df.columns) - 1 and nunique <= 20)

        if not is_likely_target:
            if _is_id_column_name(col) and nunique > 10:
                is_id = True
            elif len(df) >= 20 and pd.api.types.is_integer_dtype(s) and (nunique / n_rows) >= 0.95:
                is_id = True
            elif len(df) >= 20 and not pd.api.types.is_numeric_dtype(s) and (nunique / n_rows) >= 0.90:
                is_id = True

        if is_const:
            inferred = "id_or_constant"
            warnings_list.append({
                "level": "warning",
                "column": str(col),
                "kind": "constant_column",
                "message": f"Column '{col}' is constant (nunique={nunique}) -> Auto-dropped."
            })
        elif is_id:
            inferred = "id_or_constant"
            warnings_list.append({
                "level": "warning",
                "column": str(col),
                "kind": "id_column",
                "message": f"Column '{col}' detected as identifier ({nunique:,} unique values) -> Auto-dropped to prevent memorization/leakage."
            })
        elif pd.api.types.is_bool_dtype(s):
            inferred = "categorical"
        elif pd.api.types.is_numeric_dtype(s):
            if nunique <= 2:
                inferred = "binary"
            elif nunique <= 12 and pd.api.types.is_integer_dtype(s):
                inferred = "categorical"
            else:
                inferred = "numeric"
        else:
            if nunique <= 50:
                inferred = "categorical"
            else:
                inferred = "text"
                warnings_list.append({
                    "level": "info",
                    "column": str(col),
                    "kind": "high_cardinality",
                    "message": f"Column '{col}' has high cardinality ({nunique:,} unique strings) -> Auto-dropped unless encoded."
                })

        if missing_pct >= 30.0:
            warnings_list.append({
                "level": "info",
                "column": str(col),
                "kind": "high_missing",
                "message": f"Column '{col}' has {missing_pct}% missing values."
            })

        col_entry = {
            "name": str(col),
            "dtype": dtype_str,
            "inferred_type": inferred,
            "missing_pct": missing_pct,
            "nunique": nunique,
            "is_id_like": is_id,
            "is_constant": is_const
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
        "duplicate_rows": dup_rows,
        "columns": cols_info,
        "head": head_records,
        "warnings": warnings_list
    }

def _emit_data_profile(df, dataset_name="Dataset.csv"):
    global _last_emitted_profile_json
    prof = _extract_data_profile_dict(df, dataset_name)
    _last_emitted_profile_json = json.dumps(prof)
    return prof

def _execute_notebook_cell(code_str: str):
    global _last_html_output
    _last_html_output = None
    tree = ast.parse(code_str, mode='exec')
    if not tree.body:
        return None
    last_node = tree.body[-1]
    if isinstance(last_node, ast.Expr):
        if len(tree.body) > 1:
            exec_mod = ast.Module(body=tree.body[:-1], type_ignores=[])
            exec(compile(exec_mod, '<cell>', 'exec'), globals())
        eval_expr = ast.Expression(body=last_node.value)
        val = eval(compile(eval_expr, '<cell>', 'eval'), globals())
        if val is not None:
            if isinstance(val, pd.DataFrame):
                _last_html_output = val.head(15).to_html(classes='amlics-df-table', border=0)
            elif isinstance(val, pd.Series):
                _last_html_output = val.head(15).to_frame().to_html(classes='amlics-df-table', border=0)
            else:
                print(repr(val))
        return val
    else:
        exec(compile(tree, '<cell>', 'exec'), globals())
        return None

def _collect_execution_artifacts():
    global _last_emitted_profile_json, _automl_experiment_result, _last_html_output
    figs = []
    for fig_num in plt.get_fignums():
        fig = plt.figure(fig_num)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=120, facecolor='#202124')
        buf.seek(0)
        b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
        figs.append(b64)
    plt.close('all')

    if _last_emitted_profile_json is None and 'df' in globals() and isinstance(globals()['df'], pd.DataFrame):
        ds_name = globals().get('DATASET_NAME', 'Dataset.csv')
        _last_emitted_profile_json = json.dumps(_extract_data_profile_dict(globals()['df'], ds_name))

    has_sub = os.path.exists('/tmp/submission.csv') or os.path.exists('submission.csv')

    payload = {
        "figures": figs,
        "html_output": _last_html_output,
        "data_profile": json.loads(_last_emitted_profile_json) if _last_emitted_profile_json else None,
        "experiment_record": _automl_experiment_result,
        "has_submission_csv": has_sub,
        "namespace_vars": [k for k in globals().keys() if not k.startswith('_')]
    }
    _last_emitted_profile_json = None
    _automl_experiment_result = None
    _last_html_output = None
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
      message: 'Loading Pyodide Wasm...',
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
      message: 'Loading numpy, pandas, scikit-learn, matplotlib...',
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

    // Pre-cache default /datasets/titanic.csv into /tmp/_cached_url_dataset.csv so Cell 1 runs offline/instantly
    try {
      const resp = await fetch('/datasets/titanic.csv');
      if (resp.ok) {
        const csvTxt = await resp.text();
        pyodide.FS.mkdirTree('/tmp');
        pyodide.FS.writeFile('/tmp/_cached_url_dataset.csv', csvTxt);
        pyodide.FS.writeFile('/tmp/titanic.csv', csvTxt);
      }
    } catch {
      // ignore
    }

    pyodideInstance = pyodide;

    self.postMessage({
      type: 'status',
      status: 'idle',
      message: 'Ready',
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
        message: `Pyodide init error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return;
  }

  if (type === 'write_csv') {
    try {
      const pyodide = await ensurePyodideLoaded();
      const { filename, content, isTestFile, alsoCacheAsUrl } = payload;
      pyodide.FS.mkdirTree('/tmp');
      pyodide.FS.writeFile(`/tmp/${filename}`, content);
      if (alsoCacheAsUrl) {
        pyodide.FS.writeFile('/tmp/_cached_url_dataset.csv', content);
      }

      if (isTestFile) {
        await pyodide.runPythonAsync(`
TEST_DATASET_NAME = '${filename.replace(/'/g, "\\'")}'
df_test = pd.read_csv('/tmp/' + TEST_DATASET_NAME)
        `);
        self.postMessage({
          type: 'test_csv_uploaded',
          filename,
        });
      } else {
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
      }
    } catch (err) {
      self.postMessage({
        type: 'log_chunk',
        stream: 'stderr',
        text: `Failed to parse CSV: ${err instanceof Error ? err.message : String(err)}\n`,
      });
    }
    return;
  }

  if (type === 'download_submission') {
    try {
      const pyodide = await ensurePyodideLoaded();
      const csvContent = pyodide.FS.readFile('/tmp/submission.csv', { encoding: 'utf8' });
      self.postMessage({
        type: 'submission_csv_content',
        content: csvContent,
      });
    } catch (err) {
      self.postMessage({
        type: 'log_chunk',
        stream: 'stderr',
        text: `submission.csv not found yet. Run Cell 5 first. (${err instanceof Error ? err.message : String(err)})\n`,
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
        message: `Running ${cellId}...`,
      });

      await pyodide.runPythonAsync(`plt.close('all')\n_automl_experiment_result = None`);
      pyodide.FS.mkdirTree('/tmp');
      pyodide.FS.writeFile('/tmp/_current_cell.py', code);
      await pyodide.runPythonAsync(`
with open('/tmp/_current_cell.py', 'r', encoding='utf-8') as _f:
    _cell_src = _f.read()
_execute_notebook_cell(_cell_src)
      `);

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
          html_output: artifacts.html_output || undefined,
          figures_base64: artifacts.figures || [],
          experiment_record: artifacts.experiment_record || null,
          has_submission_csv: Boolean(artifacts.has_submission_csv),
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
        message: 'Ready',
      });
    }
  }
};
