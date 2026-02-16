// ===== MOVIE CLASS (Base Class) =====
// This is the "blueprint" for every movie in the library.
// All genre-specific movie types (ActionMovie, ComedyMovie, etc.) inherit from this.

class Movie {
    // Private field — cannot be accessed from outside the class
    #userRating;

    constructor(title, year, genre, poster, imdbID, plot, director, actors) {
        this.title = title;
        this.year = year;
        this.genre = genre;
        this.poster = poster;          // URL to the poster image
        this.imdbID = imdbID;          // Unique identifier from IMDB
        this.plot = plot;
        this.director = director;
        this.actors = actors;
        this.#userRating = 0;          // Private: only accessible via getter/setter
        this.reviews = [];             // Array of Review objects
        this.dateAdded = new Date().toISOString();
        this.tags = [];                // Feature 7: Custom tags/lists
        this.mood = null;              // Feature 11: Mood tracking (e.g., 'happy', 'inspired')
    }

    // Getter — read the private rating
    get rating() {
        return this.#userRating;
    }

    // Setter — set the rating with validation
    set rating(value) {
        if (value < 0 || value > 5) {
            throw new Error('Rating must be between 0 and 5');
        }
        this.#userRating = Math.round(value);
    }

    // Add a review to this movie
    addReview(review) {
        this.reviews.push(review);
        // Update the average rating
        this.#userRating = Math.round(this.getAverageRating());
    }

    // Calculate average rating from all reviews
    getAverageRating() {
        if (this.reviews.length === 0) return 0;
        const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
        return parseFloat((sum / this.reviews.length).toFixed(1));
    }

    // Get star display string (★★★☆☆)
    getStars() {
        const filled = this.#userRating;
        return '★'.repeat(filled) + '☆'.repeat(5 - filled);
    }

    // Get the CSS class for this genre (used for styling)
    getGenreClass() {
        return 'other-card';
    }

    // Get the genre badge class
    getBadgeClass() {
        return 'other';
    }

    // Get the genre emoji
    getEmoji() {
        return '📽️';
    }

    // ===== TAG METHODS (Feature 7) =====
    addTag(tag) {
        const normalized = tag.trim().toLowerCase();
        if (!normalized) return false;
        if (this.tags.includes(normalized)) return false;
        this.tags.push(normalized);
        return true;
    }

    removeTag(tag) {
        const index = this.tags.indexOf(tag.trim().toLowerCase());
        if (index === -1) return false;
        this.tags.splice(index, 1);
        return true;
    }

    hasTag(tag) {
        return this.tags.includes(tag.trim().toLowerCase());
    }

    // ===== MOOD METHODS (Feature 11) =====
    setMood(mood) {
        const validMoods = ['happy', 'sad', 'inspired', 'scared', 'excited', 'thoughtful', 'relaxed', 'nostalgic'];
        if (!validMoods.includes(mood)) {
            throw new Error(`Invalid mood. Choose from: ${validMoods.join(', ')}`);
        }
        this.mood = mood;
    }

    getMoodEmoji() {
        const moodEmojis = {
            happy: '😊', sad: '😢', inspired: '✨', scared: '😨',
            excited: '🤩', thoughtful: '🤔', relaxed: '😌', nostalgic: '🥹'
        };
        return this.mood ? moodEmojis[this.mood] || '🎬' : '';
    }

