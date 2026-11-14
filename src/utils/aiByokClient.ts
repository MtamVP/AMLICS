import {
  DataProfile,
  ExperimentRecord,
  PipelineConfig,
} from '../types/studio';

export type AiProvider = 'gemini' | 'gpt' | 'deepseek';

export interface ProviderMeta {
  id: AiProvider;
  label: string;
  tagline: string;
  keyPlaceholder: string;
  keyUrl: string;
  defaultModel: string;
  models: { id: string; note: string }[];
}

export const PROVIDER_CATALOG: Record<AiProvider, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    tagline: 'Google AI Studio',
    keyPlaceholder: 'AIzaSy...',
    keyUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-3.6-flash',
    models: [
      { id: 'gemini-3.6-flash', note: 'Cân bằng tốc độ & chất lượng' },
      { id: 'gemini-3.8-flash', note: 'Flash thế hệ mới, suy luận mạnh' },
      { id: 'gemini-3.5-flash-lite', note: 'Nhẹ, nhanh, tiết kiệm quota' },
      { id: 'gemini-3.1-flash-lite', note: 'Flash-Lite ổn định' },
      { id: 'gemini-4-hydrogen', note: 'Thế hệ 4 mới nhất' },
      { id: 'gemini-2.5-flash', note: 'Fallback tương thích cũ' },
    ],
  },
  gpt: {
    id: 'gpt',
    label: 'GPT',
    tagline: 'OpenAI Platform',
    keyPlaceholder: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-6.1-terra',
    models: [
      { id: 'gpt-6.1-terra', note: 'Nhanh, cân bằng chi phí & hiệu năng' },
      { id: 'gpt-6.1-sol', note: 'Mạnh cho code & khoa học dữ liệu' },
      { id: 'gpt-6-astra', note: 'Flagship suy luận sâu nhất' },
      { id: 'gpt-6-luna', note: 'Siêu tiết kiệm, tốc độ cao' },
      { id: 'gpt-5.6-sol', note: 'GPT-5.6 dòng Sol' },
      { id: 'gpt-5.6-terra', note: 'GPT-5.6 dòng Terra' },
      { id: 'gpt-5.6-luna', note: 'GPT-5.6 dòng Luna' },
    ],
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    tagline: 'DeepSeek API',
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    defaultModel: 'deepseek-flash',
    models: [
      { id: 'deepseek-flash', note: 'Mặc định nhanh, hỗ trợ thinking' },
      { id: 'deepseek-v4-pro', note: 'Logic & code chuyên sâu' },
      { id: 'deepseek-chat', note: 'Alias tương thích cũ' },
      { id: 'deepseek-reasoner', note: 'Reasoning alias cũ' },
    ],
  },
};

export interface NamedApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

export interface StoredByokState {
  activeProvider: AiProvider;
  keys: Record<AiProvider, string>;
  keyVaults: Record<AiProvider, NamedApiKey[]>;
  activeKeyIds: Record<AiProvider, string>;
  autoRotateOnError: boolean;
  models: Record<AiProvider, string>;
}

const STORAGE_V2_KEY = 'amlics_byok_profiles_v2';
const LEGACY_PROVIDER_KEY = 'amlics_byok_provider_v1';
const LEGACY_API_KEY = 'amlics_byok_key_v1';

export function getStoredByokState(): StoredByokState {
  const defaults: StoredByokState = {
    activeProvider: 'gemini',
    keys: { gemini: '', gpt: '', deepseek: '' },
    keyVaults: { gemini: [], gpt: [], deepseek: [] },
    activeKeyIds: { gemini: '', gpt: '', deepseek: '' },
    autoRotateOnError: true,
    models: {
      gemini: PROVIDER_CATALOG.gemini.defaultModel,
      gpt: PROVIDER_CATALOG.gpt.defaultModel,
      deepseek: PROVIDER_CATALOG.deepseek.defaultModel,
    },
  };

  try {
    const raw = localStorage.getItem(STORAGE_V2_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredByokState>;
      const mergedKeys: Record<AiProvider, string> = {
        ...defaults.keys,
        ...(parsed.keys || {}),
      };
      const mergedVaults: Record<AiProvider, NamedApiKey[]> = {
        gemini: Array.isArray(parsed.keyVaults?.gemini) ? parsed.keyVaults.gemini : [],
        gpt: Array.isArray(parsed.keyVaults?.gpt) ? parsed.keyVaults.gpt : [],
        deepseek: Array.isArray(parsed.keyVaults?.deepseek) ? parsed.keyVaults.deepseek : [],
      };
      const mergedActiveIds: Record<AiProvider, string> = {
        ...defaults.activeKeyIds,
        ...(parsed.activeKeyIds || {}),
      };

      // Migrate single key -> named key vault entry per provider if vault is empty
      (['gemini', 'gpt', 'deepseek'] as AiProvider[]).forEach((p) => {
        const legacyStr = (mergedKeys[p] || '').trim();
        if (mergedVaults[p].length === 0 && legacyStr) {
          const migratedId = `key-${p}-1`;
          mergedVaults[p] = [
            {
              id: migratedId,
              name: `${PROVIDER_CATALOG[p].label} Key 1`,
              key: legacyStr,
              createdAt: new Date().toISOString(),
            },
          ];
          mergedActiveIds[p] = migratedId;
        } else if (mergedVaults[p].length > 0) {
          const found = mergedVaults[p].find((k) => k.id === mergedActiveIds[p]) || mergedVaults[p][0];
          mergedActiveIds[p] = found.id;
          mergedKeys[p] = found.key;
        }
      });

      return {
        activeProvider:
          parsed.activeProvider && parsed.activeProvider in PROVIDER_CATALOG
            ? parsed.activeProvider
            : 'gemini',
        keys: mergedKeys,
        keyVaults: mergedVaults,
        activeKeyIds: mergedActiveIds,
        autoRotateOnError: parsed.autoRotateOnError ?? true,
        models: { ...defaults.models, ...(parsed.models || {}) },
      };
    }

    // Migrate legacy v1
    const oldProv = localStorage.getItem(LEGACY_PROVIDER_KEY);
    const oldKey = (localStorage.getItem(LEGACY_API_KEY) || '').trim();
    if (oldKey) {
      const mapped: AiProvider = oldProv === 'openai' ? 'gpt' : 'gemini';
      const migratedId = `key-${mapped}-1`;
      defaults.activeProvider = mapped;
      defaults.keys[mapped] = oldKey;
      defaults.keyVaults[mapped] = [
        {
          id: migratedId,
          name: `${PROVIDER_CATALOG[mapped].label} Key 1`,
          key: oldKey,
          createdAt: new Date().toISOString(),
        },
      ];
      defaults.activeKeyIds[mapped] = migratedId;
    }
  } catch {
    // ignore
  }
  return defaults;
}

