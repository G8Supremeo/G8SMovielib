"""
Movie Library — ML Recommender Server
======================================
A Python Flask backend that runs the same cosine similarity algorithm
as the JavaScript version, but using scikit-learn for real ML.

How to run:
    pip install -r requirements.txt
    python recommender_server.py

The server starts on http://localhost:5000 and provides 3 API endpoints:
    POST /api/profile    — Build a user taste profile from their collection
    POST /api/score      — Score a single movie against the user's profile
    POST /api/recommend  — Get smart recommendations based on collection

The JavaScript frontend (Recommender.js) calls these endpoints via fetch().
If this server is offline, the frontend falls back to client-side JS logic.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from file:// and localhost


# ===== ML RECOMMENDER CLASS =====
class MovieRecommender:
    """
    Content-based filtering using TF-IDF + Cosine Similarity.

    This is the same algorithm Netflix/Spotify use (simplified):
    1. Each movie → feature string (genre, director, actors, decade)
    2. TF-IDF vectorizer converts strings → numerical vectors
    3. User profile = average of all collection vectors
    4. Cosine similarity measures angle between profile and candidate movie
    """

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            analyzer='word',
            token_pattern=r'[a-zA-Z0-9]+',
            lowercase=True
        )
        self.user_profile_vector = None
        self.feature_names = None
        self.is_fitted = False

    def extract_features(self, movie):
        """
        Convert a movie dict into a feature string.
        Each feature type is repeated to give it weight.

        Example:
            {"title": "Iron Man", "genre": "Action, Sci-Fi", "director": "Jon Favreau"}
            → "genre_action genre_action genre_scifi genre_scifi director_jonfahreau director_jonfahreau actor_robertdowneyjr decade_2000s"
        """
        parts = []

        # Genre (repeated 3x for highest weight)
        genre = movie.get('genre', '')
        if genre and genre != 'N/A':
            for g in genre.split(','):
                clean = re.sub(r'[^a-z0-9]', '', g.strip().lower())
                if clean:
                    parts.extend([f'genre_{clean}'] * 3)

        # Director (repeated 2x)
        director = movie.get('director', '')
        if director and director not in ('N/A', 'Unknown'):
            for d in director.split(','):
                clean = re.sub(r'[^a-z0-9]', '', d.strip().lower())
                if clean:
                    parts.extend([f'director_{clean}'] * 2)

        # Actors (top 3, 1x each)
        actors = movie.get('actors', '')
        if actors and actors != 'N/A':
            for a in actors.split(',')[:3]:
                clean = re.sub(r'[^a-z0-9]', '', a.strip().lower())
                if clean:
                    parts.append(f'actor_{clean}')

        # Decade
        year = movie.get('year', '')
        if year:
            try:
                decade = (int(str(year)[:4]) // 10) * 10
                parts.append(f'decade_{decade}s')
            except (ValueError, IndexError):
                pass

        # Rating bucket
        rating = movie.get('rating', 0)
        if isinstance(rating, (int, float)) and rating > 0:
            bucket = 'high' if rating >= 4 else 'mid' if rating >= 2.5 else 'low'
            parts.append(f'rating_{bucket}')

        # Mood
        mood = movie.get('mood', '')
        if mood:
            parts.append(f'mood_{mood.lower()}')

        return ' '.join(parts) if parts else 'unknown'

    def build_profile(self, collection):
        """
        Build a user taste profile from their movie collection.

        Steps:
        1. Extract feature strings for every movie
        2. Fit TF-IDF vectorizer on all feature strings
        3. Transform each movie → TF-IDF vector
        4. Weighted average based on user ratings → one profile vector
        """
        if not collection or len(collection) < 2:
            self.is_fitted = False
            return {'success': False, 'message': 'Need at least 2 movies for recommendations'}

        # Extract feature strings for each movie
        feature_strings = [self.extract_features(m) for m in collection]

        # Fit and transform using scikit-learn's TfidfVectorizer
        tfidf_matrix = self.vectorizer.fit_transform(feature_strings)
        self.feature_names = self.vectorizer.get_feature_names_out().tolist()
        self.is_fitted = True

        # Build weighted user profile vector
        # Movies with higher ratings influence the profile more
        weights = []
        for movie in collection:
            rating = movie.get('rating', 0)
            if isinstance(rating, (int, float)) and rating > 0:
                weight = 1.5 if rating >= 4 else 1.0 if rating >= 3 else 0.7
            else:
                weight = 1.0
            weights.append(weight)

        weights = np.array(weights).reshape(-1, 1)
        weighted_matrix = tfidf_matrix.toarray() * weights

        # Average → user profile vector
        self.user_profile_vector = np.mean(weighted_matrix, axis=0).reshape(1, -1)

        # Extract top taste traits for the response
        top_indices = np.argsort(self.user_profile_vector[0])[::-1][:10]
        top_traits = [
            {
                'feature': self.feature_names[i],
                'weight': round(float(self.user_profile_vector[0][i]), 3)
            }
            for i in top_indices
            if self.user_profile_vector[0][i] > 0
        ]

        return {
            'success': True,
            'message': f'Profile built from {len(collection)} movies',
            'top_traits': top_traits,
            'total_features': len(self.feature_names)
        }

    def score_movie(self, movie):
        """
        Score a single movie against the user's taste profile.

        Returns a percentage (0-100) representing how well the movie
        matches the user's taste, using cosine similarity.
        """
        if not self.is_fitted or self.user_profile_vector is None:
            return 0

        feature_string = self.extract_features(movie)

        try:
            movie_vector = self.vectorizer.transform([feature_string])
        except Exception:
            return 0

        # Cosine similarity between user profile and movie vector
        similarity = cosine_similarity(self.user_profile_vector, movie_vector.toarray())
        score = float(similarity[0][0])

        # Convert to percentage (0-100)
        return min(round(score * 100), 100)

    def get_recommendations(self, collection):
        """
        Generate smart recommendations based on the user's collection.

        Analyzes the TF-IDF profile to find the user's strongest
        preferences and suggests searches for similar content.
        """
        if not self.is_fitted:
            self.build_profile(collection)

        if not self.is_fitted:
            return []

        suggestions = []
        top_indices = np.argsort(self.user_profile_vector[0])[::-1][:15]

        genre_added = False
        director_added = False
        actor_count = 0

        for i in top_indices:
            feature = self.feature_names[i]
            weight = float(self.user_profile_vector[0][i])

            if weight <= 0:
                continue

            confidence = min(round(weight * 100), 99)

            if feature.startswith('genre_') and not genre_added:
                genre = feature.replace('genre_', '')
                suggestions.append({
                    'type': 'genre',
                    'message': f'Your taste profile strongly favors {genre} (confidence: {confidence}%)',
                    'searchTerm': genre,
                    'confidence': confidence
                })
                genre_added = True

            elif feature.startswith('director_') and not director_added:
                director = feature.replace('director_', '')
                suggestions.append({
                    'type': 'director',
                    'message': f"You really enjoy {director}'s filmmaking style",
                    'searchTerm': director,
                    'confidence': confidence
                })
                director_added = True

            elif feature.startswith('actor_') and actor_count < 2:
                actor = feature.replace('actor_', '')
                suggestions.append({
                    'type': 'actor',
                    'message': f'You tend to enjoy movies with {actor}',
                    'searchTerm': actor,
                    'confidence': confidence
                })
                actor_count += 1

        return suggestions[:5]


# ===== GLOBAL RECOMMENDER INSTANCE =====
recommender = MovieRecommender()


# ===== API ENDPOINTS =====

@app.route('/api/profile', methods=['POST'])
def build_profile():
    """
    Build a user taste profile from their movie collection.

    Request body (JSON):
    {
        "collection": [
            { "title": "...", "genre": "...", "director": "...", "actors": "...", "year": "...", "rating": 4 },
            ...
        ]
    }
    """
    data = request.get_json()
    if not data or 'collection' not in data:
        return jsonify({'success': False, 'message': 'Missing "collection" in request body'}), 400

    result = recommender.build_profile(data['collection'])
    return jsonify(result)


@app.route('/api/score', methods=['POST'])
def score_movie():
    """
    Score a single movie against the user's taste profile.

    Request body (JSON):
    {
        "movie": { "title": "...", "genre": "...", "director": "...", "actors": "...", "year": "..." }
    }
    """
    data = request.get_json()
    if not data or 'movie' not in data:
        return jsonify({'success': False, 'message': 'Missing "movie" in request body'}), 400

    score = recommender.score_movie(data['movie'])
    return jsonify({'success': True, 'score': score})


@app.route('/api/recommend', methods=['POST'])
def get_recommendations():
    """
    Get smart ML recommendations based on the user's collection.

    Request body (JSON):
    {
        "collection": [
            { "title": "...", "genre": "...", "director": "...", "actors": "...", "year": "...", "rating": 4 },
            ...
        ]
    }
    """
    data = request.get_json()
    if not data or 'collection' not in data:
        return jsonify({'success': False, 'message': 'Missing "collection" in request body'}), 400

    # Rebuild profile with latest collection
    recommender.build_profile(data['collection'])
    suggestions = recommender.get_recommendations(data['collection'])

    # Get top traits for taste profile display
    top_traits = []
    if recommender.is_fitted:
        top_indices = np.argsort(recommender.user_profile_vector[0])[::-1][:5]
        top_traits = [recommender.feature_names[i] for i in top_indices
                      if recommender.user_profile_vector[0][i] > 0]

    return jsonify({
        'success': True,
        'suggestions': suggestions,
        'top_traits': top_traits
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint — frontend uses this to detect server availability."""
    return jsonify({'status': 'ok', 'engine': 'scikit-learn', 'version': '1.0.0'})


# ===== RUN SERVER =====
if __name__ == '__main__':
    print('=' * 60)
    print('🎬 Movie Library — ML Recommender Server')
    print('=' * 60)
    print('Engine:    scikit-learn (TF-IDF + Cosine Similarity)')
    print('Endpoints:')
    print('  POST /api/profile    — Build user taste profile')
    print('  POST /api/score      — Score a single movie')
    print('  POST /api/recommend  — Get smart recommendations')
    print('  GET  /api/health     — Health check')
    print('=' * 60)
    print('  GET  /api/health     — Health check')
    print('=' * 60)
    
    # Use PORT environment variable if available (Render/Heroku), else 5000
    import os
    port = int(os.environ.get('PORT', 5000))
    
    # Listen on 0.0.0.0 to allow external access (required for Docker/Render)
    app.run(host='0.0.0.0', port=port)
