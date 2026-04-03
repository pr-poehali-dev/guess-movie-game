CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon VARCHAR(10) NOT NULL DEFAULT '',
    type VARCHAR(20) NOT NULL DEFAULT 'score',
    requirement INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO achievements (id, title, description, icon, type, requirement, sort_order) VALUES
    ('first_correct', 'Первый кадр', 'Угадай первый фильм', '🎬', 'score', 1, 1),
    ('streak_5', 'Синефил', 'Набери 5 очков', '🎭', 'score', 5, 2),
    ('streak_10', 'Кинокритик', 'Набери 10 очков', '🏆', 'score', 10, 3),
    ('streak_20', 'Мастер кино', 'Набери 20 очков', '⭐', 'score', 20, 4),
    ('godlike', 'Киноман', 'Набери 30 очков', '👑', 'score', 30, 5),
    ('survivor', 'Выживший', 'Завершить раунд без потери жизней', '💎', 'perfect', 1, 6)
ON CONFLICT (id) DO NOTHING;