export function saveByokState(state: StoredByokState, skipSyncEvent = false): void {
  try {
    localStorage.setItem(STORAGE_V2_KEY, JSON.stringify(state));
    if (!skipSyncEvent && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('amlics:byok-updated', { detail: state }));
    }
  } catch {
    // ignore
  }
}

export async function fetchProviderModels(
  provider: AiProvider,
  apiKey: string
): Promise<string[]> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('Hãy nhập API Key trước khi tải danh sách model.');
  }

  if (provider === 'gemini') {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
    );
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Không tải được model Gemini (${resp.status}): ${txt.slice(0, 180)}`);
    }
    const data = await resp.json();
    const list: string[] = (data?.models || [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes('generateContent')
      )
      .map((m: { name: string }) => m.name.replace(/^models\//, ''));
    return list;
  }

  const endpoint =
    provider === 'deepseek'
      ? 'https://api.deepseek.com/v1/models'
      : 'https://api.openai.com/v1/models';

  const resp = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(
      `Không tải được model ${PROVIDER_CATALOG[provider].label} (${resp.status}): ${txt.slice(0, 180)}`
    );
  }
  const data = await resp.json();
  const ids: string[] = (data?.data || [])
    .map((m: { id: string }) => m.id)
    .filter((id: string) =>
      provider === 'gpt'
        ? /^(gpt-|o[1-9]|chatgpt)/i.test(id)
        : Boolean(id)
    )
    .sort();
  return ids;
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
      dataset: profile?.dataset_name || config.uploadedFileName || 'unknown',
      shape: profile?.shape || null,
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
  model: string,
  systemPrompt: string,
  userPrompt: string,
  expectJson: boolean
): Promise<string> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error(
      `Vui lòng nhập API Key cho ${PROVIDER_CATALOG[provider].label} trước khi gọi AI.`
    );
  }
  const activeModel = (model || PROVIDER_CATALOG[provider].defaultModel).trim();

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      activeModel
    )}:generateContent?key=${encodeURIComponent(key)}`;
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
      throw new Error(`Gemini (${activeModel}) lỗi ${resp.status}: ${errText.slice(0, 220)}`);
    }
    const data = await resp.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('Gemini không trả về nội dung hợp lệ.');
    return txt;
  }

  const endpoint =
    provider === 'deepseek'
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: activeModel,
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
    throw new Error(
      `${PROVIDER_CATALOG[provider].label} (${activeModel}) lỗi ${resp.status}: ${errText.slice(0, 220)}`
    );
  }
  const data = await resp.json();
  const txt = data?.choices?.[0]?.message?.content;
  if (!txt) throw new Error(`${PROVIDER_CATALOG[provider].label} không trả về nội dung hợp lệ.`);
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
  model: string,
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
- hyperparameters: { nEstimators (30-500), learningRate (0.01-0.3), maxDepth (2-20), minSamplesLeaf (1-50), l2Regularization (0-10), subsample (0.5-1.0), earlyStopping (boolean) }
- explanation: concise Vietnamese explanation (2-3 sentences) why these choices maximize the score.`;

  const userMsg = `Schema & Recent Runs:\n${buildSchemaSummary(
    profile,
    config,
    experiments
  )}\n\nUser goal: ${userGoal || 'Tối ưu điểm CV/Holdout cao nhất, chống overfitting và data leakage.'}`;

  const raw = await callLlm(provider, apiKey, model, sys, userMsg, true);
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as AiOptimizationPlan;
}

export async function askAiToGenerateCode(
  provider: AiProvider,
  apiKey: string,
  model: string,
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

  const raw = await callLlm(provider, apiKey, model, sys, userMsg, true);
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as {
    title: string;
    code: string;
    explanation: string;
  };
}
