// ===== REVIEW CLASS =====
// Represents a single review for a movie.
// Uses a PRIVATE FIELD (#rating) to prevent invalid ratings.

class Review {
    // Private field — only accessible inside this class
    #rating;

    constructor(movieId, userName, text, rating) {
        this.movieId = movieId;       // Which movie this review is for
        this.userName = userName;     // Who wrote it
        this.text = text;             // The review text
        this.#rating = this.#validateRating(rating);  // Private, validated
        this.date = new Date().toISOString();
        this.id = Date.now().toString();
    }

    // Private method — called only inside this class
    #validateRating(value) {
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 5) {
            throw new Error('Rating must be a number between 1 and 5');
        }
        return Math.round(num);
    }

    // Getter — lets outside code READ the rating (but not change it)
    get rating() {
        return this.#rating;
    }

    // Get the star display (★★★☆☆)
    getStars() {
        return '★'.repeat(this.#rating) + '☆'.repeat(5 - this.#rating);
    }

    // Format the date for display
    getFormattedDate() {
        return new Date(this.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Create HTML for displaying this review
    display() {
        return `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-author">${this.userName}</span>
                    <span class="review-stars">${this.getStars()}</span>
                </div>
                <p class="review-text">${this.text}</p>
                <span class="review-date">${this.getFormattedDate()}</span>
            </div>
        `;
    }

    // Convert to plain object for localStorage
    toJSON() {
        return {
            movieId: this.movieId,
            userName: this.userName,
            text: this.text,
            rating: this.#rating,
            date: this.date,
            id: this.id
        };
    }

    // Restore a Review from saved data
    static fromJSON(data) {
        const review = new Review(data.movieId, data.userName, data.text, data.rating);
        review.date = data.date;
        review.id = data.id;
        return review;
    }
}