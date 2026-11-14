import {
  DataProfile,
  ExperimentRecord,
  PipelineConfig,
} from '../types/studio';

export type AiProvider = 'gemini' | 'openai';

const PROVIDER_KEY = 'amlics_byok_provider_v1';
const API_KEY_STORAGE = 'amlics_byok_key_v1';

export function getStoredAiSettings(): { provider: AiProvider; apiKey: string } {
  try {
    const provider =
      (localStorage.getItem(PROVIDER_KEY) as AiProvider) || 'gemini';
    const apiKey = localStorage.getItem(API_KEY_STORAGE) || '';
    return { provider, apiKey };
  } catch {
    return { provider: 'gemini', apiKey: '' };
  }
}

export function saveAiSettings(provider: AiProvider, apiKey: string): void {
  try {
    localStorage.setItem(PROVIDER_KEY, provider);
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
  } catch {
    // ignore
  }
}

function buildSchemaSummary(
  profile: DataProfile | null,
  config: PipelineConfig,
  experiments: ExperimentRecord[]
): string {
  const cols =
    profile?.columns.slice(0, 35).map((c) => ({
      name: c.name,
      dtype: c.dtype,
      type: c.inferred_type,
      missing_pct: c.missing_pct,
      nunique: c.nunique,
      min: c.min,
      max: c.max,
    })) || [];

  const recentExps = experiments.slice(0, 5).map((e) => ({
    run: e.runNumber,
    model: e.modelFamily,
    metrics: e.metrics,
  }));

  return JSON.stringify(
    {
      dataset: profile?.dataset_name || config.uploadedFileName || 'dataset.csv',
      shape: profile?.shape,
      targetColumn: config.targetColumn,
      taskType: config.taskType,
      numericColumns: config.numericColumns,
      categoricalColumns: config.categoricalColumns,
      dropColumns: config.dropColumns,
      columns: cols,
      recentLeaderboard: recentExps,
    },
    null,
    2
  );
}

async function callLlm(
  provider: AiProvider,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  expectJson: boolean
): Promise<string> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('Vui lòng nhập API Key (Gemini hoặc OpenAI) trước khi gọi AI.');
  }

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      key
    )}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.25,
          ...(expectJson ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Gemini API lỗi (${resp.status}): ${errText.slice(0, 220)}`);
    }
    const data = await resp.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('Gemini không trả về nội dung hợp lệ.');
    return txt;
  }

  // OpenAI
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.25,
      ...(expectJson ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI API lỗi (${resp.status}): ${errText.slice(0, 220)}`);
  }
  const data = await resp.json();
  const txt = data?.choices?.[0]?.message?.content;
  if (!txt) throw new Error('OpenAI không trả về nội dung hợp lệ.');
  return txt;
}

export interface AiOptimizationPlan {
  taskType?: PipelineConfig['taskType'];
  numericImputer?: PipelineConfig['numericImputer'];
  numericScaler?: PipelineConfig['numericScaler'];
  logTransformNumeric?: boolean;
  polynomialInteractions?: boolean;
  categoricalEncoder?: PipelineConfig['categoricalEncoder'];
  featureSelection?: PipelineConfig['featureSelection'];
  cvStrategy?: PipelineConfig['cvStrategy'];
  imbalanceStrategy?: PipelineConfig['imbalanceStrategy'];
  modelFamily?: PipelineConfig['modelFamily'];
  tuningStrategy?: PipelineConfig['tuningStrategy'];
  hyperparameters?: Partial<PipelineConfig['hyperparameters']>;
  explanation: string;
}

export async function askAiToOptimizePipeline(
  provider: AiProvider,
  apiKey: string,
  profile: DataProfile | null,
  config: PipelineConfig,
  experiments: ExperimentRecord[],
  userGoal: string
): Promise<AiOptimizationPlan> {
  const sys = `You are a senior Kaggle Grandmaster & scikit-learn Pipeline Engineer.
Given ONLY dataset schema metadata and recent CV results, output a JSON object optimizing PipelineConfig for the HIGHEST validation score without data leakage.
Allowed enum values:
- taskType: "classification" | "regression"
- numericImputer: "median" | "mean" | "most_frequent" | "constant_zero" | "knn"
- numericScaler: "robust" | "standard" | "minmax" | "quantile_normal" | "power_yeojohnson" | "none"
- categoricalEncoder: "onehot" | "ordinal" | "target"
- featureSelection: "none" | "select_k_best_10" | "select_k_best_20" | "select_from_model"
- cvStrategy: "stratified_kfold" | "repeated_stratified_kfold" | "kfold" | "group_kfold" | "timeseries_split"
- imbalanceStrategy: "none" | "class_weight" | "random_oversample" | "random_undersample"
- modelFamily: "HistGradientBoosting" | "GradientBoosting" | "RandomForest" | "ExtraTrees" | "LinearModel" | "MLPNeuralNet" | "LightGBM" | "XGBoost" | "CatBoost"
- tuningStrategy: "none" | "randomized_search" | "grid_search"
- hyperparameters: { nEstimators (30-500), learningRate (0.01-0.3), maxDepth (2-20), minSamplesLeaf (1-50), l2Regularization (0-10), subsample (0.5-1.0) }
- explanation: concise Vietnamese explanation (2-3 sentences) why these choices maximize the score.`;

  const userMsg = `Schema & Recent Runs:\n${buildSchemaSummary(
    profile,
    config,
    experiments
  )}\n\nUser goal: ${userGoal || 'Tối ưu điểm CV/Holdout cao nhất, chống overfitting và data leakage.'}`;

  const raw = await callLlm(provider, apiKey, sys, userMsg, true);
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as AiOptimizationPlan;
}

export async function askAiToGenerateCode(
  provider: AiProvider,
  apiKey: string,
  profile: DataProfile | null,
  config: PipelineConfig,
  experiments: ExperimentRecord[],
  prompt: string,
  lastErrorText?: string
): Promise<{ title: string; code: string; explanation: string }> {
  const sys = `You are an expert Python Data Scientist working inside AMLICS Notebook (variables already in scope: df, X_train, X_test, y_train, y_test, preprocessor, full_pipeline, pd, np, plt).
Respond strictly with JSON: { "title": "short Vietnamese cell title", "code": "valid runnable Python code using dark matplotlib (#202124/#18191a) if plotting, ending with a DataFrame expression if displaying a table", "explanation": "short 1-2 sentence Vietnamese summary" }.`;

  const userMsg = `Dataset Schema:\n${buildSchemaSummary(
    profile,
    config,
    experiments
  )}\n${lastErrorText ? `\nRecent Error:\n${lastErrorText}\n` : ''}\nRequest: ${prompt}`;

  const raw = await callLlm(provider, apiKey, sys, userMsg, true);
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as {
    title: string;
    code: string;
    explanation: string;
  };
}
