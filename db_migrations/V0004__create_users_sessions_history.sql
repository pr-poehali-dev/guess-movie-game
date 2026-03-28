
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    vk_id BIGINT NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL DEFAULT '',
    last_name VARCHAR(255) NOT NULL DEFAULT '',
    photo_url TEXT DEFAULT '',
    access_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    total_score INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    best_score INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    perfect_rounds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_vk_id ON users(vk_id);
CREATE INDEX idx_users_total_score ON users(total_score DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_token VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    room_id CHAR(6),
    score INTEGER NOT NULL DEFAULT 0,
    result VARCHAR(10) NOT NULL DEFAULT 'unknown',
    opponent_name VARCHAR(255),
    game_type VARCHAR(20) NOT NULL DEFAULT 'solo',
    played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_history_user_id ON game_history(user_id);
CREATE INDEX idx_game_history_played_at ON game_history(played_at DESC);
