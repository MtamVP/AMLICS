import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

function bundleAndLoad(relPath) {
  const absPath = path.resolve(process.cwd(), relPath);
  const result = esbuild.buildSync({
    entryPoints: [absPath],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    logLevel: 'silent',
  });
  const mod = { exports: {} };
  const fn = new Function('exports', 'require', 'module', result.outputFiles[0].text);
  fn(mod.exports, require, mod);
  return mod.exports;
}

const proxyMod = bundleAndLoad('functions/api/proxy-csv.ts');
const codeGenMod = bundleAndLoad('src/engine/codeGenerator.ts');
const cloudMod = bundleAndLoad('src/engine/supabaseCloudClient.ts');

test('URL normalization handles GitHub, Drive, Sheets, Dropbox, HuggingFace, GitLab', () => {
  const cases = [
    [
      'https://github.com/user/repo/blob/main/data/train.csv',
      'https://raw.githubusercontent.com/user/repo/main/data/train.csv',
    ],
    [
      'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing',
      'https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvWxYz',
    ],
    [
      'https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz',
      'https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOpQrStUvWxYz',
    ],
    [
      'https://docs.google.com/spreadsheets/d/1SheetId123/edit?gid=456#gid=456',
      'https://docs.google.com/spreadsheets/d/1SheetId123/export?format=csv&gid=456',
    ],
    [
      'https://www.dropbox.com/s/abc123/train.csv?dl=0',
      'https://www.dropbox.com/s/abc123/train.csv?dl=1',
    ],
    [
      'https://huggingface.co/datasets/org/ds/blob/main/train.csv',
      'https://huggingface.co/datasets/org/ds/resolve/main/train.csv',
    ],
    [
      'https://gitlab.com/org/repo/-/blob/main/data.csv',
      'https://gitlab.com/org/repo/-/raw/main/data.csv',
    ],
  ];

  for (const [input, expected] of cases) {
    assert.equal(proxyMod.normalizeDatasetUrl(input), expected);
    assert.equal(codeGenMod.normalizeUrlForPython(input), expected);
  }
});

