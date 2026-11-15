import { LessonDefinition, TrackDefinition, TrackId } from '../../types/curriculum';
import { CURRICULUM_TRACKS } from './tracks';
import { TRACK01_NUMPY_LESSONS } from './track01_numpy';
import { TRACK02_PANDAS_LESSONS } from './track02_pandas';
import { TRACK03_VIZ_LESSONS } from './track03_viz';
import { TRACK04_PREPROCESS_LESSONS } from './track04_preprocess';
import { TRACK05_FE_LESSONS } from './track05_fe';
import { TRACK06_CV_LESSONS } from './track06_cv';
import { TRACK07_SKLEARN_LESSONS } from './track07_sklearn';
import { TRACK08_BOOSTING_LESSONS } from './track08_boosting';
import { TRACK09_UNSUPERVISED_TS_LESSONS } from './track09_unsupervised_ts';
import { TRACK10_PYTORCH_LESSONS } from './track10_pytorch';
import { TRACK11_TENSORFLOW_LESSONS } from './track11_tensorflow';
import { TRACK12_KAGGLE_LESSONS } from './track12_kaggle';

export { CURRICULUM_TRACKS };

export const ALL_LESSONS: LessonDefinition[] = [
  ...TRACK01_NUMPY_LESSONS,
  ...TRACK02_PANDAS_LESSONS,
  ...TRACK03_VIZ_LESSONS,
  ...TRACK04_PREPROCESS_LESSONS,
  ...TRACK05_FE_LESSONS,
  ...TRACK06_CV_LESSONS,
  ...TRACK07_SKLEARN_LESSONS,
  ...TRACK08_BOOSTING_LESSONS,
  ...TRACK09_UNSUPERVISED_TS_LESSONS,
  ...TRACK10_PYTORCH_LESSONS,
  ...TRACK11_TENSORFLOW_LESSONS,
  ...TRACK12_KAGGLE_LESSONS,
].sort((a, b) => a.order - b.order);

const LESSON_MAP = new Map<string, LessonDefinition>(
  ALL_LESSONS.map((lesson) => [lesson.id, lesson]),
);

export function getLessonById(id: string): LessonDefinition | undefined {
  return LESSON_MAP.get(id);
}

export function getLessonsByTrack(trackId: TrackId): LessonDefinition[] {
  return ALL_LESSONS.filter((lesson) => lesson.trackId === trackId);
}

export function getTrackById(trackId: TrackId): TrackDefinition | undefined {
  return CURRICULUM_TRACKS.find((track) => track.id === trackId);
}
