export interface Movie {
  id: number;
  title: string;
  year: number;
  imageUrl: string;
  tmdbId: number;
  options: string[];
  correctIndex: number;
  genre: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const TMDB_KEY = 'e789191df94eb3e69769eb98236c09b6';
export const TMDB_IMG = 'https://image.tmdb.org/t/p/w1280';
export const TMDB_API = `https://api.themoviedb.org/3`;
export const getApiKey = () => TMDB_KEY;

export const movies: Movie[] = [
  {
    id: 1, tmdbId: 278,
    title: "Побег из Шоушенка", year: 1994,
    imageUrl: '',
    options: ["Побег из Шоушенка", "Зелёная миля", "Список Шиндлера", "Семь"],
    correctIndex: 0, genre: "Драма", difficulty: 'easy',
  },
  {
    id: 2, tmdbId: 238,
    title: "Крёстный отец", year: 1972,
    imageUrl: '',
    options: ["Лицо со шрамом", "Однажды в Америке", "Крёстный отец", "Прощай, детка, прощай"],
    correctIndex: 2, genre: "Криминал", difficulty: 'easy',
  },
  {
    id: 3, tmdbId: 155,
    title: "Тёмный рыцарь", year: 2008,
    imageUrl: '',
    options: ["Бэтмен навсегда", "Тёмный рыцарь", "Хранители", "Железный человек"],
    correctIndex: 1, genre: "Экшн", difficulty: 'medium',
  },
  {
    id: 4, tmdbId: 424,
    title: "Список Шиндлера", year: 1993,
    imageUrl: '',
    options: ["Список Шиндлера", "Пианист", "Жизнь прекрасна", "Мальчик в полосатой пижаме"],
    correctIndex: 0, genre: "Драма", difficulty: 'medium',
  },
  {
    id: 5, tmdbId: 27205,
    title: "Начало", year: 2010,
    imageUrl: '',
    options: ["Матрица", "Интерстеллар", "Начало", "Довод"],
    correctIndex: 2, genre: "Фантастика", difficulty: 'hard',
  },
  {
    id: 6, tmdbId: 157336,
    title: "Интерстеллар", year: 2014,
    imageUrl: '',
    options: ["Гравитация", "Марсианин", "Интерстеллар", "Прибытие"],
    correctIndex: 2, genre: "Фантастика", difficulty: 'medium',
  },
  {
    id: 7, tmdbId: 13,
    title: "Форрест Гамп", year: 1994,
    imageUrl: '',
    options: ["Жизнь прекрасна", "Форрест Гамп", "Человек дождя", "Эффект бабочки"],
    correctIndex: 1, genre: "Драма", difficulty: 'easy',
  },
  {
    id: 8, tmdbId: 603,
    title: "Матрица", year: 1999,
    imageUrl: '',
    options: ["Матрица", "Бегущий по лезвию", "Экзистенция", "Тёмный город"],
    correctIndex: 0, genre: "Фантастика", difficulty: 'easy',
  },
  {
    id: 9, tmdbId: 120,
    title: "Властелин колец", year: 2001,
    imageUrl: '',
    options: ["Хоббит", "Властелин колец", "Хроники Нарнии", "Эрагон"],
    correctIndex: 1, genre: "Фэнтези", difficulty: 'easy',
  },
  {
    id: 10, tmdbId: 680,
    title: "Криминальное чтиво", year: 1994,
    imageUrl: '',
    options: ["Бешеные псы", "От заката до рассвета", "Криминальное чтиво", "Джанго освобождённый"],
    correctIndex: 2, genre: "Криминал", difficulty: 'medium',
  },
  {
    id: 11, tmdbId: 98,
    title: "Гладиатор", year: 2000,
    imageUrl: '',
    options: ["300 спартанцев", "Троя", "Гладиатор", "Александр"],
    correctIndex: 2, genre: "Исторический", difficulty: 'medium',
  },
  {
    id: 12, tmdbId: 111,
    title: "Лицо со шрамом", year: 1983,
    imageUrl: '',
    options: ["Лицо со шрамом", "Крёстный отец", "Однажды в Америке", "Казино"],
    correctIndex: 0, genre: "Криминал", difficulty: 'hard',
  },
];

export const achievements = [
  { id: 'first_correct', title: 'Первый кадр', description: 'Угадай первый фильм', icon: '🎬', requirement: 1, type: 'score' },
  { id: 'streak_5', title: 'Синефил', description: 'Набери 5 очков', icon: '🎭', requirement: 5, type: 'score' },
  { id: 'streak_10', title: 'Кинокритик', description: 'Набери 10 очков', icon: '🏆', requirement: 10, type: 'score' },
  { id: 'streak_20', title: 'Мастер кино', description: 'Набери 20 очков', icon: '⭐', requirement: 20, type: 'score' },
  { id: 'godlike', title: 'Киноман', description: 'Набери 30 очков', icon: '👑', requirement: 30, type: 'score' },
  { id: 'survivor', title: 'Выживший', description: 'Завершить раунд без потери жизней', icon: '💎', requirement: 1, type: 'perfect' },
];
