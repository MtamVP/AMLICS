import { buildDatasetMaterializerPython } from '../data/curriculumDatasets';
import { GradingResult, LessonDefinition } from '../types/curriculum';

export function buildLessonSetupPython(lesson: LessonDefinition): string {
  const datasetPy = buildDatasetMaterializerPython(lesson.datasetIds);
  const hintJson = JSON.stringify(lesson.exercise.hintText);
  const solutionJson = JSON.stringify(lesson.exercise.solutionCode);
  const checkJson = JSON.stringify(lesson.exercise.checkPython);
  const titleJson = JSON.stringify(lesson.title);

  return `${datasetPy}
import json as _json

class _AmlicsQuestionGrader:
    def __init__(self, title, hint_text, solution_text, check_code):
        self._title = title
        self._hint_text = hint_text
        self._solution_text = solution_text
        self._check_code = check_code

    def hint(self):
        print("\\n[GỢI Ý - " + self._title + "]")
        print(self._hint_text)

    def solution(self):
        print("\\n[LỜI GIẢI MẪU - " + self._title + "]")
        print(self._solution_text)

    def check(self):
        try:
            exec(compile(self._check_code, "<amlics_grader>", "exec"), globals())
            _msg = "Correct! Bạn đã hoàn thành chính xác yêu cầu bài học."
            print("\\n" + _msg)
            print("__AMLICS_GRADE__:" + _json.dumps({"passed": True, "message": _msg}))
            return True
        except AssertionError as _ae:
            _detail = str(_ae).strip() or "Kết quả chưa khớp với yêu cầu kiểm tra."
            _msg = "Incorrect: " + _detail + " (Bấm 'Gợi ý' hoặc gọi q1.hint() để xem hướng dẫn)"
            print("\\n" + _msg)
            print("__AMLICS_GRADE__:" + _json.dumps({"passed": False, "message": _msg}))
            return False
        except Exception as _ex:
            _msg = f"Incorrect: {type(_ex).__name__}: {_ex}"
            print("\\n" + _msg)
            print("__AMLICS_GRADE__:" + _json.dumps({"passed": False, "message": _msg}))
            return False

q1 = _AmlicsQuestionGrader(${titleJson}, ${hintJson}, ${solutionJson}, ${checkJson})
grader = q1
`;
}

export function buildLessonExecutionCode(
  lesson: LessonDefinition,
  userCode: string,
  autoGrade: boolean
): string {
  const setup = buildLessonSetupPython(lesson);
  const hasExplicitCheck = /\bq1\.check\s*\(|\bgrader\.check\s*\(/.test(userCode);
  const tail = autoGrade && !hasExplicitCheck ? '\nq1.check()\n' : '';
  return `${setup}\n# === USER CODE ===\n${userCode}\n${tail}`;
}

export function parseGradingResultFromLogs(logText: string): GradingResult | null {
  const lines = logText.split(/\r?\n/);
  let latest: GradingResult | null = null;
  for (const line of lines) {
    const idx = line.indexOf('__AMLICS_GRADE__:');
    if (idx !== -1) {
      const jsonPart = line.slice(idx + '__AMLICS_GRADE__:'.length).trim();
      try {
        const parsed = JSON.parse(jsonPart) as { passed: boolean; message: string };
        latest = {
          passed: Boolean(parsed.passed),
          message: String(parsed.message || ''),
          checkedAt: Date.now(),
        };
      } catch {
        // ignore malformed marker
      }
    }
  }
  return latest;
}
