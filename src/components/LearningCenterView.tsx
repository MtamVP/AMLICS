import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  ExternalLink,
  HelpCircle,
  Lightbulb,
  Menu,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { ALL_LESSONS, CURRICULUM_TRACKS } from '../data/curriculum';
import {
  buildDatasetMaterializerPython,
  CURRICULUM_DATASETS,
} from '../data/curriculumDatasets';
import {
  buildLessonExecutionCode,
  parseGradingResultFromLogs,
} from '../engine/curriculumGrader';
import {
  DifficultyLevel,
  GradingResult,
  LessonDefinition,
  LessonProgressState,
  TrackId,
} from '../types/curriculum';
import { RuntimeMode, WorkerStatus } from '../types/studio';

export interface AdhocPythonExecResult {
  status: 'success' | 'error' | 'stopped';
  durationMs: number;
  stdout: string;
  htmlOutput?: string;
  figures: string[];
}

interface LearningCenterViewProps {
  runtimeMode: RuntimeMode;
  pyodideStatus: WorkerStatus;
  cloudConnected: boolean;
  lessonProgress: Record<string, LessonProgressState>;
  initialLessonId?: string | null;
  onUpdateLessonProgress: (
    lessonId: string,
    patch: Partial<LessonProgressState>,
  ) => void;
  onExecutePython: (code: string) => Promise<AdhocPythonExecResult>;
  onLoadDatasetIntoStudio: (datasetId: string) => Promise<void>;
}

