
// ===== USER CLASS =====
// Manages user accounts, authentication, and movie collections.
// Uses PRIVATE FIELDS (#) for sensitive data like passwords and emails.

class User {
    // Private fields — these CANNOT be accessed from outside the class
    #password;
    #email;
    #securityQuestion;
    #securityAnswer;

    constructor(name, email, password, securityQuestion = '', securityAnswer = '') {
        this.name = name;
        this.#email = email.toLowerCase().trim();
        this.#password = password;
        this.#securityQuestion = securityQuestion;
        this.#securityAnswer = securityAnswer.toLowerCase().trim();
        this.collection = [];            // Array of Movie objects
        this.watchlist = [];             // Feature 6: Watchlist ("want to watch")
        this.joinDate = new Date().toISOString();
        this.achievements = [];          // Feature 10: Saved achievement states
        this.theme = 'dark';             // Feature 1: Theme preference
    }

    // Getter — allows reading the email (but not setting it from outside)
    get email() {
        return this.#email;
    }

    // Getter — safe to display the question (but never the answer)
    get securityQuestion() {
        return this.#securityQuestion;
    }

    // Validate a password attempt (returns true/false, NEVER exposes the password)
    validatePassword(attempt) {
        return attempt === this.#password;
    }

    // Update security question/answer for account recovery
    setSecurityQuestion(question, answer) {
        if (!question) {
            return { success: false, message: 'Please select a security question.' };
        }
        if (!answer || !answer.trim()) {
            return { success: false, message: 'Please provide an answer to the security question.' };
        }
        this.#securityQuestion = question;
        this.#securityAnswer = answer.toLowerCase().trim();
        this.saveToStorage();
        return { success: true, message: 'Security question updated successfully.' };
    }

    // Add a movie to the user's collection
    addMovie(movie) {
        const exists = this.collection.some(m => m.imdbID === movie.imdbID);
        if (exists) {
            return { success: false, message: 'Movie is already in your collection!' };
        }
        this.collection.push(movie);
        this.saveToStorage();

        // Emit event for decoupled communication (Feature 15)
        if (typeof appEvents !== 'undefined') {
            appEvents.emit('movie:added', { movie, user: this });
        }

        return { success: true, message: `"${movie.title}" added to your collection!` };
    }

    // Remove a movie from the user's collection
    removeMovie(imdbID) {
        const index = this.collection.findIndex(m => m.imdbID === imdbID);
        if (index === -1) {
            return { success: false, message: 'Movie not found in your collection.' };
        }
        const removed = this.collection.splice(index, 1)[0];
        this.saveToStorage();

        if (typeof appEvents !== 'undefined') {
            appEvents.emit('movie:removed', { movie: removed, user: this });
        }

        return { success: true, message: `"${removed.title}" removed from collection.` };
    }

    // Get a movie from the collection by IMDB ID
    getMovie(imdbID) {
        return this.collection.find(m => m.imdbID === imdbID) || null;
    }

    // ===== WATCHLIST METHODS (Feature 6) =====
    addToWatchlist(movie) {
        const inCollection = this.collection.some(m => m.imdbID === movie.imdbID);
        if (inCollection) {
            return { success: false, message: 'Movie is already in your collection!' };
        }
        const inWatchlist = this.watchlist.some(m => m.imdbID === movie.imdbID);
        if (inWatchlist) {
            return { success: false, message: 'Movie is already in your watchlist!' };
        }
        this.watchlist.push(movie);
        this.saveToStorage();

        if (typeof appEvents !== 'undefined') {
            appEvents.emit('watchlist:added', { movie, user: this });
        }

        return { success: true, message: `"${movie.title}" added to watchlist!` };
    }

    removeFromWatchlist(imdbID) {
        const index = this.watchlist.findIndex(m => m.imdbID === imdbID);
        if (index === -1) {
            return { success: false, message: 'Movie not found in watchlist.' };
        }
        const removed = this.watchlist.splice(index, 1)[0];
        this.saveToStorage();
        return { success: true, message: `"${removed.title}" removed from watchlist.` };
    }

    // Move from watchlist → collection (watched it!)
    moveToCollection(imdbID) {
        const index = this.watchlist.findIndex(m => m.imdbID === imdbID);
        if (index === -1) return { success: false, message: 'Not in watchlist.' };
        const movie = this.watchlist.splice(index, 1)[0];
        movie.dateAdded = new Date().toISOString();
        this.collection.push(movie);
        this.saveToStorage();

        if (typeof appEvents !== 'undefined') {
            appEvents.emit('movie:added', { movie, user: this });
        }

        return { success: true, message: `"${movie.title}" moved to collection!` };
    }

