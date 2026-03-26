CREATE TABLE movie_images (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL,
    filename VARCHAR(255) NOT NULL,
    cdn_url TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movie_images_movie_id ON movie_images(movie_id);