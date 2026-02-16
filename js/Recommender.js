// ===== ML RECOMMENDER MODULE (Hybrid: Python Backend + JS Fallback) =====
//
// This module calls the Python Flask server (localhost:5000) for ML recommendations.
// If the Python server is offline, it falls back to client-side cosine similarity.
//
// Architecture:
//   Browser (JS) ──fetch()──▶ Python Flask (localhost:5000)
//                               ├── /api/profile   — Build taste profile
//                               ├── /api/score     — Score a single movie
//                               ├── /api/recommend  — Get recommendations
//                               └── /api/health     — Check if server is up
//
// OOP Concepts:
//   - Singleton pattern (one global instance)
//   - Encapsulation (all ML logic hidden inside the class)
//   - Strategy pattern (Python vs JS fallback)
//   - Async/await (modern Promise-based HTTP calls)

class MovieRecommender {
    constructor() {
        // Python backend URL (Dynamic switching)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.apiUrl = isLocalhost
            ? 'http://localhost:5000/api'
            : 'https://INSERT-YOUR-RENDER-URL-HERE.onrender.com/api'; // TODO: User must update this after deploying backend

        this.serverAvailable = null; // null = unchecked, true/false = cached

        // JS fallback state
        this.idfCache = {};
        this.userProfile = {};
    }