    // ===== SORT METHODS (Feature 2) =====
    sortCollection(by = 'title', order = 'asc') {
        const sortFns = {
            title: (a, b) => a.title.localeCompare(b.title),
            year: (a, b) => parseInt(a.year) - parseInt(b.year),
            rating: (a, b) => b.rating - a.rating,
            dateAdded: (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)
        };

        const fn = sortFns[by] || sortFns.title;
        this.collection.sort(fn);

        if (order === 'desc' && by !== 'rating' && by !== 'dateAdded') {
            this.collection.reverse();
        }
        if (order === 'asc' && (by === 'rating' || by === 'dateAdded')) {
            this.collection.reverse();
        }
    }

    // ===== TAG FILTERING (Feature 7) =====
    getMoviesByTag(tag) {
        return this.collection.filter(m => m.hasTag(tag));
    }

    getAllTags() {
        const tagSet = new Set();
        this.collection.forEach(m => m.tags.forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }

    // ===== RANDOM PICK (Feature 3) =====
    getRandomMovie() {
        if (this.collection.length === 0) return null;
        const index = Math.floor(Math.random() * this.collection.length);
        return this.collection[index];
    }

    // ===== RECOMMENDATIONS (Feature 13) =====
    getRecommendations() {
        const suggestions = [];
        const stats = this.getStats();

        // Suggest based on top genre
        if (stats.topGenre !== 'None') {
            const genreKeywords = {
                'Action': ['action thriller', 'superhero', 'martial arts'],
                'Comedy': ['comedy romance', 'funny', 'sitcom movie'],
                'Drama': ['drama oscar', 'biographical', 'emotional'],
                'Horror': ['horror scary', 'ghost', 'psychological thriller']
            };
            const keywords = genreKeywords[stats.topGenre] || [];
            if (keywords.length > 0) {
                suggestions.push({
                    type: 'genre',
                    message: `You love ${stats.topGenre} movies!`,
                    searchTerm: keywords[Math.floor(Math.random() * keywords.length)]
                });
            }
        }

        // Suggest based on top directors
        const directorCount = {};
        this.collection.forEach(m => {
            if (m.director && m.director !== 'Unknown') {
                const dir = m.director.split(',')[0].trim();
                directorCount[dir] = (directorCount[dir] || 0) + 1;
            }
        });
        const topDirector = Object.entries(directorCount).sort((a, b) => b[1] - a[1])[0];
        if (topDirector && topDirector[1] >= 2) {
            suggestions.push({
                type: 'director',
                message: `You enjoy ${topDirector[0]}'s work!`,
                searchTerm: topDirector[0]
            });
        }

        // Suggest based on highly rated genres
        const highRated = this.collection.filter(m => m.rating >= 4);
        if (highRated.length > 0) {
            const random = highRated[Math.floor(Math.random() * highRated.length)];
            suggestions.push({
                type: 'similar',
                message: `You loved "${random.title}" — try searching for similar movies!`,
                searchTerm: random.genre.toLowerCase()
            });
        }

        return suggestions;
    }

    // ===== MOOD ANALYTICS (Feature 11) =====
    getMoodStats() {
        const moods = {};
        this.collection.forEach(m => {
            if (m.mood) {
                moods[m.mood] = (moods[m.mood] || 0) + 1;
            }
        });
        return moods;
    }

    // ===== TIMELINE DATA (Feature 12) =====
    getTimeline() {
        const events = [];
        this.collection.forEach(m => {
            events.push({
                type: 'added',
                title: m.title,
                date: m.dateAdded,
                icon: '📥'
            });
            m.reviews.forEach(r => {
                events.push({
                    type: 'reviewed',
                    title: `Reviewed "${m.title}"`,
                    date: r.date,
                    icon: '✍️',
                    rating: r.rating
                });
            });
        });
        return events.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // ===== IMPORT / EXPORT (Feature 16) =====
    exportCollection() {
        return JSON.stringify({
            exportDate: new Date().toISOString(),
            userName: this.name,
            collection: this.collection.map(m => m.toJSON()),
            watchlist: this.watchlist.map(m => m.toJSON())
        }, null, 2);
    }

    importCollection(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.collection || !Array.isArray(data.collection)) {
                return { success: false, message: 'Invalid file format.' };
            }

            let imported = 0;
            data.collection.forEach(movieData => {
                const exists = this.collection.some(m => m.imdbID === movieData.imdbID);
                if (!exists) {
                    const movie = Movie.fromJSON(movieData);
                    this.collection.push(movie);
                    imported++;
                }
            });

            if (data.watchlist) {
                data.watchlist.forEach(movieData => {
                    const exists = this.watchlist.some(m => m.imdbID === movieData.imdbID);
                    const inCollection = this.collection.some(m => m.imdbID === movieData.imdbID);
                    if (!exists && !inCollection) {
                        const movie = Movie.fromJSON(movieData);
                        this.watchlist.push(movie);
                    }
                });
            }

            this.saveToStorage();
            return { success: true, message: `Imported ${imported} new movies!` };
        } catch (e) {
            return { success: false, message: 'Failed to parse file. Make sure it is valid JSON.' };
        }
    }