test('Proxy rejects Private HTML, Kaggle/Colab web pages, SSRF IPs, and retries Drive virus-scan HTML', async () => {
  const origFetch = globalThis.fetch;
  try {
    // 1. Private Google Drive HTML login wall -> 403
    globalThis.fetch = async () =>
      new Response('<!DOCTYPE html><html><title>Sign in</title></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    const privRes = await proxyMod.onRequestGet({
      request: new Request(
        'https://amlics.pages.dev/api/proxy-csv?url=' +
          encodeURIComponent('https://drive.google.com/file/d/PRIVATE_ID/view')
      ),
    });
    assert.equal(privRes.status, 403);

    // 2. Public Google Drive large-file virus-scan HTML -> retries drive.usercontent.google.com -> 200 CSV
    globalThis.fetch = async (url) => {
      if (String(url).includes('drive.usercontent.google.com')) {
        return new Response('a,b\n1,2\n', {
          status: 200,
          headers: { 'Content-Type': 'text/csv' },
        });
      }
      return new Response(
        '<!DOCTYPE html><html><form action="https://drive.usercontent.google.com/download"><input name="confirm" value="t"><input name="uuid" value="u123"></form></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    };
    const driveConfirmRes = await proxyMod.onRequestGet({
      request: new Request(
        'https://amlics.pages.dev/api/proxy-csv?url=' +
          encodeURIComponent('https://drive.google.com/file/d/LARGE_PUBLIC_ID/view')
      ),
    });
    assert.equal(driveConfirmRes.status, 200);
    assert.equal(await driveConfirmRes.text(), 'a,b\n1,2\n');

    // 3. Kaggle/Colab web URL -> 403 before fetch
    const kaggleRes = await proxyMod.onRequestGet({
      request: new Request(
        'https://amlics.pages.dev/api/proxy-csv?url=' +
          encodeURIComponent('https://www.kaggle.com/datasets/user/ds')
      ),
    });
    assert.equal(kaggleRes.status, 403);

    const colabRes = await proxyMod.onRequestGet({
      request: new Request(
        'https://amlics.pages.dev/api/proxy-csv?url=' +
          encodeURIComponent('https://colab.research.google.com/drive/123')
      ),
    });
    assert.equal(colabRes.status, 403);

    // 4. SSRF private IP -> 403
    const ssrfRes = await proxyMod.onRequestGet({
      request: new Request(
        'https://amlics.pages.dev/api/proxy-csv?url=' +
          encodeURIComponent('http://127.0.0.1:8080/secret.csv')
      ),
    });
    assert.equal(ssrfRes.status, 403);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('Cloud Worker script includes cell_id, thread join, namespace_vars, upload_csv, and valid Python syntax', () => {
  const pyScript = cloudMod.generateOneClickColabScript(
    'test-session-123',
    'https://example.supabase.co',
    'anon-key-xyz'
  );
  assert.ok(pyScript.includes('worker_state["cell_id"]'));
  assert.ok(pyScript.includes('old_t.join(timeout=1.5)'));
  assert.ok(pyScript.includes('"namespace_vars": [k for k in GLOBAL_NS if not k.startswith("_")]'));
  assert.ok(pyScript.includes('elif ev == "upload_csv":'));

  const tmpPy = path.join(os.tmpdir(), `amlics_worker_${Date.now()}.py`);
  const pyNoMagic = pyScript
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('!'))
    .join('\n');
  fs.writeFileSync(tmpPy, pyNoMagic, 'utf8');
  try {
    execFileSync('python', ['-m', 'py_compile', tmpPy], { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }
});

test('Codegen supports cloud_path (.parquet, .tsv, .csv), _smart_read_csv, and inf sanitization', () => {
  const cfg = {
    datasetSource: 'cloud_path',
    cloudDatasetPath: '/kaggle/input/comp/train.parquet',
    uploadedFileName: 'train.csv',
    testUploadedFileName: '',
    publicDatasetUrl: '',
    targetColumn: 'target',
    taskType: 'classification',
    idColumnForSubmission: 'id',
    dropColumns: [],
    numericColumns: ['a'],
    categoricalColumns: ['b'],
    dropDuplicates: true,
    subsampleRows: 0,
    numericImputer: 'median',
    numericScaler: 'robust',
    addMissingIndicator: false,
    logTransformNumeric: false,
    polynomialInteractions: false,
    varianceThreshold: true,
    featureSelection: 'none',
    categoricalImputer: 'most_frequent',
    categoricalEncoder: 'onehot',
    maxOneHotCategories: 20,
    testSize: 0.2,
    cvFolds: 3,
    cvStrategy: 'stratified_kfold',
    groupColumn: '',
    imbalanceStrategy: 'none',
    scoringMetric: 'auto',
    modelFamily: 'HistGradientBoosting',
    tuningStrategy: 'none',
    tuningTrials: 3,
    hyperparameters: {
      nEstimators: 30,
      learningRate: 0.1,
      maxDepth: 4,
      minSamplesLeaf: 5,
      l2Regularization: 1.0,
      subsample: 0.8,
      earlyStopping: false,
      randomState: 42,
    },
    autoFlags: {},
  };

  const parquetCode = codeGenMod.generateCell1DataLoad(cfg);
  assert.ok(parquetCode.includes("pd.read_parquet('/kaggle/input/comp/train.parquet')"));
  assert.ok(parquetCode.includes('df.replace([np.inf, -np.inf], np.nan, inplace=True)'));

  const tsvCode = codeGenMod.generateCell1DataLoad({
    ...cfg,
    cloudDatasetPath: '/content/data.tsv',
  });
  assert.ok(tsvCode.includes("pd.read_csv('/content/data.tsv', sep='\\t')"));

  const evalCode = codeGenMod.generateCell5Evaluate(cfg);
  assert.ok(evalCode.includes('if _use_df_test:'));
});

test('New ML Learning Quick Snippets (learning_curve, error_analysis, threshold_tuning, export_model_pkl) execute cleanly in Python', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amlics_e2e_'));
  try {
    const csvPath = path.join(tmpDir, 'train.csv').replace(/\\/g, '/');
    const rows = ['id,x1,x2,cat,target'];
    for (let i = 1; i <= 100; i++) {
      rows.push(`${i},${(i * 0.7).toFixed(2)},${(i % 9) * 1.5},${i % 2 === 0 ? 'A' : 'B'},${i % 3 === 0 ? 1 : 0}`);
    }
    fs.writeFileSync(csvPath, rows.join('\n'), 'utf8');

    const cfg = {
      datasetSource: 'cloud_path',
      cloudDatasetPath: csvPath,
      uploadedFileName: 'train.csv',
      testUploadedFileName: '',
      publicDatasetUrl: '',
      targetColumn: 'target',
      taskType: 'classification',
      idColumnForSubmission: 'id',
      dropColumns: ['id'],
      numericColumns: ['x1', 'x2'],
      categoricalColumns: ['cat'],
      dropDuplicates: true,
      subsampleRows: 0,
      numericImputer: 'median',
      numericScaler: 'robust',
      addMissingIndicator: false,
      logTransformNumeric: false,
      polynomialInteractions: false,
      varianceThreshold: true,
      featureSelection: 'none',
      categoricalImputer: 'most_frequent',
      categoricalEncoder: 'onehot',
      maxOneHotCategories: 20,
      testSize: 0.2,
      cvFolds: 3,
      cvStrategy: 'stratified_kfold',
      groupColumn: '',
      imbalanceStrategy: 'none',
      scoringMetric: 'auto',
      modelFamily: 'HistGradientBoosting',
      tuningStrategy: 'none',
      tuningTrials: 3,
      hyperparameters: {
        nEstimators: 20,
        learningRate: 0.1,
        maxDepth: 3,
        minSamplesLeaf: 5,
        l2Regularization: 1.0,
        subsample: 0.8,
        earlyStopping: false,
        randomState: 42,
      },
      autoFlags: {},
    };

    const baseCells = codeGenMod.buildAllPipelineCells(cfg).filter((c) => c.cellType === 'code');
    const snippets = ['learning_curve', 'error_analysis', 'threshold_tuning', 'export_model_pkl'].map((id, idx) =>
      codeGenMod.generateQuickSnippetCell(id, cfg, 10 + idx)
    );

    const scriptParts = [
      'import os',
      'import matplotlib',
      'matplotlib.use("Agg")',
      `os.chdir(${JSON.stringify(tmpDir)})`,
      'GLOBAL_NS = {}',
      ...baseCells.map((c) => `exec(${JSON.stringify(c.generatedCode)}, GLOBAL_NS)`),
      ...snippets.map((s) => `exec(${JSON.stringify(s.generatedCode)}, GLOBAL_NS)`),
      'assert os.path.exists("model.pkl"), "model.pkl missing"',
    ];
    const pyFile = path.join(tmpDir, 'run_snippets.py');
    fs.writeFileSync(pyFile, scriptParts.join('\n'), 'utf8');
    execFileSync('python', [pyFile], { stdio: 'pipe', timeout: 60000 });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
