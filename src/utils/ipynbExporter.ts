import { generateOneClickColabScript } from '../engine/supabaseCloudClient';
import { NotebookCell, PipelineConfig } from '../types/studio';

export function exportPipelineToIpynb(
  projectName: string,
  config: PipelineConfig,
  cells: NotebookCell[]
): void {
  const ipynbCells: Record<string, unknown>[] = [
    {
      cell_type: 'markdown',
      metadata: {},
      source: [
        `# ⚡ ${projectName} — AMLICS Anti-Leakage Pipeline\n`,
        `> Sinh tự động bởi **AMLICS (AutoML & Interactive Code Studio)**\n`,
        `- **Bài toán:** \`${config.taskType.toUpperCase()}\` | **Biến mục tiêu (Target):** \`${config.targetColumn}\`\n`,
        `- **Mô hình chính:** \`${config.modelFamily}\` | **Cross-Validation:** \`${config.cvFolds}-Fold\`\n`,
        `- **Cam kết kỹ thuật:** 100% chống Data Leakage qua \`sklearn.compose.ColumnTransformer\` & \`sklearn.pipeline.Pipeline\`.\n`,
      ],
    },
  ];

  for (const cell of cells) {
    ipynbCells.push({
      cell_type: 'markdown',
      metadata: {},
      source: [
        `### ${cell.title} ${cell.isLocked ? '*(🔒 Custom Edited)*' : '*(🔗 UI Synced)*'}\n`,
        `${cell.subtitle}\n`,
      ],
    });

    const outputs: Record<string, unknown>[] = [];
    if (cell.outputText && cell.outputText.trim()) {
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: cell.outputText.split('\n').map((line) => line + '\n'),
      });
    }

    if (cell.figures && cell.figures.length > 0) {
      for (const figB64 of cell.figures) {
        const cleanB64 = figB64.replace(/^data:image\/png;base64,/, '');
        outputs.push({
          output_type: 'display_data',
          data: {
            'image/png': cleanB64,
            'text/plain': ['<Figure size 1450x420 with Axes>'],
          },
          metadata: {},
        });
      }
    }

    ipynbCells.push({
      cell_type: 'code',
      execution_count: cell.status === 'success' ? cell.order : null,
      metadata: {
        id: cell.id,
        automl_step: cell.stepType,
        is_locked: cell.isLocked,
      },
      source: cell.currentCode.split('\n').map((line, i, arr) =>
        i < arr.length - 1 ? line + '\n' : line
      ),
      outputs,
    });
  }

  const notebookObj = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3 (ipykernel)',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.11.0',
      },
    },
    cells: ipynbCells,
  };

  const blob = new Blob([JSON.stringify(notebookObj, null, 2)], {
    type: 'application/x-ipynb+json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  a.href = url;
  a.download = `${safeTitle}_automl_pipeline.ipynb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCloudRunnerIpynb(
  sessionId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): void {
  const script = generateOneClickColabScript(sessionId, supabaseUrl, supabaseAnonKey);
  const notebookObj = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      colab: {
        provenance: [],
        gpuType: 'T4',
      },
      accelerator: 'GPU',
      kernelspec: {
        display_name: 'Python 3',
        name: 'python3',
      },
    },
    cells: [
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '# 🚀 AutoML & Interactive Code Studio — Cloud Runtime Runner (Colab / Kaggle)\n',
          'Chỉ cần bấm **Run All (Ctrl+F9)** đúng 1 lần duy nhất. Khi thấy dòng chữ `🟢 ĐÃ KẾT NỐI REALTIME VỚI WEB APP!`, bạn hãy thu nhỏ tab này lại và điều khiển 100% từ giao diện Web App!\n',
        ],
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: script.split('\n').map((l, i, arr) => (i < arr.length - 1 ? l + '\n' : l)),
      },
    ],
  };

  const blob = new Blob([JSON.stringify(notebookObj, null, 2)], {
    type: 'application/x-ipynb+json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AutoML_Cloud_Worker_${sessionId.slice(0, 8)}.ipynb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