    // ===== SHARING (Feature 8) =====
    getShareableLink(imdbID) {
        const movie = this.getMovie(imdbID);
        if (!movie) return null;
        return JSON.stringify({
            title: movie.title,
            year: movie.year,
            genre: movie.genre,
            imdbID: movie.imdbID,
            rating: movie.rating,
            reviewCount: movie.reviews.length,
            sharedBy: this.name,
            shareDate: new Date().toISOString()
        });
    }

    // Get user statistics
    getStats() {
        const total = this.collection.length;
        const reviewed = this.collection.filter(m => m.reviews.length > 0).length;
        const totalReviews = this.collection.reduce((sum, m) => sum + m.reviews.length, 0);
        const genres = {};
        this.collection.forEach(m => {
            genres[m.genre] = (genres[m.genre] || 0) + 1;
        });
        const topGenre = Object.entries(genres).sort((a, b) => b[1] - a[1])[0];

        // Average rating across all reviewed movies
        const ratedMovies = this.collection.filter(m => m.rating > 0);
        const avgRating = ratedMovies.length > 0
            ? (ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length).toFixed(1)
            : '0.0';

        // Movie of the Month: highest rated movie added in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentMovies = this.collection
            .filter(m => new Date(m.dateAdded) >= thirtyDaysAgo && m.rating > 0)
            .sort((a, b) => b.rating - a.rating);
        const movieOfMonth = recentMovies.length > 0 ? recentMovies[0] : null;

        return {
            totalMovies: total,
            reviewedMovies: reviewed,
            totalReviews: totalReviews,
            topGenre: topGenre ? topGenre[0] : 'None',
            genres: genres,
            avgRating: avgRating,
            movieOfMonth: movieOfMonth,
            watchlistCount: this.watchlist.length
        };
    }

    // Filter collection by genre
    filterByGenre(genre) {
        if (genre === 'all') return this.collection;
        if (genre === 'Other') {
            return this.collection.filter(m =>
                !['Action', 'Comedy', 'Drama', 'Horror'].includes(m.genre)
            );
        }
        return this.collection.filter(m => m.genre === genre);
    }

