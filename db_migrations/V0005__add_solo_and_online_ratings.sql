ALTER TABLE t_p69129290_guess_movie_game.users
ADD COLUMN solo_rating INTEGER NOT NULL DEFAULT 0,
ADD COLUMN online_rating INTEGER NOT NULL DEFAULT 50;

UPDATE t_p69129290_guess_movie_game.users
SET solo_rating = total_score;