import {
  DataProfile,
  ExperimentRecord,
  NotebookCell,
  PipelineConfig,
} from '../types/studio';
import { evaluateModelHealth } from './autoOptimizer';

function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportStandaloneHtmlReport(
  projectName: string,
  config: PipelineConfig,
  dataProfile: DataProfile | null,
  experiments: ExperimentRecord[],
  cells: NotebookCell[]
): void {
  const allFigures = cells.flatMap((c) =>
    (c.figures || []).map((fig, idx) => ({
      title: `${c.title} (Plot #${idx + 1})`,
      b64: fig,
    }))
  );

  const sortedExps = [...experiments].sort((a, b) => {
    if (config.taskType === 'classification') {
      return (b.metrics.roc_auc ?? b.metrics.f1 ?? 0) - (a.metrics.roc_auc ?? a.metrics.f1 ?? 0);
    }
    return (b.metrics.r2 ?? -999) - (a.metrics.r2 ?? -999);
  });

  const expRows = sortedExps
    .map((exp, idx) => {
      const health = evaluateModelHealth(exp);
      const mainMetric =
        exp.taskType === 'classification'
          ? `AUC: ${exp.metrics.roc_auc?.toFixed(4) ?? '-'} | F1: ${exp.metrics.f1?.toFixed(4) ?? '-'}`
          : `RMSE: ${exp.metrics.rmse?.toFixed(4) ?? '-'} | R²: ${exp.metrics.r2?.toFixed(4) ?? '-'}`;
      const cvMetric =
        exp.metrics.cv_mean !== undefined
          ? `${exp.metrics.cv_mean.toFixed(4)} ± ${(exp.metrics.cv_std ?? 0).toFixed(3)}`
          : '-';
      return `
        <tr>
          <td>#${idx + 1}</td>
          <td><strong>Run ${exp.runNumber}</strong>: ${esc(exp.modelName)}</td>
          <td><span class="badge">${esc(health.grade)} (${health.healthScore})</span></td>
          <td>${esc(mainMetric)}</td>
          <td>${esc(cvMetric)}</td>
          <td>${esc(exp.preprocessingSummary.numericScaler)} / ${esc(exp.preprocessingSummary.categoricalEncoder)}</td>
          <td>${(exp.durationMs / 1000).toFixed(2)}s</td>
        </tr>`;
    })
    .join('\n');

  const figureCards = allFigures
    .map(
      (f) => `
      <div class="card">
        <div class="card-title">${esc(f.title)}</div>
        <img src="data:image/png;base64,${f.b64}" alt="${esc(f.title)}" />
      </div>`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(projectName)} — AMLICS ML Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #18191a; color: #e8eaed; margin: 0; padding: 28px; line-height: 1.5; }
    .container { max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 22px; margin: 0 0 6px; color: #8ab4f8; }
    .meta { color: #9aa0a6; font-size: 13px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat { background: #202124; border: 1px solid #3c4043; border-radius: 6px; padding: 12px 14px; }
    .stat-label { font-size: 11px; color: #9aa0a6; text-transform: uppercase; }
    .stat-val { font-size: 16px; font-weight: 600; margin-top: 4px; color: #e8eaed; font-family: monospace; }
    h2 { font-size: 15px; margin: 24px 0 10px; color: #e8eaed; border-bottom: 1px solid #3c4043; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; background: #202124; border: 1px solid #3c4043; border-radius: 6px; overflow: hidden; font-size: 12px; }
    th, td { padding: 9px 10px; border-bottom: 1px solid #292a2d; text-align: left; }
    th { background: #292a2d; color: #9aa0a6; font-weight: 600; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: rgba(129,201,149,0.15); border: 1px solid rgba(129,201,149,0.4); color: #81c995; font-family: monospace; font-size: 11px; }
    .plots { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 16px; }
    .card { background: #202124; border: 1px solid #3c4043; border-radius: 6px; padding: 12px; }
    .card-title { font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #8ab4f8; }
    .card img { width: 100%; height: auto; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>AMLICS Experiment Report — ${esc(projectName)}</h1>
    <div class="meta">Generated at ${esc(new Date().toLocaleString())} • Task: ${esc(config.taskType)} • Target: <code>${esc(config.targetColumn)}</code></div>

    <div class="grid">
      <div class="stat">
        <div class="stat-label">Dataset</div>
        <div class="stat-val">${esc(dataProfile?.dataset_name || config.uploadedFileName || 'N/A')}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Shape</div>
        <div class="stat-val">${dataProfile ? `${dataProfile.shape[0].toLocaleString()} × ${dataProfile.shape[1]}` : 'N/A'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Active Estimator</div>
        <div class="stat-val">${esc(config.modelFamily)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">CV Strategy</div>
        <div class="stat-val">${esc(config.cvStrategy)} (${config.cvFolds}-fold)</div>
      </div>
    </div>

    <h2>Experiment Leaderboard (${sortedExps.length} runs)</h2>
    ${
      sortedExps.length > 0
        ? `<table>
            <thead>
              <tr>
                <th>Rank</th><th>Model</th><th>Health</th><th>Holdout</th><th>CV</th><th>Preprocessing</th><th>Time</th>
              </tr>
            </thead>
            <tbody>${expRows}</tbody>
          </table>`
        : '<p style="color:#9aa0a6;font-size:13px;">Chưa có experiment nào được ghi nhận.</p>'
    }

    ${
      allFigures.length > 0
        ? `<h2>Diagnostic Plots (${allFigures.length})</h2><div class="plots">${figureCards}</div>`
        : ''
    }
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName || 'AMLICS_Report'}_report.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