    // Save user data to localStorage
    saveToStorage() {
        const userData = this.toJSON();
        const allUsers = JSON.parse(localStorage.getItem('movieLibraryUsers') || '{}');
        // Ensure we use the lowercase email as key
        allUsers[this.#email] = userData;
        localStorage.setItem('movieLibraryUsers', JSON.stringify(allUsers));
        localStorage.setItem('movieLibraryCurrentUser', this.#email);
    }

    // Convert to plain object (for localStorage — private fields need manual export)
    toJSON() {
        return {
            name: this.name,
            email: this.#email,
            password: this.#password,
            securityQuestion: this.#securityQuestion,
            securityAnswer: this.#securityAnswer,
            collection: this.collection.map(m => m.toJSON()),
            watchlist: this.watchlist.map(m => m.toJSON()),
            joinDate: this.joinDate,
            achievements: typeof AchievementManager !== 'undefined' ? AchievementManager.toJSON() : [],
            theme: this.theme
        };
    }

    // ===== STATIC METHODS (called on the class itself, not on instances) =====

    // Sign up a new user
    static signup(name, email, password, securityQuestion = '', securityAnswer = '') {
        const cleanEmail = email.toLowerCase().trim();
        const allUsers = JSON.parse(localStorage.getItem('movieLibraryUsers') || '{}');

        // Check availability (case-insensitive)
        const existingKey = Object.keys(allUsers).find(k => k.toLowerCase() === cleanEmail);
        if (existingKey) {
            return { success: false, message: 'An account with this email already exists.' };
        }

        const user = new User(name, cleanEmail, password, securityQuestion, securityAnswer);
        user.saveToStorage();
        return { success: true, user: user };
    }

    // Log in an existing user
    static login(email, password) {
        const cleanEmail = email.toLowerCase().trim();
        const allUsers = JSON.parse(localStorage.getItem('movieLibraryUsers') || '{}');

        // Find user case-insensitively (to support legacy mixed-case accounts)
        const userKey = Object.keys(allUsers).find(k => k.toLowerCase() === cleanEmail);
        const userData = allUsers[userKey];

        if (!userData) {
            return { success: false, message: 'No account found with this email.' };
        }

        if (userData.password !== password) {
            return { success: false, message: 'Incorrect password.' };
        }

        const user = User.fromJSON(userData);

        // MIGRATION: If key is not lowercase, correct it now.
        if (userKey !== cleanEmail) {
            allUsers[cleanEmail] = userData;
            delete allUsers[userKey];
            localStorage.setItem('movieLibraryUsers', JSON.stringify(allUsers));
        }

        // Save session with the normalized email
        localStorage.setItem('movieLibraryCurrentUser', cleanEmail);
        return { success: true, user: user };
    }

    // Restore user from saved data
    static fromJSON(data) {
        const user = new User(data.name, data.email, data.password, data.securityQuestion || '', data.securityAnswer || '');
        user.joinDate = data.joinDate;
        user.theme = data.theme || 'dark';
        if (data.collection) {
            user.collection = data.collection.map(m => Movie.fromJSON(m));
        }
        if (data.watchlist) {
            user.watchlist = data.watchlist.map(m => Movie.fromJSON(m));
        }
        if (data.achievements) {
            AchievementManager.loadState(data.achievements);
        }
        return user;
    }

    // Get the currently logged-in user (if any)
    static getCurrentUser() {
        const email = localStorage.getItem('movieLibraryCurrentUser');
        if (!email) return null;

        const allUsers = JSON.parse(localStorage.getItem('movieLibraryUsers') || '{}');
        // Try direct lookup first, then case-insensitive
        let userKey = email;
        let userData = allUsers[userKey];

        if (!userData) {
            const key = Object.keys(allUsers).find(k => k.toLowerCase() === email.toLowerCase().trim());
            if (key) {
                userData = allUsers[key];
                userKey = key;
            }
        }

        if (!userData) return null;

        // AUTO-MIGRATE STORAGE & SESSION
        const cleanEmail = userKey.toLowerCase().trim();
        if (userKey !== cleanEmail) {
            console.log(`Migrating user storage from ${userKey} to ${cleanEmail}`);
            allUsers[cleanEmail] = userData;
            delete allUsers[userKey];
            localStorage.setItem('movieLibraryUsers', JSON.stringify(allUsers));
            localStorage.setItem('movieLibraryCurrentUser', cleanEmail);
        } else if (email !== cleanEmail) {
            // Fix session pointer if storage was okay but session was raw
            localStorage.setItem('movieLibraryCurrentUser', cleanEmail);
        }

        return User.fromJSON(userData);
    }

    // Log out the current user
    static logout() {
        localStorage.removeItem('movieLibraryCurrentUser');
        localStorage.removeItem('movieLibraryRememberMe');
    }

    // Get security question for a given email (for password reset)
    static getSecurityQuestion(email) {
        const cleanEmail = email.toLowerCase().trim();
        const allUsers = JSON.parse(localStorage.getItem('movieLibraryUsers') || '{}');

        const userKey = Object.keys(allUsers).find(k => k.toLowerCase() === cleanEmail);
        const userData = allUsers[userKey];

        if (!userData) return null;
        return userData.securityQuestion || null;
    }

    // Reset password by answering security question correctly
    static resetPassword(email, answer, newPassword) {
        const cleanEmail = email.toLowerCase().trim();
        const allUsers = JSON.parse(localStorage.getItem('movieLibraryUsers') || '{}');

        const userKey = Object.keys(allUsers).find(k => k.toLowerCase() === cleanEmail);
        const userData = allUsers[userKey];

        if (!userData) {
            return { success: false, message: 'No account found with this email.' };
        }

        if (!userData.securityQuestion) {
            return { success: false, message: 'No security question set for this account.' };
        }

        if (answer.toLowerCase().trim() !== userData.securityAnswer) {
            return { success: false, message: 'Incorrect security answer.' };
        }

        if (newPassword.length < 6) {
            return { success: false, message: 'New password must be at least 6 characters.' };
        }

        // Update password in storage
        userData.password = newPassword;

        // MIGRATION: Ensure we save to the clean lowercase key
        if (userKey !== cleanEmail) {
            delete allUsers[userKey];
        }
        allUsers[cleanEmail] = userData;
        localStorage.setItem('movieLibraryUsers', JSON.stringify(allUsers));

        return { success: true, message: 'Password reset successfully! You can now log in.' };
    }

    // Verify security answer without changing password
    static verifySecurityAnswer(email, answer) {
        const cleanEmail = email.toLowerCase().trim();
        const allUsers = JSON.parse(localStorage.getItem('movieLibraryUsers') || '{}');

        const userKey = Object.keys(allUsers).find(k => k.toLowerCase() === cleanEmail);
        const userData = allUsers[userKey];

        if (!userData) {
            return { success: false, message: 'No account found with this email.' };
        }

        if (!userData.securityQuestion) {
            return { success: false, message: 'No security question set for this account.' };
        }

        if (answer.toLowerCase().trim() !== userData.securityAnswer) {
            return { success: false, message: 'Incorrect security answer.' };
        }

        return { success: true, message: 'Security answer verified.' };
    }
}