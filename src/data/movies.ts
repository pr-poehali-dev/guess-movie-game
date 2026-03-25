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

const CDN = 'https://cdn.poehali.dev/projects/3fb99e4a-fb09-4bc2-aa94-00d12278029f/files';

export const movies: Movie[] = [
  {
    id: 1,
    title: "Побег из Шоушенка",
    year: 1994,
    imageUrl: `${CDN}/6b286a3a-3532-4a5c-80ea-43dc4f16f397.jpg`,
    options: ["Побег из Шоушенка", "Зелёная миля", "Список Шиндлера", "Семь"],
    correctIndex: 0,
    genre: "Драма",
    difficulty: 'easy',
  },
  {
    id: 2,
    title: "Крёстный отец",
    year: 1972,
    imageUrl: `${CDN}/eda56e2e-ca3e-4f5f-be85-687312c98be5.jpg`,
    options: ["Лицо со шрамом", "Однажды в Америке", "Крёстный отец", "Прощай, детка, прощай"],
    correctIndex: 2,
    genre: "Криминал",
    difficulty: 'easy',
  },
  {
    id: 3,
    title: "Тёмный рыцарь",
    year: 2008,
    imageUrl: `${CDN}/74cf669e-9163-4de5-8c87-183d832bcd27.jpg`,
    options: ["Бэтмен навсегда", "Тёмный рыцарь", "Хранители", "Железный человек"],
    correctIndex: 1,
    genre: "Экшн",
    difficulty: 'medium',
  },
  {
    id: 4,
    title: "Список Шиндлера",
    year: 1993,
    imageUrl: `${CDN}/ebc1b6d4-7a4c-414e-aa22-8c999b4380d2.jpg`,
    options: ["Список Шиндлера", "Пианист", "Жизнь прекрасна", "Мальчик в полосатой пижаме"],
    correctIndex: 0,
    genre: "Драма",
    difficulty: 'medium',
  },
  {
    id: 5,
    title: "Начало",
    year: 2010,
    imageUrl: `${CDN}/2573b3f3-5d6f-478a-8242-45ec0d2f6300.jpg`,
    options: ["Матрица", "Интерстеллар", "Начало", "Довод"],
    correctIndex: 2,
    genre: "Фантастика",
    difficulty: 'hard',
  },
  {
    id: 6,
    title: "Интерстеллар",
    year: 2014,
    imageUrl: `${CDN}/ec3a3a9f-7bed-49c9-b258-30ff18229e9c.jpg`,
    options: ["Гравитация", "Марсианин", "Интерстеллар", "Прибытие"],
    correctIndex: 2,
    genre: "Фантастика",
    difficulty: 'medium',
  },
  {
    id: 7,
    title: "Форрест Гамп",
    year: 1994,
    imageUrl: `${CDN}/e2abd61a-c965-4fe6-b6c5-d29e453a0ca2.jpg`,
    options: ["Жизнь прекрасна", "Форрест Гамп", "Человек дождя", "Эффект бабочки"],
    correctIndex: 1,
    genre: "Драма",
    difficulty: 'easy',
  },
  {
    id: 8,
    title: "Матрица",
    year: 1999,
    imageUrl: `${CDN}/33a67666-7b2d-4725-98d8-92148ade1386.jpg`,
    options: ["Матрица", "Бегущий по лезвию", "Экзистенция", "Тёмный город"],
    correctIndex: 0,
    genre: "Фантастика",
    difficulty: 'easy',
  },
  {
    id: 9,
    title: "Властелин колец",
    year: 2001,
    imageUrl: `${CDN}/d82d44ee-3603-4703-bd77-c8807f5a4914.jpg`,
    options: ["Хоббит", "Властелин колец", "Хроники Нарнии", "Эрагон"],
    correctIndex: 1,
    genre: "Фэнтези",
    difficulty: 'easy',
  },
  {
    id: 10,
    title: "Криминальное чтиво",
    year: 1994,
    imageUrl: `${CDN}/7ccc17cd-c829-46ba-9c0f-94f95ea9a820.jpg`,
    options: ["Бешеные псы", "От заката до рассвета", "Криминальное чтиво", "Джанго освобождённый"],
    correctIndex: 2,
    genre: "Криминал",
    difficulty: 'medium',
  },
  {
    id: 11,
    title: "Гладиатор",
    year: 2000,
    imageUrl: `${CDN}/16613f73-d784-4e5a-b1a0-82ebbc9304c2.jpg`,
    options: ["300 спартанцев", "Троя", "Гладиатор", "Александр"],
    correctIndex: 2,
    genre: "Исторический",
    difficulty: 'medium',
  },
  {
    id: 12,
    title: "Лицо со шрамом",
    year: 1983,
    imageUrl: `${CDN}/b3d2a163-1c99-4e17-ac2a-429cf7995d3a.jpg`,
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