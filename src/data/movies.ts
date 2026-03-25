export interface Movie {
  id: number;
  title: string;
  year: number;
  imageUrl: string;
  options: string[];
  correctIndex: number;
  genre: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const movies: Movie[] = [
  {
    id: 1,
    title: "Побег из Шоушенка",
    year: 1994,
    imageUrl: "https://picsum.photos/seed/shawshank/900/506",
    options: ["Побег из Шоушенка", "Зелёная миля", "Список Шиндлера", "Семь"],
    correctIndex: 0,
    genre: "Драма",
    difficulty: 'easy',
  },
  {
    id: 2,
    title: "Крёстный отец",
    year: 1972,
    imageUrl: "https://picsum.photos/seed/godfather/900/506",
    options: ["Лицо со шрамом", "Однажды в Америке", "Крёстный отец", "Прощай, детка, прощай"],
    correctIndex: 2,
    genre: "Криминал",
    difficulty: 'easy',
  },
  {
    id: 3,
    title: "Тёмный рыцарь",
    year: 2008,
    imageUrl: "https://picsum.photos/seed/darknight/900/506",
    options: ["Бэтмен навсегда", "Тёмный рыцарь", "Хранители", "Железный человек"],
    correctIndex: 1,
    genre: "Экшн",
    difficulty: 'medium',
  },
  {
    id: 4,
    title: "Список Шиндлера",
    year: 1993,
    imageUrl: "https://picsum.photos/seed/schindler/900/506",
    options: ["Список Шиндлера", "Пианист", "Жизнь прекрасна", "Мальчик в полосатой пижаме"],
    correctIndex: 0,
    genre: "Драма",
    difficulty: 'medium',
  },
  {
    id: 5,
    title: "Начало",
    year: 2010,
    imageUrl: "https://picsum.photos/seed/inception/900/506",
    options: ["Матрица", "Интерстеллар", "Начало", "Довод"],
    correctIndex: 2,
    genre: "Фантастика",
    difficulty: 'hard',
  },
  {
    id: 6,
    title: "Интерстеллар",
    year: 2014,
    imageUrl: "https://picsum.photos/seed/interstellar/900/506",
    options: ["Гравитация", "Марсианин", "Интерстеллар", "Прибытие"],
    correctIndex: 2,
    genre: "Фантастика",
    difficulty: 'medium',
  },
  {
    id: 7,
    title: "Форрест Гамп",
    year: 1994,
    imageUrl: "https://picsum.photos/seed/forrestgump/900/506",
    options: ["Жизнь прекрасна", "Форрест Гамп", "Человек дождя", "Эффект бабочки"],
    correctIndex: 1,
    genre: "Драма",
    difficulty: 'easy',
  },
  {
    id: 8,
    title: "Матрица",
    year: 1999,
    imageUrl: "https://picsum.photos/seed/matrix1999/900/506",
    options: ["Матрица", "Бегущий по лезвию", "Экзистенция", "Тёмный город"],
    correctIndex: 0,
    genre: "Фантастика",
    difficulty: 'easy',
  },
  {
    id: 9,
    title: "Властелин колец",
    year: 2001,
    imageUrl: "https://picsum.photos/seed/lotr2001/900/506",
    options: ["Хоббит", "Властелин колец", "Хроники Нарнии", "Эрагон"],
    correctIndex: 1,
    genre: "Фэнтези",
    difficulty: 'easy',
  },
  {
    id: 10,
    title: "Криминальное чтиво",
    year: 1994,
    imageUrl: "https://picsum.photos/seed/pulpfiction/900/506",
    options: ["Бешеные псы", "От заката до рассвета", "Криминальное чтиво", "Джанго освобождённый"],
    correctIndex: 2,
    genre: "Криминал",
    difficulty: 'medium',
  },
  {
    id: 11,
    title: "Гладиатор",
    year: 2000,
    imageUrl: "https://picsum.photos/seed/gladiator2000/900/506",
    options: ["300 спартанцев", "Троя", "Гладиатор", "Александр"],
    correctIndex: 2,
    genre: "Исторический",
    difficulty: 'medium',
  },
  {
    id: 12,
    title: "Лицо со шрамом",
    year: 1983,
    imageUrl: "https://picsum.photos/seed/scarface1983/900/506",
    options: ["Лицо со шрамом", "Крёстный отец", "Однажды в Америке", "Казино"],
    correctIndex: 0,
    genre: "Криминал",
    difficulty: 'hard',
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