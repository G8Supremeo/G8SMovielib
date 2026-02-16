// ===== MOVIE API MODULE =====
// Connects to the OMDB (Open Movie Database) API.
// This uses the Object/Module pattern (not a class) because we only need ONE of it.

const MovieAPI = {
    API_KEY: '83a32155',
    BASE_URL: 'https://www.omdbapi.com',

    // Search for movies by title (returns a list of results)
    // Feature 9: Added optional year and type parameters for advanced search
    async search(query, options = {}) {
        if (!query.trim()) return [];

        try {
            let url = `${this.BASE_URL}/?apikey=${this.API_KEY}&s=${encodeURIComponent(query)}&type=${options.type || 'movie'}`;

            // Advanced search: year filter
            if (options.year) {
                url += `&y=${options.year}`;
            }

            // Advanced search: page for pagination
            if (options.page) {
                url += `&page=${options.page}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.Response === 'False') {
                return [];  // No results found
            }

            // Return basic search results (title, year, poster, imdbID)
            return data.Search || [];

        } catch (error) {
            console.warn('API search failed:', error);
            return [];
        }
    },

    // Get detailed info for ONE movie by its IMDB ID
    async getById(imdbID) {
        try {
            const url = `${this.BASE_URL}/?apikey=${this.API_KEY}&i=${imdbID}&plot=full`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.Response === 'False') {
                return null;
            }

            return data;  // Full movie details (title, year, genre, plot, director, actors, etc.)

        } catch (error) {
            console.warn('API getById failed:', error);
            return null;
        }
    }
};