function renderInlineText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$\n]+\$)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#f1f3f4]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[#292a2d] border border-[#3c4043] font-mono text-[12px] text-[#8ab4f8]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return (
        <span
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[#202124] border border-[#3c4043]/70 font-serif italic text-[13px] text-[#fdd663]"
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

const TextbookMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const blocks: Array<
    | { type: 'code'; lang: string; text: string }
    | { type: 'math'; text: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'paragraph'; text: string }
  > = [];

  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'python';
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
      continue;
    }

    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      blocks.push({ type: 'math', text: trimmed.slice(2, -2).trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('$$') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('* ') &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return (
    <div className="space-y-3 text-[14px] leading-7 text-[#d2d6dc]">
      {blocks.map((blk, idx) => {
        if (blk.type === 'code') {
          return (
            <pre
              key={idx}
              className="p-3.5 rounded-md bg-[#161718] border border-[#3c4043] overflow-x-auto font-mono text-[12px] leading-5 text-[#e8eaed]"
            >
              <code>{blk.text}</code>
            </pre>
          );
        }
        if (blk.type === 'math') {
          return (
            <div
              key={idx}
              className="px-4 py-2.5 rounded-md bg-[#18191a] border border-[#3c4043] font-serif italic text-[14px] text-[#fdd663] overflow-x-auto text-center"
            >
              {blk.text}
            </div>
          );
        }
        if (blk.type === 'list') {
          const Tag = blk.ordered ? 'ol' : 'ul';
          return (
            <Tag
              key={idx}
              className={`space-y-1.5 pl-5 ${
                blk.ordered ? 'list-decimal' : 'list-disc'
              } marker:text-[#8ab4f8]`}
            >
              {blk.items.map((item, j) => (
                <li key={j} className="leading-6">
                  {renderInlineText(item)}
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={idx} className="leading-7">
            {renderInlineText(blk.text)}
          </p>
        );
      })}
    </div>
  );
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  'Cơ bản': 'bg-[#81c995]/10 text-[#81c995] border-[#81c995]/30',
  'Trung bình': 'bg-[#8ab4f8]/10 text-[#8ab4f8] border-[#8ab4f8]/30',
  'Nâng cao': 'bg-[#fdd663]/10 text-[#fdd663] border-[#fdd663]/30',
  'Chuyên sâu': 'bg-[#f28b82]/10 text-[#f28b82] border-[#f28b82]/30',
};

export const LearningCenterView: React.FC<LearningCenterViewProps> = ({
  runtimeMode,
  pyodideStatus,
  cloudConnected,
  lessonProgress,
  initialLessonId,
  onUpdateLessonProgress,
  onExecutePython,
  onLoadDatasetIntoStudio,
}) => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(() => {
    if (initialLessonId && ALL_LESSONS.some((l) => l.id === initialLessonId)) {
      return initialLessonId;
    }
    try {
      const saved = localStorage.getItem('amlics_active_lesson_id_v1');
      if (saved && ALL_LESSONS.some((l) => l.id === saved)) return saved;
    } catch {
      // ignore
    }
    return ALL_LESSONS[0]?.id || 'L001';
  });

  const activeLesson: LessonDefinition = useMemo(
    () =>
      ALL_LESSONS.find((l) => l.id === selectedLessonId) || ALL_LESSONS[0],
    [selectedLessonId],
  );

  const activeTrack = useMemo(
    () => CURRICULUM_TRACKS.find((t) => t.id === activeLesson.trackId),
    [activeLesson],
  );

  const [subTab, setSubTab] = useState<'lecture' | 'practice'>('lecture');
  const [syllabusSearch, setSyllabusSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DifficultyLevel>('all');
  const [onlyUnfinished, setOnlyUnfinished] = useState(false);
  const [expandedTracks, setExpandedTracks] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CURRICULUM_TRACKS.forEach((t) => {
      initial[t.id] = t.id === activeLesson.trackId;
    });
    return initial;
  });
  const [mobileSyllabusOpen, setMobileSyllabusOpen] = useState(false);

  // Code editor state for active lesson
  const [codeDraft, setCodeDraft] = useState<string>(() => {
    return (
      lessonProgress[activeLesson.id]?.lastCode ??
      activeLesson.exercise.starterCode
    );
  });
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Execution state
  const [isRunningPractice, setIsRunningPractice] = useState(false);
  const [practiceOutput, setPracticeOutput] = useState<AdhocPythonExecResult | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  // Inline example runner & dataset preview state
  const [runningExampleKey, setRunningExampleKey] = useState<string | null>(null);
  const [exampleOutputs, setExampleOutputs] = useState<Record<string, AdhocPythonExecResult>>({});
  const [previewingDatasetId, setPreviewingDatasetId] = useState<string | null>(null);
  const [datasetPreviews, setDatasetPreviews] = useState<Record<string, AdhocPythonExecResult>>({});
  const [loadingStudioDatasetId, setLoadingStudioDatasetId] = useState<string | null>(null);

  // Sync draft & reset transient panels when changing lesson
  useEffect(() => {
    try {
      localStorage.setItem('amlics_active_lesson_id_v1', activeLesson.id);
    } catch {
      // ignore
    }
    setExpandedTracks((prev) => ({ ...prev, [activeLesson.trackId]: true }));
    setCodeDraft(
      lessonProgress[activeLesson.id]?.lastCode ??
        activeLesson.exercise.starterCode,
    );
    setShowHint(false);
    setShowSolution(false);
    setPracticeOutput(null);
    setGradingResult(null);
  }, [activeLesson.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = useMemo(
    () => ALL_LESSONS.filter((l) => lessonProgress[l.id]?.completed).length,
    [lessonProgress],
  );
  const completionPct = Math.round(
    (completedCount / Math.max(1, ALL_LESSONS.length)) * 100,
  );

  const filteredLessonsByTrack = useMemo(() => {
    const q = syllabusSearch.trim().toLowerCase();
    const map = new Map<TrackId, LessonDefinition[]>();
    CURRICULUM_TRACKS.forEach((t) => map.set(t.id, []));

    for (const lesson of ALL_LESSONS) {
      if (difficultyFilter !== 'all' && lesson.difficulty !== difficultyFilter) {
        continue;
      }
      if (onlyUnfinished && lessonProgress[lesson.id]?.completed) {
        continue;
      }
      if (q) {
        const hay = `${lesson.id} ${lesson.title} ${lesson.subtitle} ${lesson.libraries.join(' ')} ${lesson.datasetIds.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      map.get(lesson.trackId)?.push(lesson);
    }
    return map;
  }, [syllabusSearch, difficultyFilter, onlyUnfinished, lessonProgress]);

  const currentIdx = ALL_LESSONS.findIndex((l) => l.id === activeLesson.id);
  const prevLesson = currentIdx > 0 ? ALL_LESSONS[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < ALL_LESSONS.length - 1
      ? ALL_LESSONS[currentIdx + 1]
      : null;

  const isRuntimeReady =
    runtimeMode === 'cloud'
      ? cloudConnected
      : pyodideStatus === 'idle';

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setMobileSyllabusOpen(false);
  };

  const handleCodeChange = (nextVal: string) => {
    setCodeDraft(nextVal);
    onUpdateLessonProgress(activeLesson.id, { lastCode: nextVal });
  };

  const handleRunPractice = async (autoGrade: boolean) => {
    if (isRunningPractice) return;
    setIsRunningPractice(true);
    setGradingResult(null);
    try {
      const fullCode = buildLessonExecutionCode(activeLesson, codeDraft, autoGrade);
      const res = await onExecutePython(fullCode);
      setPracticeOutput(res);

      const parsed = parseGradingResultFromLogs(res.stdout);
      if (parsed) {
        setGradingResult(parsed);
        onUpdateLessonProgress(activeLesson.id, {
          lastCode: codeDraft,
          attempts: (lessonProgress[activeLesson.id]?.attempts || 0) + 1,
          ...(parsed.passed
            ? {
                completed: true,
                completedAt:
                  lessonProgress[activeLesson.id]?.completedAt || Date.now(),
              }
            : {}),
        });
      } else if (res.status === 'error' && autoGrade) {
        setGradingResult({
          passed: false,
          message: 'Code phát sinh ngoại lệ Python trước khi chạy tới bước chấm điểm.',
          checkedAt: Date.now(),
        });
      }
    } finally {
      setIsRunningPractice(false);
    }
  };

  const handleRunSectionExample = async (sectionIdx: number, exampleCode: string) => {
    const key = `${activeLesson.id}_sec_${sectionIdx}`;
    setRunningExampleKey(key);
    try {
      const prepCode = `${buildDatasetMaterializerPython(activeLesson.datasetIds)}\n${exampleCode}`;
      const res = await onExecutePython(prepCode);
      setExampleOutputs((prev) => ({ ...prev, [key]: res }));
    } finally {
      setRunningExampleKey(null);
    }
  };

  const handlePreviewDataset = async (datasetId: string) => {
    const ds = CURRICULUM_DATASETS[datasetId];
    if (!ds) return;
    setPreviewingDatasetId(datasetId);
    try {
      const code = `${buildDatasetMaterializerPython([datasetId])}
_df_preview = pd.read_csv('${ds.fileName}')
print(f"File: ${ds.fileName} | Shape: {_df_preview.shape[0]} rows x {_df_preview.shape[1]} cols | Missing cells: {int(_df_preview.isna().sum().sum())}")
_df_preview.head(6)`;
      const res = await onExecutePython(code);
      setDatasetPreviews((prev) => ({ ...prev, [datasetId]: res }));
    } finally {
      setPreviewingDatasetId(null);
    }
  };

  const handleOpenDatasetInStudio = async (datasetId: string) => {
    setLoadingStudioDatasetId(datasetId);
    try {
      await onLoadDatasetIntoStudio(datasetId);
    } finally {
      setLoadingStudioDatasetId(null);
    }
  };

  const handleOpenSeparateTab = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'learn');
      url.searchParams.set('lesson', activeLesson.id);
      window.open(url.toString(), '_blank', 'noopener');
    } catch {
      window.open(`?mode=learn&lesson=${encodeURIComponent(activeLesson.id)}`, '_blank');
    }
  };

  const renderSyllabusContent = () => (
    <div className="flex flex-col h-full bg-[#1b1c1e] border-r border-[#3c4043] select-none">
      {/* Progress Overview */}
      <div className="p-3.5 border-b border-[#3c4043] bg-[#202124]">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-[#e8eaed] tracking-tight">
            Lộ trình ML A–Z
          </span>
          <span className="font-mono text-[11px] text-[#81c995]">
            {completedCount}/{ALL_LESSONS.length} ({completionPct}%)
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#303134] overflow-hidden">
          <div
            className="h-full bg-[#81c995] transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          />
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-[#9aa0a6] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={syllabusSearch}
            onChange={(e) => setSyllabusSearch(e.target.value)}
            placeholder="Tìm bài học, sklearn, pytorch..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#18191a] border border-[#3c4043] rounded text-[#e8eaed] placeholder:text-[#787d84] focus:outline-none focus:border-[#8ab4f8]"
          />
        </div>

        {/* Filters */}
        <div className="mt-2 flex flex-wrap gap-1">
          {(['all', 'Cơ bản', 'Trung bình', 'Nâng cao', 'Chuyên sâu'] as const).map(
            (lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDifficultyFilter(lvl)}
                className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                  difficultyFilter === lvl
                    ? 'bg-[#8ab4f8]/20 text-[#8ab4f8] border-[#8ab4f8]/50'
                    : 'bg-[#18191a] text-[#9aa0a6] border-[#3c4043] hover:text-[#e8eaed]'
                }`}
              >
                {lvl === 'all' ? 'Tất cả' : lvl}
              </button>
            ),
          )}
        </div>
        <label className="mt-2 flex items-center gap-1.5 text-[11px] text-[#9aa0a6] cursor-pointer">
          <input
            type="checkbox"
            checked={onlyUnfinished}
            onChange={(e) => setOnlyUnfinished(e.target.checked)}
            className="rounded border-[#3c4043] bg-[#18191a] accent-[#8ab4f8]"
          />
          <span>Chỉ hiện bài chưa hoàn thành</span>
        </label>
      </div>

      {/* Tracks Accordion */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {CURRICULUM_TRACKS.map((track) => {
          const allInTrack = ALL_LESSONS.filter((l) => l.trackId === track.id);
          const visibleInTrack = filteredLessonsByTrack.get(track.id) || [];
          if (
            (syllabusSearch.trim() || difficultyFilter !== 'all' || onlyUnfinished) &&
            visibleInTrack.length === 0
          ) {
            return null;
          }
          const trackDone = allInTrack.filter(
            (l) => lessonProgress[l.id]?.completed,
          ).length;
          const isOpen =
            Boolean(syllabusSearch.trim()) ||
            difficultyFilter !== 'all' ||
            onlyUnfinished ||
            Boolean(expandedTracks[track.id]);

          return (
            <div
              key={track.id}
              className="rounded border border-[#3c4043]/80 bg-[#202124]/70 overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedTracks((prev) => ({
                    ...prev,
                    [track.id]: !prev[track.id],
                  }))
                }
                className="w-full px-2.5 py-2 flex items-start justify-between gap-2 text-left hover:bg-[#292a2d] transition-colors"
              >
                <div className="flex items-start gap-1.5 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6] mt-0.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6] mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-semibold text-[#8ab4f8]">
                        {String(track.order).padStart(2, '0')}
                      </span>
                      <span className="text-[12px] font-semibold text-[#e8eaed] truncate">
                        {track.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#9aa0a6] truncate mt-0.5">
                      {track.levelRange}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    trackDone === allInTrack.length && allInTrack.length > 0
                      ? 'bg-[#81c995]/15 text-[#81c995]'
                      : 'bg-[#303134] text-[#9aa0a6]'
                  }`}
                >
                  {trackDone}/{allInTrack.length}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-[#3c4043]/60 divide-y divide-[#3c4043]/40 bg-[#18191a]/60">
                  {visibleInTrack.map((lesson) => {
                    const isActive = lesson.id === activeLesson.id;
                    const isDone = Boolean(lessonProgress[lesson.id]?.completed);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => handleSelectLesson(lesson.id)}
                        className={`w-full px-3 py-2 text-left flex items-start gap-2 transition-colors ${
                          isActive
                            ? 'bg-[#8ab4f8]/15 border-l-2 border-[#8ab4f8]'
                            : 'hover:bg-[#292a2d]/70 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#81c995]" />
                          ) : (
                            <span
                              className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border text-[8px] font-mono ${
                                isActive
                                  ? 'border-[#8ab4f8] text-[#8ab4f8]'
                                  : 'border-[#5f6368] text-[#9aa0a6]'
                              }`}
                            >
                              {lesson.order}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-[11.5px] leading-snug font-medium ${
                              isActive ? 'text-[#8ab4f8]' : 'text-[#e8eaed]'
                            }`}
                          >
                            {lesson.title}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#9aa0a6] font-mono">
                            <span>{lesson.id}</span>
                            <span>•</span>
                            <span>{lesson.estimatedMinutes}p</span>
                            <span>•</span>
                            <span className="truncate">{lesson.libraries.join(', ')}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-[#18191a] text-[#e8eaed] relative">
      {/* Desktop Syllabus Sidebar */}
      <aside className="hidden lg:block w-[300px] xl:w-[330px] shrink-0 h-full overflow-hidden">
        {renderSyllabusContent()}
      </aside>

      {/* Mobile / Tablet Syllabus Drawer */}
      {mobileSyllabusOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileSyllabusOpen(false)}
          />
          <div className="relative z-10 w-[300px] max-w-[85vw] h-full shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileSyllabusOpen(false)}
              className="absolute top-3 right-3 z-20 p-1 rounded bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed]"
              aria-label="Đóng danh sách bài học"
            >
              <X className="w-4 h-4" />
            </button>
            {renderSyllabusContent()}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Lesson Top Header */}
        <div className="px-4 sm:px-6 py-3 bg-[#202124] border-b border-[#3c4043] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSyllabusOpen(true)}
              className="lg:hidden p-1.5 rounded border border-[#3c4043] bg-[#292a2d] text-[#e8eaed] hover:bg-[#35363a] mt-0.5 shrink-0"
              title="Mở mục lục 108 bài"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#9aa0a6]">
                <span className="font-mono text-[#8ab4f8]">
                  Track {String(activeTrack?.order || 1).padStart(2, '0')}
                </span>
                <span>/</span>
                <span className="truncate">{activeTrack?.title}</span>
                <span>•</span>
                <span className="font-mono text-[#e8eaed]">
                  Bài {activeLesson.order}/{ALL_LESSONS.length}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                    DIFFICULTY_STYLES[activeLesson.difficulty]
                  }`}
                >
                  {activeLesson.difficulty}
                </span>
                {lessonProgress[activeLesson.id]?.completed && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#81c995]/15 text-[#81c995] border border-[#81c995]/30 text-[10px] font-medium">
                    <Check className="w-3 h-3" />
                    Đã hoàn thành
                  </span>
                )}
              </div>

              <h1 className="text-base sm:text-lg font-semibold text-[#f1f3f4] leading-snug mt-0.5">
                {activeLesson.title}
              </h1>
              <p className="text-xs text-[#9aa0a6] mt-0.5">
                {activeLesson.subtitle}
              </p>
            </div>
          </div>

          {/* Right Controls: Sub-Tab Toggle, Open Tab, Prev/Next */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-md bg-[#18191a] p-0.5 border border-[#3c4043]">
              <button
                type="button"
                onClick={() => setSubTab('lecture')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  subTab === 'lecture'
                    ? 'bg-[#303134] text-[#8ab4f8] shadow-sm'
                    : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Bài giảng (Lý thuyết)</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('practice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  subTab === 'practice'
                    ? 'bg-[#303134] text-[#81c995] shadow-sm'
                    : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Thực hành &amp; Chấm điểm</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenSeparateTab}
              title="Mở giao trình này ra một tab trình duyệt độc lập"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-[#292a2d] hover:bg-[#35363a] text-[#e8eaed] border border-[#3c4043] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#9aa0a6]" />
              <span>Mở tab mới</span>
            </button>

            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={!prevLesson}
                onClick={() => prevLesson && handleSelectLesson(prevLesson.id)}
                title={prevLesson ? `Bài trước: ${prevLesson.title}` : 'Đây là bài đầu tiên'}
                className="p-1.5 rounded bg-[#292a2d] hover:bg-[#35363a] disabled:opacity-35 border border-[#3c4043] text-[#e8eaed]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!nextLesson}
                onClick={() => nextLesson && handleSelectLesson(nextLesson.id)}
                title={nextLesson ? `Bài kế tiếp: ${nextLesson.title}` : 'Đây là bài cuối cùng'}
                className="p-1.5 rounded bg-[#292a2d] hover:bg-[#35363a] disabled:opacity-35 border border-[#3c4043] text-[#e8eaed]"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Tab 1: Lecture (Textbook View) */}
        {subTab === 'lecture' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 py-6">
            <div className="max-w-4xl mx-auto space-y-6 pb-10">
              {/* Metadata Bar: Libraries & Datasets */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#9aa0a6]">Thư viện trọng tâm:</span>
                {activeLesson.libraries.map((lib) => (
                  <span
                    key={lib}
                    className="px-2 py-0.5 rounded bg-[#292a2d] border border-[#3c4043] font-mono text-[11px] text-[#e8eaed]"
                  >
                    {lib}
                  </span>
                ))}
                <span className="text-[#5f6368] mx-1">|</span>
                <span className="text-[#9aa0a6]">Thời lượng ước tính:</span>
                <span className="font-mono text-[#e8eaed]">
                  {activeLesson.estimatedMinutes} phút
                </span>
              </div>

              {/* Objectives Card */}
              <section className="p-4 rounded-lg bg-[#202124] border border-[#3c4043]">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8ab4f8] mb-2.5">
                  Mục tiêu bài học
                </h2>
                <ul className="space-y-1.5">
                  {activeLesson.objectives.map((obj, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-[13.5px] text-[#d2d6dc] leading-6"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#81c995] mt-1 shrink-0" />
                      <span>{renderInlineText(obj)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Datasets Card */}
              {activeLesson.datasetIds.length > 0 && (
                <section className="p-4 rounded-lg bg-[#202124] border border-[#3c4043]">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#8ab4f8]" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#e8eaed]">
                        Dataset sử dụng trong bài ({activeLesson.datasetIds.length})
                      </h2>
                    </div>
                    <span className="text-[11px] text-[#9aa0a6]">
                      Tự động nạp sẵn vào thư mục làm việc khi chạy code
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeLesson.datasetIds.map((dsId) => {
                      const ds = CURRICULUM_DATASETS[dsId];
                      if (!ds) return null;
                      const previewRes = datasetPreviews[dsId];
                      const isPreviewLoading = previewingDatasetId === dsId;
                      const isLoadingStudio = loadingStudioDatasetId === dsId;
                      return (
                        <div
                          key={dsId}
                          className="p-3 rounded bg-[#18191a] border border-[#3c4043]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-[#81c995]">
                                  {ds.fileName}
                                </span>
                                <span className="text-xs font-medium text-[#e8eaed]">
                                  — {ds.title}
                                </span>
                              </div>
                              <p className="text-xs text-[#9aa0a6] mt-0.5">
                                {ds.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={!isRuntimeReady || isPreviewLoading}
                                onClick={() => handlePreviewDataset(dsId)}
                                className="px-2.5 py-1 rounded text-xs bg-[#292a2d] hover:bg-[#35363a] disabled:opacity-40 border border-[#3c4043] text-[#e8eaed] transition-colors"
                              >
                                {isPreviewLoading
                                  ? 'Đang tải...'
                                  : 'Xem trước 6 dòng'}
                              </button>
                              <button
                                type="button"
                                disabled={!isRuntimeReady || isLoadingStudio}
                                onClick={() => handleOpenDatasetInStudio(dsId)}
                                title="Nạp bộ dữ liệu này sang Studio Pipeline để thử nghiệm AutoML"
                                className="px-2.5 py-1 rounded text-xs bg-[#8ab4f8]/15 hover:bg-[#8ab4f8]/25 disabled:opacity-40 border border-[#8ab4f8]/40 text-[#8ab4f8] transition-colors"
                              >
                                {isLoadingStudio
                                  ? 'Đang nạp...'
                                  : 'Nạp vào Studio'}
                              </button>
                            </div>
                          </div>

                          {previewRes && (
                            <div className="mt-3 pt-2.5 border-t border-[#3c4043]/70 space-y-2">
                              {previewRes.stdout && (
                                <pre className="text-[11px] font-mono text-[#9aa0a6] whitespace-pre-wrap">
                                  {previewRes.stdout.trim()}
                                </pre>
                              )}
                              {previewRes.htmlOutput && (
                                <div
                                  className="overflow-x-auto text-xs"
                                  dangerouslySetInnerHTML={{
                                    __html: previewRes.htmlOutput,
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Textbook Sections */}
              <div className="space-y-6">
                {activeLesson.sections.map((sec, idx) => {
                  const exKey = `${activeLesson.id}_sec_${idx}`;
                  const exOut = exampleOutputs[exKey];
                  const isExRunning = runningExampleKey === exKey;

                  return (
                    <article
                      key={idx}
                      className="p-5 sm:p-6 rounded-lg bg-[#202124] border border-[#3c4043] space-y-4"
                    >
                      <h2 className="text-base sm:text-[17px] font-semibold text-[#f1f3f4] border-b border-[#3c4043]/80 pb-2">
                        {sec.title}
                      </h2>

                      <TextbookMarkdown content={sec.contentMarkdown} />

                      {sec.callout && (
                        <div
                          className={`p-3.5 rounded-md border text-xs leading-6 ${
                            sec.callout.type === 'warning'
                              ? 'bg-[#f28b82]/10 border-[#f28b82]/40 text-[#fad2cf]'
                              : sec.callout.type === 'formula'
                              ? 'bg-[#fdd663]/10 border-[#fdd663]/40 text-[#feefc3]'
                              : sec.callout.type === 'tip'
                              ? 'bg-[#81c995]/10 border-[#81c995]/40 text-[#ceead6]'
                              : 'bg-[#8ab4f8]/10 border-[#8ab4f8]/40 text-[#d2e3fc]'
                          }`}
                        >
                          <div className="font-semibold mb-0.5 uppercase tracking-wide text-[11px]">
                            {sec.callout.title}
                          </div>
                          <div>{renderInlineText(sec.callout.text)}</div>
                        </div>
                      )}

                      {sec.exampleCode && (
                        <div className="rounded-md border border-[#3c4043] overflow-hidden bg-[#161718]">
                          <div className="px-3 py-1.5 bg-[#292a2d] border-b border-[#3c4043] flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#9aa0a6]">
                              Ví dụ minh họa thực thi được
                            </span>
                            <button
                              type="button"
                              disabled={!isRuntimeReady || isExRunning}
                              onClick={() =>
                                handleRunSectionExample(idx, sec.exampleCode!)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-[#8ab4f8] hover:bg-[#aecbfa] disabled:opacity-40 text-[#202124] transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>
                                {isExRunning ? 'Đang chạy...' : 'Chạy thử ví dụ'}
                              </span>
                            </button>
                          </div>
                          <pre className="p-3.5 overflow-x-auto font-mono text-[12px] leading-5 text-[#e8eaed]">
                            <code>{sec.exampleCode}</code>
                          </pre>

                          {exOut && (
                            <div className="border-t border-[#3c4043] bg-[#141516] p-3 space-y-2.5">
                              {exOut.stdout && (
                                <pre className="font-mono text-[12px] text-[#d2d6dc] whitespace-pre-wrap">
                                  {exOut.stdout}
                                </pre>
                              )}
                              {exOut.htmlOutput && (
                                <div
                                  className="overflow-x-auto text-xs"
                                  dangerouslySetInnerHTML={{
                                    __html: exOut.htmlOutput,
                                  }}
                                />
                              )}
                              {exOut.figures.length > 0 && (
                                <div className="grid grid-cols-1 gap-3">
                                  {exOut.figures.map((b64, fIdx) => (
                                    <img
                                      key={fIdx}
                                      src={`data:image/png;base64,${b64}`}
                                      alt={`Example figure ${fIdx + 1}`}
                                      className="max-w-full rounded border border-[#3c4043] bg-white"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Bottom CTA to Practice Lab */}
              <div className="p-5 rounded-lg bg-[#202124] border border-[#81c995]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#f1f3f4]">
                    Sẵn sàng thực hành bài tập tự chấm điểm?
                  </h3>
                  <p className="text-xs text-[#9aa0a6] mt-0.5">
                    Chuyển sang giao diện Notebook tương tác để viết code, gọi{' '}
                    <code className="font-mono text-[#8ab4f8]">q1.hint()</code> và tự chấm điểm ngay bằng{' '}
                    <code className="font-mono text-[#81c995]">q1.check()</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubTab('practice')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-[#81c995] hover:bg-[#a8dab5] text-[#18191a] transition-colors shrink-0"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Mở Phòng Thực hành Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab 2: Kaggle-style Practice Lab & Auto-Grader */}
        {subTab === 'practice' && (
          <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
            {/* Left / Top Column: Exercise Brief, Requirements, Hints & Solution */}
            <div className="xl:w-[380px] 2xl:w-[420px] shrink-0 border-b xl:border-b-0 xl:border-r border-[#3c4043] bg-[#202124] overflow-y-auto custom-scrollbar p-4 space-y-4 max-h-[38vh] xl:max-h-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#81c995]">
                  Đề bài thực hành ({activeLesson.id})
                </span>
                <button
                  type="button"
                  onClick={() => setSubTab('lecture')}
                  className="text-[11px] text-[#8ab4f8] hover:underline"
                >
                  Xem lại bài giảng
                </button>
              </div>

              <p className="text-[13.5px] leading-6 text-[#e8eaed]">
                {renderInlineText(activeLesson.exercise.prompt)}
              </p>

              <div className="p-3 rounded bg-[#18191a] border border-[#3c4043] space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa0a6]">
                  Tiêu chí hệ thống chấm điểm
                </div>
                <ul className="space-y-1.5">
                  {activeLesson.exercise.requirements.map((req, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs leading-5 text-[#d2d6dc]"
                    >
                      <span className="font-mono text-[#8ab4f8] mt-0.5 shrink-0">
                        #{idx + 1}
                      </span>
                      <span>{renderInlineText(req)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Active Datasets Summary */}
              {activeLesson.datasetIds.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa0a6]">
                    File dữ liệu khả dụng trong Python
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLesson.datasetIds.map((id) => {
                      const ds = CURRICULUM_DATASETS[id];
                      if (!ds) return null;
                      return (
                        <span
                          key={id}
                          title={ds.description}
                          className="px-2 py-1 rounded bg-[#18191a] border border-[#3c4043] font-mono text-[11px] text-[#8ab4f8]"
                        >
                          {ds.fileName}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hints & Solution Buttons */}
              <div className="pt-2 border-t border-[#3c4043] space-y-2.5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHint((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors ${
                      showHint
                        ? 'bg-[#fdd663]/15 text-[#fdd663] border-[#fdd663]/40'
                        : 'bg-[#292a2d] text-[#e8eaed] border-[#3c4043] hover:bg-[#35363a]'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Ẩn gợi ý' : 'Gợi ý (q1.hint())'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSolution((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors ${
                      showSolution
                        ? 'bg-[#8ab4f8]/15 text-[#8ab4f8] border-[#8ab4f8]/40'
                        : 'bg-[#292a2d] text-[#e8eaed] border-[#3c4043] hover:bg-[#35363a]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {showSolution ? 'Ẩn lời giải' : 'Lời giải mẫu (q1.solution())'}
                    </span>
                  </button>
                </div>

                {showHint && (
                  <div className="p-3 rounded bg-[#fdd663]/10 border border-[#fdd663]/40 text-xs leading-6 text-[#feefc3]">
                    <div className="font-semibold mb-1 text-[11px] uppercase">
                      Gợi ý triển khai
                    </div>
                    <div>{renderInlineText(activeLesson.exercise.hintText)}</div>
                  </div>
                )}

                {showSolution && (
                  <div className="rounded border border-[#8ab4f8]/40 bg-[#161718] overflow-hidden">
                    <div className="px-3 py-1.5 bg-[#292a2d] border-b border-[#3c4043] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#8ab4f8]">
                        Code lời giải chuẩn
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCodeChange(activeLesson.exercise.solutionCode)
                        }
                        className="px-2 py-0.5 rounded text-[11px] bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] font-medium"
                      >
                        Nạp vào Editor
                      </button>
                    </div>
                    <pre className="p-3 overflow-x-auto font-mono text-[11.5px] leading-5 text-[#e8eaed]">
                      <code>{activeLesson.exercise.solutionCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Monaco Editor + Toolbar + Grader Verdict + Output */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#18191a]">
              {/* Code Toolbar */}
              <div className="px-4 py-2 bg-[#202124] border-b border-[#3c4043] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-[#9aa0a6]">
                    practice_{activeLesson.id.toLowerCase()}.py
                  </span>
                  {!isRuntimeReady && (
                    <span className="px-2 py-0.5 rounded bg-[#fdd663]/15 text-[#fdd663] border border-[#fdd663]/30 text-[10px]">
                      {runtimeMode === 'cloud'
                        ? 'Chưa kết nối Colab/Kaggle Worker'
                        : 'Đang khởi tạo Pyodide Python...'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCodeChange(activeLesson.exercise.starterCode)}
                    title="Đưa code về mẫu ban đầu của bài tập"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043] text-[#9aa0a6] hover:text-[#e8eaed]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Code</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isRuntimeReady || isRunningPractice}
                    onClick={() => handleRunPractice(false)}
                    title="Chạy thử code (chưa chấm điểm q1.check() trừ khi bạn tự gọi trong code)"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-[#292a2d] hover:bg-[#35363a] disabled:opacity-40 border border-[#3c4043] text-[#e8eaed]"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Chỉ chạy Code</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isRuntimeReady || isRunningPractice}
                    onClick={() => handleRunPractice(true)}
                    title="Thực thi code và tự động chạy q1.check() (Shift+Enter)"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#81c995] hover:bg-[#a8dab5] disabled:opacity-40 text-[#18191a] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isRunningPractice
                        ? 'Đang chạy & chấm điểm...'
                        : 'Chạy & Chấm điểm (q1.check)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Split Vertical: Monaco Editor + Console/Grading Output */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-[48%] min-h-[200px] border-b border-[#3c4043]">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    language="python"
                    theme="vs-dark"
                    value={codeDraft}
                    onChange={(v) => handleCodeChange(v ?? '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 4,
                      wordWrap: 'on',
                      padding: { top: 10, bottom: 10 },
                    }}
                    onMount={(editor, monaco) => {
                      editor.addCommand(
                        monaco.KeyMod.Shift | monaco.KeyCode.Enter,
                        () => {
                          void handleRunPractice(true);
                        },
                      );
                      editor.addCommand(
                        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                        () => {
                          void handleRunPractice(true);
                        },
                      );
                    }}
                  />
                </div>

                {/* Output & Auto-Grader Panel */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-[#141516]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#9aa0a6]">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>KẾT QUẢ THỰC THI &amp; CHẤM ĐIỂM TỰ ĐỘNG</span>
                    </div>
                    {practiceOutput && (
                      <span>{practiceOutput.durationMs} ms</span>
                    )}
                  </div>

                  {/* Grading Result Banner */}
                  {gradingResult && (
                    <div
                      className={`p-3.5 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        gradingResult.passed
                          ? 'bg-[#81c995]/15 border-[#81c995]/50 text-[#ceead6]'
                          : 'bg-[#f28b82]/15 border-[#f28b82]/50 text-[#fad2cf]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs uppercase tracking-wide">
                          {gradingResult.passed
                            ? 'CORRECT — Hoàn thành xuất sắc bài thực hành'
                            : 'CHƯA ĐẠT — Cần chỉnh sửa lại code'}
                        </div>
                        <div className="text-xs mt-1 font-mono">
                          {gradingResult.message}
                        </div>
                      </div>
                      {gradingResult.passed && nextLesson && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectLesson(nextLesson.id);
                            setSubTab('lecture');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#81c995] hover:bg-[#a8dab5] text-[#18191a] shrink-0"
                        >
                          <span>Sang bài tiếp ({nextLesson.id})</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {!practiceOutput ? (
                    <div className="p-4 rounded border border-dashed border-[#3c4043] text-xs text-[#9aa0a6]">
                      Nhấn{' '}
                      <strong className="text-[#81c995]">
                        Chạy &amp; Chấm điểm (Shift+Enter)
                      </strong>{' '}
                      để thực thi Python trên dữ liệu thật của bài học và kiểm tra toàn bộ tiêu chí tự động.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {practiceOutput.stdout && (
                        <pre className="p-3 rounded bg-[#18191a] border border-[#3c4043] font-mono text-[12px] leading-5 text-[#e8eaed] whitespace-pre-wrap overflow-x-auto">
                          {practiceOutput.stdout}
                        </pre>
                      )}
                      {practiceOutput.htmlOutput && (
                        <div
                          className="p-2 rounded bg-[#18191a] border border-[#3c4043] overflow-x-auto text-xs"
                          dangerouslySetInnerHTML={{
                            __html: practiceOutput.htmlOutput,
                          }}
                        />
                      )}
                      {practiceOutput.figures.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {practiceOutput.figures.map((b64, i) => (
                            <img
                              key={i}
                              src={`data:image/png;base64,${b64}`}
                              alt={`Practice figure ${i + 1}`}
                              className="w-full rounded border border-[#3c4043] bg-white"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