    // ===== SERVER DETECTION =====
    // Check if the Python backend is running (cached after first check)
    async checkServer() {
        if (this.serverAvailable !== null) return this.serverAvailable;

        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000) // 2-second timeout
            });
            const data = await response.json();
            this.serverAvailable = data.status === 'ok';
            console.log(`🧠 ML Engine: ${this.serverAvailable ? 'Python (scikit-learn)' : 'JavaScript (fallback)'}`);
        } catch (e) {
            this.serverAvailable = false;
            console.log('🧠 ML Engine: JavaScript (fallback) — Python server not detected');
        }

        return this.serverAvailable;
    }

    // ===== PYTHON API CALLS =====

    // Build user taste profile via Python backend
    async buildUserProfilePython(collection) {
        try {
            const response = await fetch(`${this.apiUrl}/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: this._serializeCollection(collection) })
            });
            return await response.json();
        } catch (e) {
            console.warn('Python profile API failed, falling back to JS', e);
            this.serverAvailable = false;
            return null;
        }
    }

    // Score a movie via Python backend
    async scoreMoviePython(movie) {
        try {
            const response = await fetch(`${this.apiUrl}/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movie: this._serializeMovie(movie) })
            });
            const data = await response.json();
            return data.success ? data.score : 0;
        } catch (e) {
            console.warn('Python score API failed, falling back to JS', e);
            this.serverAvailable = false;
            return null;
        }
    }

    // Get recommendations via Python backend
    async getSmartSuggestionsPython(collection) {
        try {
            const response = await fetch(`${this.apiUrl}/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection: this._serializeCollection(collection) })
            });
            const data = await response.json();
            return data.success ? { suggestions: data.suggestions, topTraits: data.top_traits } : null;
        } catch (e) {
            console.warn('Python recommend API failed, falling back to JS', e);
            this.serverAvailable = false;
            return null;
        }
    }

    // ===== PUBLIC API (Python-first, JS-fallback) =====

    // Build user profile — tries Python, falls back to JS
    async buildUserProfile(collection) {
        await this.checkServer();

        if (this.serverAvailable) {
            const result = await this.buildUserProfilePython(collection);
            if (result && result.success) {
                // Cache the top traits for the UI
                this.userProfile = {};
                if (result.top_traits) {
                    result.top_traits.forEach(t => {
                        this.userProfile[t.feature] = t.weight;
                    });
                }
                return result;
            }
        }

        // JS fallback
        return this._buildUserProfileJS(collection);
    }

    // Score a movie — tries Python, falls back to JS
    async scoreMovieAsync(movie) {
        await this.checkServer();

        if (this.serverAvailable) {
            const score = await this.scoreMoviePython(movie);
            if (score !== null) return score;
        }

        // JS fallback
        return this.scoreMovie(movie);
    }

    // Get recommendations — tries Python, falls back to JS
    async getSmartSuggestionsAsync(collection) {
        await this.checkServer();

        if (this.serverAvailable) {
            const result = await this.getSmartSuggestionsPython(collection);
            if (result) {
                // Update userProfile for the UI
                this.userProfile = {};
                if (result.topTraits) {
                    result.topTraits.forEach((t, i) => {
                        this.userProfile[t] = 1.0 - (i * 0.1); // Decreasing weights
                    });
                }
                return result.suggestions;
            }
        }

        // JS fallback
        return this.getSmartSuggestions(collection);
    }

    // ===== SERIALIZATION HELPERS =====
    // Convert Movie objects to plain JSON for the Python API

    _serializeMovie(movie) {
        return {
            title: movie.title || '',
            genre: movie.genre || '',
            director: movie.director || '',
            actors: movie.actors || '',
            year: movie.year || '',
            rating: movie.rating || 0,
            mood: movie.mood || '',
            imdbID: movie.imdbID || ''
        };
    }

    _serializeCollection(collection) {
        return collection.map(m => this._serializeMovie(m));
    }

    // ===== JS FALLBACK: Full client-side implementation =====
    // (Same algorithm as before — used when Python server is offline)

    extractFeatures(movie) {
        const features = {};

        if (movie.genre) {
            const genres = movie.genre.split(',').map(g => g.trim().toLowerCase());
            genres.forEach(g => {
                features[`genre:${g}`] = 2.0;
            });
        }

        if (movie.director && movie.director !== 'N/A' && movie.director !== 'Unknown') {
            const directors = movie.director.split(',').map(d => d.trim().toLowerCase());
            directors.forEach(d => {
                features[`director:${d}`] = 1.5;
            });
        }

        if (movie.actors && movie.actors !== 'N/A') {
            const actors = movie.actors.split(',').map(a => a.trim().toLowerCase());
            actors.slice(0, 3).forEach(a => {
                features[`actor:${a}`] = 1.0;
            });
        }

        if (movie.year) {
            const decade = Math.floor(parseInt(movie.year) / 10) * 10;
            features[`decade:${decade}s`] = 0.8;
        }

        if (movie.rating && movie.rating > 0) {
            const bucket = movie.rating >= 4 ? 'high' : movie.rating >= 2.5 ? 'mid' : 'low';
            features[`rating:${bucket}`] = 0.5;
        }

        if (movie.mood) {
            features[`mood:${movie.mood}`] = 1.0;
        }

        return features;
    }

    computeIDF(collection) {
        const docCount = collection.length;
        const termDocCount = {};

        collection.forEach(movie => {
            const features = this.extractFeatures(movie);
            const seenTerms = new Set();
            Object.keys(features).forEach(term => {
                if (!seenTerms.has(term)) {
                    termDocCount[term] = (termDocCount[term] || 0) + 1;
                    seenTerms.add(term);
                }
            });
        });

        const idf = {};
        Object.entries(termDocCount).forEach(([term, count]) => {
            idf[term] = Math.log(docCount / count) + 1;
        });

        this.idfCache = idf;
        return idf;
    }

    applyTFIDF(features) {
        const weighted = {};
        Object.entries(features).forEach(([term, tf]) => {
            const idf = this.idfCache[term] || 1;
            weighted[term] = tf * idf;
        });
        return weighted;
    }

    _buildUserProfileJS(collection) {
        if (collection.length === 0) {
            this.userProfile = {};
            return {};
        }

        this.computeIDF(collection);
        const profile = {};
        let count = 0;

        collection.forEach(movie => {
            const features = this.extractFeatures(movie);
            const weighted = this.applyTFIDF(features);
            const ratingBoost = movie.rating >= 4 ? 1.5 : movie.rating >= 3 ? 1.0 : 0.7;

            Object.entries(weighted).forEach(([term, value]) => {
                profile[term] = (profile[term] || 0) + value * ratingBoost;
            });
            count++;
        });

        Object.keys(profile).forEach(term => {
            profile[term] /= count;
        });

        this.userProfile = profile;
        return profile;
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;

        const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

        allTerms.forEach(term => {
            const a = vecA[term] || 0;
            const b = vecB[term] || 0;
            dotProduct += a * b;
            magnitudeA += a * a;
            magnitudeB += b * b;
        });

        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);

        if (magnitudeA === 0 || magnitudeB === 0) return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    }

    // Synchronous score (JS fallback only — used by app.js for search results)
    scoreMovie(movie) {
        if (Object.keys(this.userProfile).length === 0) return 0;

        const features = this.extractFeatures(movie);
        const weighted = this.applyTFIDF(features);
        const similarity = this.cosineSimilarity(this.userProfile, weighted);

        return Math.round(similarity * 100);
    }

    // Synchronous recommendations (JS fallback)
    getSmartSuggestions(collection) {
        if (collection.length < 2) return [];

        this._buildUserProfileJS(collection);
        const suggestions = [];

        const topFeatures = Object.entries(this.userProfile)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        topFeatures.forEach(([term, weight]) => {
            const [type, value] = term.split(':');

            if (type === 'genre' && !suggestions.find(s => s.type === 'genre')) {
                suggestions.push({
                    type: 'genre',
                    message: `Your taste profile strongly favors ${value} (weight: ${weight.toFixed(1)})`,
                    searchTerm: value,
                    confidence: Math.min(Math.round(weight * 20), 99)
                });
            }

            if (type === 'director' && !suggestions.find(s => s.type === 'director')) {
                suggestions.push({
                    type: 'director',
                    message: `You really enjoy ${value}'s filmmaking style`,
                    searchTerm: value,
                    confidence: Math.min(Math.round(weight * 20), 99)
                });
            }

            if (type === 'actor' && suggestions.filter(s => s.type === 'actor').length < 2) {
                suggestions.push({
                    type: 'actor',
                    message: `You tend to enjoy movies with ${value}`,
                    searchTerm: value,
                    confidence: Math.min(Math.round(weight * 20), 99)
                });
            }
        });

        return suggestions.slice(0, 5);
    }
}

// Global recommender instance (singleton)
const recommender = new MovieRecommender();