    // DISPLAY — creates the HTML card for the collection grid
    // This is the DEFAULT display. Subclasses OVERRIDE this (polymorphism!)
    display() {
        const posterHTML = this.poster && this.poster !== 'N/A'
            ? `<img src="${this.poster}" alt="${this.title}" class="movie-poster">`
            : `<div class="movie-poster-placeholder">${this.getEmoji()}</div>`;

        const moodHTML = this.mood ? `<span class="movie-mood">${this.getMoodEmoji()}</span>` : '';
        const tagsHTML = this.tags.length > 0
            ? `<div class="movie-tags">${this.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
            : '';

        return `
            <div class="movie-card ${this.getGenreClass()}" data-imdbid="${this.imdbID}">
                <span class="genre-badge ${this.getBadgeClass()}">${this.genre}</span>
                ${moodHTML}
                ${posterHTML}
                <div class="movie-info">
                    <div class="movie-title">${this.title}</div>
                    <div class="movie-year">${this.year} · ${this.director || 'Unknown'}</div>
                    <div class="movie-rating">${this.getStars()}</div>
                    ${tagsHTML}
                </div>
            </div>
        `;
    }

    // Convert to a plain object for localStorage (private fields can't be saved directly)
    toJSON() {
        return {
            title: this.title,
            year: this.year,
            genre: this.genre,
            poster: this.poster,
            imdbID: this.imdbID,
            plot: this.plot,
            director: this.director,
            actors: this.actors,
            userRating: this.#userRating,
            reviews: this.reviews.map(r => r.toJSON()),
            dateAdded: this.dateAdded,
            tags: this.tags,
            mood: this.mood
        };
    }

    // Create a Movie from saved data (static factory method)
    static fromJSON(data) {
        const movie = createMovie(data);  // Uses the factory function below
        movie.dateAdded = data.dateAdded;
        if (data.userRating) {
            movie.rating = data.userRating;
        }
        if (data.reviews) {
            movie.reviews = data.reviews.map(r => Review.fromJSON(r));
        }
        if (data.tags) {
            movie.tags = data.tags;
        }
        if (data.mood) {
            movie.mood = data.mood;
        }
        return movie;
    }
}

// ===== ACTION MOVIE (Inherits from Movie) =====
class ActionMovie extends Movie {
    constructor(title, year, poster, imdbID, plot, director, actors) {
        super(title, year, 'Action', poster, imdbID, plot, director, actors);
    }

    // Override: genre-specific CSS class
    getGenreClass() { return 'action-card'; }
    getBadgeClass() { return 'action'; }
    getEmoji() { return '🔥'; }
}

// ===== COMEDY MOVIE (Inherits from Movie) =====
class ComedyMovie extends Movie {
    constructor(title, year, poster, imdbID, plot, director, actors) {
        super(title, year, 'Comedy', poster, imdbID, plot, director, actors);
    }

    getGenreClass() { return 'comedy-card'; }
    getBadgeClass() { return 'comedy'; }
    getEmoji() { return '😂'; }
}

// ===== DRAMA MOVIE (Inherits from Movie) =====
class DramaMovie extends Movie {
    constructor(title, year, poster, imdbID, plot, director, actors) {
        super(title, year, 'Drama', poster, imdbID, plot, director, actors);
    }

    getGenreClass() { return 'drama-card'; }
    getBadgeClass() { return 'drama'; }
    getEmoji() { return '🎭'; }
}

// ===== HORROR MOVIE (Inherits from Movie) =====
class HorrorMovie extends Movie {
    constructor(title, year, poster, imdbID, plot, director, actors) {
        super(title, year, 'Horror', poster, imdbID, plot, director, actors);
    }

    getGenreClass() { return 'horror-card'; }
    getBadgeClass() { return 'horror'; }
    getEmoji() { return '👻'; }
}

// ===== FACTORY FUNCTION =====
// Decides which subclass to create based on the genre string from OMDB
function createMovie(data) {
    const genre = (data.genre || data.Genre || '').split(',')[0].trim();
    const args = [
        data.title || data.Title,
        data.year || data.Year,
        data.poster || data.Poster,
        data.imdbID,
        data.plot || data.Plot || 'No plot available.',
        data.director || data.Director || 'Unknown',
        data.actors || data.Actors || 'Unknown'
    ];

    switch (genre) {
        case 'Action': return new ActionMovie(...args);
        case 'Comedy': return new ComedyMovie(...args);
        case 'Drama': return new DramaMovie(...args);
        case 'Horror': return new HorrorMovie(...args);
        default: return new Movie(args[0], args[1], genre || 'Other', args[2], args[3], args[4], args[5], args[6]);
    }
}
