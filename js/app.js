// ===== MAIN APPLICATION =====
// This file orchestrates the entire app: screens, events, and connecting all classes.
// Enhanced with ALL 16 creative features.

// ===== APPLICATION STATE =====
const state = {
    currentUser: null,       // The logged-in User object
    currentFilter: 'all',   // Current genre filter
    currentSort: 'dateAdded', // Feature 2: Current sort method
    selectedRating: 0,       // Star rating selected in review form
    currentTab: 'collection', // Feature 6: 'collection' or 'watchlist'
    quizMovie: null          // Feature 14: Current quiz movie
};

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function showModal() {
    document.getElementById('movie-modal').classList.remove('hidden');
}

function hideModal() {
    document.getElementById('movie-modal').classList.add('hidden');
}

// ===== FEATURE 1: THEME TOGGLE =====
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);

    const btn = document.getElementById('theme-toggle-btn');
    btn.textContent = next === 'dark' ? '🌙' : '☀️';

    if (state.currentUser) {
        state.currentUser.theme = next;
        state.currentUser.saveToStorage();
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}

// ===== FEATURE 4: TOAST NOTIFICATIONS (replaces alert()) =====
function showToast(message, type = 'info') {
    ToastManager.show(message, type);
}

// ===== AUTH FUNCTIONS =====
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me-checkbox').checked;
    const errorEl = document.getElementById('login-error');

    const result = User.login(email, password);

    if (result.success) {
        state.currentUser = result.user;
        errorEl.textContent = '';
        document.getElementById('login-form').reset();

        // Feature: Remember Me
        if (rememberMe) {
            localStorage.setItem('movieLibraryRememberMe', 'true');
        } else {
            localStorage.removeItem('movieLibraryRememberMe');
        }

        showDashboard();
        showToast(`Welcome back, ${state.currentUser.name}!`, 'success');
    } else {
        errorEl.textContent = result.message;
    }
}

function togglePasswordVisibility(inputEl, toggleBtn) {
    if (!inputEl || !toggleBtn) return;
    const isHidden = inputEl.type === 'password';
    inputEl.type = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const securityQuestion = document.getElementById('signup-security-question').value;
    const securityAnswer = document.getElementById('signup-security-answer').value.trim();
    const errorEl = document.getElementById('signup-error');

    if (name.length < 2) {
        errorEl.textContent = 'Name must be at least 2 characters.';
        return;
    }

    if (!securityQuestion) {
        errorEl.textContent = 'Please select a security question.';
        return;
    }

    if (!securityAnswer) {
        errorEl.textContent = 'Please provide an answer to the security question.';
        return;
    }

    const result = User.signup(name, email, password, securityQuestion, securityAnswer);

    if (result.success) {
        state.currentUser = result.user;
        errorEl.textContent = '';
        document.getElementById('signup-form').reset();
        showDashboard();
        showToast(`Welcome to Movie Library, ${name}! 🎬`, 'success');
    } else {
        errorEl.textContent = result.message;
    }
}

function handleLogout() {
    User.logout();
    state.currentUser = null;
    showScreen('auth-screen');
    showToast('Logged out successfully.', 'info');
}

// ===== FORGOT PASSWORD / RESET =====
let resetStep = 'email'; // 'email' → 'answer' → 'newPassword'
let resetEmail = '';

function showForgotPassword() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById('reset-form').classList.remove('hidden');
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    resetStep = 'email';
    resetEmail = '';
    document.getElementById('reset-question-group').classList.add('hidden');
    document.getElementById('reset-password-group').classList.add('hidden');
    document.getElementById('reset-submit-btn').textContent = 'Verify Email';
    document.getElementById('reset-error').textContent = '';
    document.getElementById('reset-form').reset();
}

function backToLogin() {
    document.getElementById('reset-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('login-tab').classList.add('active');
}

function handleResetSubmit() {
    const errorEl = document.getElementById('reset-error');
    errorEl.textContent = '';

    if (resetStep === 'email') {
        // Step 1: Verify email and show security question
        const email = document.getElementById('reset-email').value.trim();
        if (!email) {
            errorEl.textContent = 'Please enter your email.';
            return;
        }
        const question = User.getSecurityQuestion(email);

        if (!question) {
            errorEl.textContent = 'No account found with this email, or no security question set.';
            return;
        }

        resetEmail = email;
        document.getElementById('reset-question-label').textContent = question;
        document.getElementById('reset-question-group').classList.remove('hidden');
        document.getElementById('reset-email').disabled = true;
        document.getElementById('reset-submit-btn').textContent = 'Verify Answer';
        resetStep = 'answer';

    } else if (resetStep === 'answer') {
        // Step 2: Show new password field
        const answer = document.getElementById('reset-answer').value.trim();
        if (!answer) {
            errorEl.textContent = 'Please provide your security answer.';
            return;
        }
        const verification = User.verifySecurityAnswer(resetEmail, answer);
        if (!verification.success) {
            errorEl.textContent = verification.message;
            return;
        }
        document.getElementById('reset-password-group').classList.remove('hidden');
        document.getElementById('reset-submit-btn').textContent = 'Reset Password';
        resetStep = 'newPassword';

    } else if (resetStep === 'newPassword') {
        // Step 3: Attempt password reset
        const answer = document.getElementById('reset-answer').value.trim();
        const newPassword = document.getElementById('reset-new-password').value;

        const result = User.resetPassword(resetEmail, answer, newPassword);
        if (result.success) {
            showToast(result.message, 'success');
            backToLogin();
        } else {
            errorEl.textContent = result.message;
        }
    }
}

// ===== ACCOUNT SECURITY (SET SECURITY QUESTION) =====
function showSecuritySettings() {
    if (!state.currentUser) return;

    const currentQuestion = state.currentUser.securityQuestion || '';
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="security-settings">
            <h2>🔐 Account Recovery</h2>
            <p class="info-text">Set a security question to recover your account if you forget your password.</p>
            <div class="form-group">
                <label for="security-question-select">Security Question</label>
                <select id="security-question-select">
                    <option value="">Select a question...</option>
                    <option value="What is your favorite movie?">What is your favorite movie?</option>
                    <option value="What city were you born in?">What city were you born in?</option>
                    <option value="What is your pet's name?">What is your pet's name?</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="What was your first school?">What was your first school?</option>
                </select>
            </div>
            <div class="form-group">
                <label for="security-answer-input">Security Answer</label>
                <input type="text" id="security-answer-input" placeholder="Your answer (case-insensitive)">
            </div>
            <button class="btn btn-primary" id="save-security-settings-btn">Save Security Question</button>
            <p class="error-message" id="security-settings-error"></p>
        </div>
    `;

    const questionSelect = document.getElementById('security-question-select');
    if (questionSelect && currentQuestion) {
        questionSelect.value = currentQuestion;
    }

    document.getElementById('save-security-settings-btn').addEventListener('click', () => {
        const question = document.getElementById('security-question-select').value;
        const answer = document.getElementById('security-answer-input').value.trim();
        const errorEl = document.getElementById('security-settings-error');
        errorEl.textContent = '';

        const result = state.currentUser.setSecurityQuestion(question, answer);
        if (result.success) {
            showToast(result.message, 'success');
            hideModal();
        } else {
            errorEl.textContent = result.message;
        }
    });

    showModal();
}

// ===== DASHBOARD =====
function showDashboard() {
    showScreen('dashboard-screen');
    document.getElementById('user-greeting').textContent = `Welcome, ${state.currentUser.name}`;
    applyTheme(state.currentUser.theme);
    updateStats();
    renderCollection();
    checkAchievements();
}

function updateStats() {
    const stats = state.currentUser.getStats();
    document.getElementById('user-stats').innerHTML = `
        <span class="stat-item">📚 ${stats.totalMovies} movies</span>
        <span class="stat-item">⭐ ${stats.reviewedMovies} reviewed</span>
        <span class="stat-item">🎭 Top: ${stats.topGenre}</span>
        <span class="stat-item">📋 ${stats.watchlistCount} watchlist</span>
    `;
}

// ===== FEATURE 10: ACHIEVEMENTS =====
function checkAchievements() {
    if (!state.currentUser) return;
    const newlyUnlocked = AchievementManager.checkAll(state.currentUser);
    newlyUnlocked.forEach(achievement => {
        showToast(`🏆 Achievement Unlocked: ${achievement.title}!`, 'success');
        appEvents.emit('achievement:unlocked', achievement);
    });
    if (newlyUnlocked.length > 0) {
        state.currentUser.saveToStorage();
    }
}

function showAchievements() {
    const progress = AchievementManager.getProgress();
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="achievements-panel">
            <h2>🏆 Achievements</h2>
            <div class="achievement-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                </div>
                <span class="progress-text">${progress.unlocked}/${progress.total} (${progress.percentage}%)</span>
            </div>
            <div class="achievements-grid">
                ${AchievementManager.displayAll()}
            </div>
        </div>
    `;
    showModal();
}

// ===== FEATURE 5: STATS DASHBOARD =====
function showStatsDashboard() {
    if (!state.currentUser) return;
    const stats = state.currentUser.getStats();
    const moodStats = state.currentUser.getMoodStats();
    const progress = AchievementManager.getProgress();

    // Build genre chart (pure CSS bar chart)
    let genreChartHTML = '';
    const maxCount = Math.max(...Object.values(stats.genres), 1);
    const genreColors = {
        'Action': 'var(--action-color)', 'Comedy': 'var(--comedy-color)',
        'Drama': 'var(--drama-color)', 'Horror': 'var(--horror-color)'
    };

    Object.entries(stats.genres).sort((a, b) => b[1] - a[1]).forEach(([genre, count]) => {
        const pct = Math.round((count / maxCount) * 100);
        const color = genreColors[genre] || 'var(--other-color)';
        genreChartHTML += `
            <div class="chart-bar-row">
                <span class="chart-label">${genre}</span>
                <div class="chart-bar-bg">
                    <div class="chart-bar-fill" style="width: ${pct}%; background: ${color}"></div>
                </div>
                <span class="chart-value">${count}</span>
            </div>
        `;
    });

    // Mood chart
    let moodChartHTML = '';
    const moodEmojis = {
        happy: '😊', sad: '😢', inspired: '✨', scared: '😨',
        excited: '🤩', thoughtful: '🤔', relaxed: '😌', nostalgic: '🥹'
    };
    Object.entries(moodStats).forEach(([mood, count]) => {
        moodChartHTML += `<span class="mood-stat-item">${moodEmojis[mood] || '🎬'} ${mood}: ${count}</span>`;
    });

    const movieOfMonthHTML = stats.movieOfMonth
        ? `<div class="motm"><span class="motm-label">🌟 Movie of the Month</span><span class="motm-title">${stats.movieOfMonth.title} (${stats.movieOfMonth.getStars()})</span></div>`
        : '<div class="motm"><span class="motm-label">🌟 Movie of the Month</span><span class="motm-title">Add a rated movie this month!</span></div>';

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="stats-dashboard">
            <h2>📊 Your Stats Dashboard</h2>
            <div class="stats-grid">
                <div class="stats-card">
                    <span class="stats-number">${stats.totalMovies}</span>
                    <span class="stats-label">Movies</span>
                </div>
                <div class="stats-card">
                    <span class="stats-number">${stats.totalReviews}</span>
                    <span class="stats-label">Reviews</span>
                </div>
                <div class="stats-card">
                    <span class="stats-number">${stats.avgRating}</span>
                    <span class="stats-label">Avg Rating</span>
                </div>
                <div class="stats-card">
                    <span class="stats-number">${progress.percentage}%</span>
                    <span class="stats-label">Achievements</span>
                </div>
            </div>
            ${movieOfMonthHTML}
            <h3>📈 Genre Breakdown</h3>
            <div class="genre-chart">${genreChartHTML || '<p class="info-message">No movies yet!</p>'}</div>
            ${moodChartHTML ? `<h3>🎭 Mood Journey</h3><div class="mood-chart">${moodChartHTML}</div>` : ''}
        </div>
    `;
    showModal();
}

// ===== FEATURE 12: TIMELINE =====
function showTimeline() {
    if (!state.currentUser) return;
    const events = state.currentUser.getTimeline();

    let timelineHTML = events.length === 0
        ? '<p class="info-message">No activity yet. Start adding movies!</p>'
        : events.slice(0, 30).map(event => {
            const date = new Date(event.date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const ratingStr = event.rating ? ` (${'★'.repeat(event.rating)})` : '';
            return `
                <div class="timeline-item">
                    <span class="timeline-icon">${event.icon}</span>
                    <div class="timeline-content">
                        <span class="timeline-title">${event.title}${ratingStr}</span>
                        <span class="timeline-date">${date}</span>
                    </div>
                </div>
            `;
        }).join('');

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="timeline-panel">
            <h2>⏱️ Watch History Timeline</h2>
            <div class="timeline-list">${timelineHTML}</div>
        </div>
    `;
    showModal();
}

// ===== FEATURE 13: ML RECOMMENDATIONS (Python + JS Fallback) =====
async function showRecommendations() {
    if (!state.currentUser) return;

    // Show loading state while Python backend processes
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="recommendations-panel">
            <h2>🤖 AI Recommendations For You</h2>
            <p class="info-message">Analyzing your taste profile...</p>
        </div>
    `;
    showModal();

    // Use async Python backend (falls back to JS automatically)
    const mlSuggestions = await recommender.getSmartSuggestionsAsync(state.currentUser.collection);

    // Fallback to basic recommendations if ML has no data
    const basicSuggestions = state.currentUser.getRecommendations();
    const allSuggestions = mlSuggestions.length > 0 ? mlSuggestions : basicSuggestions;

    let recsHTML = allSuggestions.length === 0
        ? '<p class="info-message">Add more movies to get personalized AI recommendations!</p>'
        : allSuggestions.map(s => {
            const confidenceBadge = s.confidence
                ? `<span class="ml-confidence">${s.confidence}% confidence</span>`
                : '';
            return `
                <div class="rec-card">
                    <span class="rec-type">${s.type === 'genre' ? '🎭' : s.type === 'director' ? '🎬' : s.type === 'actor' ? '🎭' : '⭐'}</span>
                    <div class="rec-info">
                        <span class="rec-message">${s.message}</span>
                        ${confidenceBadge}
                        <button class="btn btn-small btn-primary rec-search-btn" data-term="${s.searchTerm}">🔍 Search "${s.searchTerm}"</button>
                    </div>
                </div>
            `;
        }).join('');

    // User taste profile summary
    const profile = recommender.userProfile;
    const topTraits = Object.entries(profile)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([term]) => {
            const parts = term.split(':');
            return parts.length > 1 ? parts[1] : parts[0];
        })
        .join(', ');

    // Show which ML engine is active
    const engineLabel = recommender.serverAvailable
        ? '🐍 Powered by Python (scikit-learn)'
        : '⚡ Powered by JavaScript (client-side)';

    const profileHTML = Object.keys(profile).length > 0
        ? `<div class="taste-profile"><h4>🧠 Your Taste DNA</h4><p>Top traits: <strong>${topTraits}</strong></p><p class="info-text">${engineLabel}</p></div>`
        : '';

    modalBody.innerHTML = `
        <div class="recommendations-panel">
            <h2>🤖 AI Recommendations For You</h2>
            ${profileHTML}
            ${recsHTML}
        </div>
    `;

    // Wire up recommendation search buttons
    document.querySelectorAll('.rec-search-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal();
            document.getElementById('search-input').value = btn.dataset.term;
            handleSearch();
        });
    });
}

// ===== FEATURE 14: MOVIE QUIZ =====
function startQuiz() {
    if (!state.currentUser || state.currentUser.collection.length < 3) {
        showToast('Need at least 3 movies in your collection to play!', 'warning');
        return;
    }

    const movies = state.currentUser.collection;
    const quizMovie = movies[Math.floor(Math.random() * movies.length)];
    state.quizMovie = quizMovie;

    // Generate wrong answers
    const otherMovies = movies.filter(m => m.imdbID !== quizMovie.imdbID);
    const shuffled = otherMovies.sort(() => Math.random() - 0.5);
    const choices = [quizMovie.title, shuffled[0].title, shuffled[1].title].sort(() => Math.random() - 0.5);

    // Random quiz type: plot or year
    const quizType = Math.random() > 0.5 ? 'plot' : 'year';
    const question = quizType === 'plot'
        ? `Which movie has this plot?<br><em>"${quizMovie.plot.length > 150 ? quizMovie.plot.substring(0, 150) + '...' : quizMovie.plot}"</em>`
        : `Which movie was released in ${quizMovie.year}?<br><em>Directed by ${quizMovie.director}</em>`;

    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <div class="quiz-panel">
            <h2>🎮 Movie Quiz</h2>
            <div class="quiz-question">${question}</div>
            <div class="quiz-choices">
                ${choices.map(c => `<button class="btn btn-secondary quiz-choice" data-answer="${c}">${c}</button>`).join('')}
            </div>
            <div id="quiz-result" class="quiz-result"></div>
        </div>
    `;
    showModal();

    document.querySelectorAll('.quiz-choice').forEach(btn => {
        btn.addEventListener('click', () => {
            const isCorrect = btn.dataset.answer === quizMovie.title;
            const resultEl = document.getElementById('quiz-result');

            document.querySelectorAll('.quiz-choice').forEach(b => {
                b.disabled = true;
                if (b.dataset.answer === quizMovie.title) {
                    b.classList.add('quiz-correct');
                }
            });

            if (isCorrect) {
                resultEl.innerHTML = '✅ Correct! Great movie knowledge!';
                resultEl.className = 'quiz-result quiz-success';
                showToast('Quiz: Correct answer! 🎉', 'success');
            } else {
                btn.classList.add('quiz-wrong');
                resultEl.innerHTML = `❌ Wrong! It was "${quizMovie.title}"`;
                resultEl.className = 'quiz-result quiz-fail';
            }
        });
    });
}

// ===== SEARCH =====
async function handleSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    const searchMessage = document.getElementById('search-message');
    const resultsGrid = document.getElementById('search-results-grid');
    const resultsContainer = document.getElementById('search-results');

    // Feature 9: Gather advanced search options
    const yearInput = document.getElementById('search-year');
    const typeInput = document.getElementById('search-type');
    const options = {};
    if (yearInput && yearInput.value) options.year = yearInput.value;
    if (typeInput && typeInput.value) options.type = typeInput.value;

    searchMessage.textContent = 'Searching...';
    resultsGrid.innerHTML = '';
    resultsContainer.classList.remove('hidden');

    const results = await MovieAPI.search(query, options);

    if (results.length === 0) {
        searchMessage.textContent = 'No movies found. Try a different title.';
        return;
    }

    searchMessage.textContent = '';

    for (const result of results) {
        const details = await MovieAPI.getById(result.imdbID);
        if (!details) continue;

        const movie = createMovie(details);
        const isInCollection = state.currentUser.collection.some(m => m.imdbID === movie.imdbID);
        const isInWatchlist = state.currentUser.watchlist.some(m => m.imdbID === movie.imdbID);

        // ML: Compute match score for this movie
        let matchBadge = '';
        if (state.currentUser.collection.length >= 2) {
            const score = recommender.scoreMovie(movie);
            if (score > 0) {
                const matchClass = score >= 70 ? 'match-high' : score >= 40 ? 'match-mid' : 'match-low';
                matchBadge = `<span class="ml-match-badge ${matchClass}">${score}% match</span>`;
            }
        }

        const cardHTML = `
            <div class="movie-card ${movie.getGenreClass()}">
                <span class="genre-badge ${movie.getBadgeClass()}">${movie.genre}</span>
                ${matchBadge}
                ${movie.poster && movie.poster !== 'N/A'
                ? `<img src="${movie.poster}" alt="${movie.title}" class="movie-poster">`
                : `<div class="movie-poster-placeholder">${movie.getEmoji()}</div>`
            }
                <div class="movie-info">
                    <div class="movie-title">${movie.title}</div>
                    <div class="movie-year">${movie.year} · ${movie.director}</div>
                </div>
                <div class="movie-card-actions">
                    ${isInCollection
                ? '<button class="btn btn-small btn-secondary" disabled>✓ In Collection</button>'
                : `<button class="btn btn-small btn-success add-movie-btn" data-imdbid="${movie.imdbID}">+ Add</button>`
            }
                    ${isInWatchlist
                ? '<button class="btn btn-small btn-secondary" disabled>📋 Watchlisted</button>'
                : !isInCollection
                    ? `<button class="btn btn-small btn-warning add-watchlist-btn" data-imdbid="${movie.imdbID}">📋</button>`
                    : ''
            }
                    <button class="btn btn-small btn-primary view-detail-btn" data-imdbid="${movie.imdbID}">Info</button>
                </div>
            </div>
        `;
        resultsGrid.innerHTML += cardHTML;
    }

    // "Add" buttons
    resultsGrid.querySelectorAll('.add-movie-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const imdbID = btn.dataset.imdbid;
            const details = await MovieAPI.getById(imdbID);
            if (details) {
                const movie = createMovie(details);
                const result = state.currentUser.addMovie(movie);
                if (result.success) {
                    btn.textContent = '✓ Added';
                    btn.disabled = true;
                    btn.className = 'btn btn-small btn-secondary';
                    renderCollection();
                    updateStats();
                    checkAchievements();
                    showToast(result.message, 'success');
                }
            }
        });
    });

    // Feature 6: "Add to Watchlist" buttons
    resultsGrid.querySelectorAll('.add-watchlist-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const imdbID = btn.dataset.imdbid;
            const details = await MovieAPI.getById(imdbID);
            if (details) {
                const movie = createMovie(details);
                const result = state.currentUser.addToWatchlist(movie);
                if (result.success) {
                    btn.textContent = '📋 ✓';
                    btn.disabled = true;
                    btn.className = 'btn btn-small btn-secondary';
                    updateStats();
                    checkAchievements();
                    showToast(result.message, 'success');
                } else {
                    showToast(result.message, 'warning');
                }
            }
        });
    });

    // "Info" buttons
    resultsGrid.querySelectorAll('.view-detail-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const imdbID = btn.dataset.imdbid;
            const details = await MovieAPI.getById(imdbID);
            if (details) {
                const movie = createMovie(details);
                showMovieDetail(movie, false);
            }
        });
    });
}

function closeSearch() {
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results-grid').innerHTML = '';
}

// ===== FEATURE 9: ADVANCED SEARCH TOGGLE =====
function toggleAdvancedSearch() {
    const panel = document.getElementById('advanced-search-panel');
    panel.classList.toggle('hidden');
}

// ===== COLLECTION RENDERING =====
function renderCollection() {
    // Feature 2: Apply current sort
    state.currentUser.sortCollection(state.currentSort);

    const movies = state.currentUser.filterByGenre(state.currentFilter);
    const grid = document.getElementById('collection-grid');
    const emptyMsg = document.getElementById('empty-collection');
    const count = document.getElementById('collection-count');

    count.textContent = `(${state.currentUser.collection.length} movies)`;

    if (movies.length === 0) {
        grid.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        emptyMsg.textContent = state.currentFilter === 'all'
            ? 'Your collection is empty. Search for movies to add!'
            : `No ${state.currentFilter} movies in your collection.`;
        return;
    }

    emptyMsg.classList.add('hidden');

    // Use each movie's display() method — THIS IS POLYMORPHISM IN ACTION!
    grid.innerHTML = movies.map(movie => movie.display()).join('');

    // Click on a card → open detail modal
    grid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const imdbID = card.dataset.imdbid;
            const movie = state.currentUser.getMovie(imdbID);
            if (movie) showMovieDetail(movie, true);
        });
    });
}

// ===== FEATURE 6: WATCHLIST RENDERING =====
function renderWatchlist() {
    const grid = document.getElementById('collection-grid');
    const emptyMsg = document.getElementById('empty-collection');
    const count = document.getElementById('collection-count');
    const movies = state.currentUser.watchlist;

    count.textContent = `(${movies.length} movies)`;

    if (movies.length === 0) {
        grid.innerHTML = '';
        emptyMsg.classList.remove('hidden');
        emptyMsg.textContent = 'Your watchlist is empty. Search for movies to add!';
        return;
    }

    emptyMsg.classList.add('hidden');

    grid.innerHTML = movies.map(movie => {
        const posterHTML = movie.poster && movie.poster !== 'N/A'
            ? `<img src="${movie.poster}" alt="${movie.title}" class="movie-poster">`
            : `<div class="movie-poster-placeholder">${movie.getEmoji()}</div>`;
        return `
            <div class="movie-card ${movie.getGenreClass()}" data-imdbid="${movie.imdbID}">
                <span class="genre-badge ${movie.getBadgeClass()}">${movie.genre}</span>
                ${posterHTML}
                <div class="movie-info">
                    <div class="movie-title">${movie.title}</div>
                    <div class="movie-year">${movie.year} · ${movie.director || 'Unknown'}</div>
                </div>
                <div class="movie-card-actions">
                    <button class="btn btn-small btn-success move-to-collection-btn" data-imdbid="${movie.imdbID}">✓ Watched</button>
                    <button class="btn btn-small btn-danger remove-watchlist-btn" data-imdbid="${movie.imdbID}">✕</button>
                </div>
            </div>
        `;
    }).join('');

    // "Move to collection" buttons
    grid.querySelectorAll('.move-to-collection-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const result = state.currentUser.moveToCollection(btn.dataset.imdbid);
            if (result.success) {
                showToast(result.message, 'success');
                renderWatchlist();
                updateStats();
                checkAchievements();
            }
        });
    });

    // "Remove from watchlist" buttons
    grid.querySelectorAll('.remove-watchlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const result = state.currentUser.removeFromWatchlist(btn.dataset.imdbid);
            if (result.success) {
                showToast(result.message, 'info');
                renderWatchlist();
                updateStats();
            }
        });
    });
}

// Switch between collection and watchlist tabs
function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');

    const sectionTitle = document.querySelector('.section-title');
    if (tab === 'collection') {
        sectionTitle.innerHTML = `My Collection <span id="collection-count">(0 movies)</span>`;
        renderCollection();
    } else {
        sectionTitle.innerHTML = `My Watchlist <span id="collection-count">(0 movies)</span>`;
        renderWatchlist();
    }
}

// ===== MOVIE DETAIL MODAL =====
function showMovieDetail(movie, isInCollection) {
    const modalBody = document.getElementById('modal-body');

    const posterHTML = movie.poster && movie.poster !== 'N/A'
        ? `<img src="${movie.poster}" alt="${movie.title}" class="movie-detail-poster">`
        : `<div class="movie-poster-placeholder" style="height:300px">${movie.getEmoji()}</div>`;

    // Feature 7: Tags section
    let tagsHTML = '';
    if (isInCollection) {
        const existingTags = movie.tags.map(t => `<span class="tag">${t} <button class="tag-remove" data-tag="${t}">✕</button></span>`).join('');
        tagsHTML = `
            <div class="tags-section">
                <h4>🏷️ Tags</h4>
                <div class="tags-list">${existingTags || '<span class="info-text">No tags yet</span>'}</div>
                <div class="tag-input-row">
                    <input type="text" id="tag-input" placeholder="Add a tag..." class="tag-input">
                    <button class="btn btn-small btn-primary" id="add-tag-btn">Add</button>
                </div>
            </div>
        `;
    }

    // Feature 11: Mood selector
    let moodHTML = '';
    if (isInCollection) {
        const moods = ['happy', 'sad', 'inspired', 'scared', 'excited', 'thoughtful', 'relaxed', 'nostalgic'];
        const moodEmojis = { happy: '😊', sad: '😢', inspired: '✨', scared: '😨', excited: '🤩', thoughtful: '🤔', relaxed: '😌', nostalgic: '🥹' };
        moodHTML = `
            <div class="mood-section">
                <h4>🎭 How did this movie make you feel?</h4>
                <div class="mood-selector">
                    ${moods.map(m => `<button class="mood-btn ${movie.mood === m ? 'active' : ''}" data-mood="${m}" title="${m}">${moodEmojis[m]}</button>`).join('')}
                </div>
                ${movie.mood ? `<span class="current-mood">Current: ${moodEmojis[movie.mood]} ${movie.mood}</span>` : ''}
            </div>
        `;
    }

    // Reviews
    let reviewsHTML = '';
    if (isInCollection) {
        const existingReviews = movie.reviews.map(r => r.display()).join('');
        reviewsHTML = `
            <div class="reviews-section">
                <h3>⭐ Reviews (${movie.reviews.length})</h3>
                <div class="review-form">
                    <h4>Write a Review</h4>
                    <div class="star-input" id="star-input">
                        <span data-value="1">☆</span>
                        <span data-value="2">☆</span>
                        <span data-value="3">☆</span>
                        <span data-value="4">☆</span>
                        <span data-value="5">☆</span>
                    </div>
                    <div class="form-group">
                        <textarea id="review-text" rows="3" placeholder="What did you think of this movie?"></textarea>
                    </div>
                    <button class="btn btn-primary btn-small" id="submit-review-btn" data-imdbid="${movie.imdbID}">Submit Review</button>
                </div>
                <div id="reviews-list">${existingReviews || '<p class="info-message">No reviews yet. Be the first!</p>'}</div>
            </div>
        `;
    }

    // Action buttons
    const shareBtn = isInCollection
        ? `<button class="btn btn-primary btn-small" id="share-movie-btn" data-imdbid="${movie.imdbID}">📤 Share</button>`
        : '';
    const removeBtn = isInCollection
        ? `<button class="btn btn-danger btn-small" id="remove-movie-btn" data-imdbid="${movie.imdbID}">🗑 Remove</button>`
        : '';

    modalBody.innerHTML = `
        <div class="movie-detail">
            <div>${posterHTML}</div>
            <div class="movie-detail-info">
                <h2>${movie.title} (${movie.year})</h2>
                <div class="movie-detail-meta">
                    <span class="genre-badge ${movie.getBadgeClass()}">${movie.genre}</span>
                    <span>${movie.getStars()}</span>
                </div>
                <p class="movie-detail-plot">${movie.plot}</p>
                <div class="movie-detail-crew">
                    <p><strong>Director:</strong> ${movie.director}</p>
                    <p><strong>Cast:</strong> ${movie.actors}</p>
                </div>
                <div class="movie-detail-actions">
                    ${shareBtn}
                    ${removeBtn}
                    <a href="https://www.imdb.com/title/${movie.imdbID}/" target="_blank" class="btn btn-small btn-streaming btn-imdb">🎥 IMDb</a>
                    <a href="https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)}" target="_blank" class="btn btn-small btn-streaming btn-justwatch">📺 JustWatch</a>
                    <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' ' + movie.year + ' full movie')}" target="_blank" class="btn btn-small btn-streaming btn-youtube">▶️ YouTube</a>
                </div>
            </div>
        </div>
        ${tagsHTML}
        ${moodHTML}
        ${reviewsHTML}
    `;

    showModal();
    state.selectedRating = 0;

    // Star input interactivity
    const starInput = document.getElementById('star-input');
    if (starInput) {
        starInput.querySelectorAll('span').forEach(star => {
            star.addEventListener('click', () => {
                state.selectedRating = parseInt(star.dataset.value);
                updateStarDisplay();
            });
            star.addEventListener('mouseenter', () => {
                highlightStars(parseInt(star.dataset.value));
            });
        });
        starInput.addEventListener('mouseleave', () => {
            highlightStars(state.selectedRating);
        });
    }

    // Submit review handler
    const submitBtn = document.getElementById('submit-review-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => handleSubmitReview(movie.imdbID));
    }

    // Remove movie handler
    const removeMovieBtn = document.getElementById('remove-movie-btn');
    if (removeMovieBtn) {
        removeMovieBtn.addEventListener('click', () => {
            const result = state.currentUser.removeMovie(movie.imdbID);
            if (result.success) {
                hideModal();
                renderCollection();
                updateStats();
                checkAchievements();
                showToast(result.message, 'info');
            }
        });
    }

    // Feature 8: Share button
    const shareBtnEl = document.getElementById('share-movie-btn');
    if (shareBtnEl) {
        shareBtnEl.addEventListener('click', () => {
            const shareData = state.currentUser.getShareableLink(movie.imdbID);
            if (shareData) {
                navigator.clipboard.writeText(shareData).then(() => {
                    showToast('Movie recommendation copied to clipboard! 📋', 'success');
                }).catch(() => {
                    // Fallback: show in a prompt
                    prompt('Copy this recommendation:', shareData);
                });
            }
        });
    }

    // Feature 7: Tag handlers
    const addTagBtn = document.getElementById('add-tag-btn');
    if (addTagBtn) {
        addTagBtn.addEventListener('click', () => {
            const input = document.getElementById('tag-input');
            const tag = input.value.trim();
            if (tag) {
                if (movie.addTag(tag)) {
                    state.currentUser.saveToStorage();
                    showMovieDetail(movie, true);
                    showToast(`Tag "${tag}" added!`, 'success');
                } else {
                    showToast('Tag already exists or is invalid.', 'warning');
                }
            }
        });
    }

    // Tag remove buttons
    document.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            movie.removeTag(btn.dataset.tag);
            state.currentUser.saveToStorage();
            showMovieDetail(movie, true);
            showToast(`Tag removed.`, 'info');
        });
    });

    // Feature 11: Mood buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            try {
                movie.setMood(btn.dataset.mood);
                state.currentUser.saveToStorage();
                showMovieDetail(movie, true);
                checkAchievements();
                showToast(`Mood set to ${btn.dataset.mood}!`, 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    });
}

// ===== STAR RATING HELPERS =====
function highlightStars(count) {
    const stars = document.querySelectorAll('#star-input span');
    stars.forEach((star, i) => {
        star.textContent = i < count ? '★' : '☆';
        star.classList.toggle('active', i < count);
    });
}

function updateStarDisplay() {
    highlightStars(state.selectedRating);
}

// ===== REVIEW SUBMISSION =====
function handleSubmitReview(imdbID) {
    const text = document.getElementById('review-text').value.trim();

    if (!text) {
        showToast('Please write your review before submitting.', 'warning');
        return;
    }
    if (state.selectedRating === 0) {
        showToast('Please select a star rating.', 'warning');
        return;
    }

    const movie = state.currentUser.getMovie(imdbID);
    if (!movie) return;

    try {
        const review = new Review(imdbID, state.currentUser.name, text, state.selectedRating);
        movie.addReview(review);
        state.currentUser.saveToStorage();

        // Emit event
        appEvents.emit('review:submitted', { movie, review });

        // Refresh the modal to show the new review
        showMovieDetail(movie, true);
        renderCollection();
        updateStats();
        checkAchievements();
        showToast('Review submitted! ⭐', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ===== FEATURE 2: SORT HANDLING =====
function handleSort(sortBy) {
    state.currentSort = sortBy;
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === sortBy);
    });
    renderCollection();
}

// ===== FILTER HANDLING =====
function handleFilter(genre) {
    state.currentFilter = genre;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === genre);
    });
    if (state.currentTab === 'collection') {
        renderCollection();
    }
}

// ===== FEATURE 3: RANDOM PICK =====
function handleRandomPick() {
    if (!state.currentUser) return;
    const movie = state.currentUser.getRandomMovie();
    if (!movie) {
        showToast('Your collection is empty! Add some movies first.', 'warning');
        return;
    }

    // Show with a fun animation class
    showMovieDetail(movie, true);
    showToast(`🎲 Random pick: "${movie.title}"!`, 'info');
}

// ===== FEATURE 16: IMPORT / EXPORT =====
function handleExport() {
    if (!state.currentUser) return;
    const data = state.currentUser.exportCollection();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movie-library-${state.currentUser.name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Collection exported! 💾', 'success');
}

function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = state.currentUser.importCollection(event.target.result);
            if (result.success) {
                renderCollection();
                updateStats();
                checkAchievements();
                showToast(result.message, 'success');
            } else {
                showToast(result.message, 'error');
            }
        };
        reader.readAsText(file);
    });
    input.click();
}

// ===== FEATURE 15: EVENT EMITTER WIRING =====
function setupEventListeners() {
    // Decoupled: When a movie is added, check achievements
    appEvents.on('movie:added', () => {
        checkAchievements();
    });

    appEvents.on('movie:removed', () => {
        checkAchievements();
    });

    appEvents.on('review:submitted', () => {
        checkAchievements();
    });

    appEvents.on('achievement:unlocked', (achievement) => {
        console.log(`🏆 Achievement unlocked: ${achievement.title}`);
    });
}

// ===== EVENT LISTENERS (runs once when the page loads) =====
function initApp() {
    // Initialize toast system
    ToastManager.init();

    // Setup EventEmitter listeners
    setupEventListeners();

    // Auth tab switching
    document.getElementById('login-tab').addEventListener('click', () => {
        document.getElementById('login-tab').classList.add('active');
        document.getElementById('signup-tab').classList.remove('active');
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('reset-form').classList.add('hidden');
    });

    document.getElementById('signup-tab').addEventListener('click', () => {
        document.getElementById('signup-tab').classList.add('active');
        document.getElementById('login-tab').classList.remove('active');
        document.getElementById('signup-form').classList.remove('hidden');
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('reset-form').classList.add('hidden');
    });

    // Auth form submissions
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('signup-form').addEventListener('submit', handleSignup);

    // Password visibility toggle (login)
    const loginPasswordInput = document.getElementById('login-password');
    const loginPasswordToggle = document.getElementById('login-password-toggle');
    if (loginPasswordToggle) {
        loginPasswordToggle.addEventListener('click', () => {
            togglePasswordVisibility(loginPasswordInput, loginPasswordToggle);
        });
    }

    // Forgot password / reset
    document.getElementById('forgot-password-link').addEventListener('click', showForgotPassword);
    document.getElementById('back-to-login-link').addEventListener('click', backToLogin);
    document.getElementById('reset-submit-btn').addEventListener('click', handleResetSubmit);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Search
    document.getElementById('search-btn').addEventListener('click', handleSearch);
    document.getElementById('search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('close-search-btn').addEventListener('click', closeSearch);

    // Feature 9: Advanced search toggle
    const advToggle = document.getElementById('advanced-search-toggle');
    if (advToggle) advToggle.addEventListener('click', toggleAdvancedSearch);

    // Genre filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFilter(btn.dataset.filter));
    });

    // Feature 2: Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => handleSort(btn.dataset.sort));
    });

    // Feature 6: Tab switching (Collection / Watchlist)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Feature 1: Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Feature 3: Random pick
    const randomBtn = document.getElementById('random-pick-btn');
    if (randomBtn) randomBtn.addEventListener('click', handleRandomPick);

    // Feature 5: Stats dashboard
    const statsBtn = document.getElementById('stats-btn');
    if (statsBtn) statsBtn.addEventListener('click', showStatsDashboard);

    // Feature 10: Achievements
    const achieveBtn = document.getElementById('achievements-btn');
    if (achieveBtn) achieveBtn.addEventListener('click', showAchievements);

    // Feature 12: Timeline
    const timelineBtn = document.getElementById('timeline-btn');
    if (timelineBtn) timelineBtn.addEventListener('click', showTimeline);

    // Feature 13: Recommendations
    const recsBtn = document.getElementById('recommendations-btn');
    if (recsBtn) recsBtn.addEventListener('click', showRecommendations);

    // Feature 14: Quiz
    const quizBtn = document.getElementById('quiz-btn');
    if (quizBtn) quizBtn.addEventListener('click', startQuiz);

    // Account security
    const securityBtn = document.getElementById('security-settings-btn');
    if (securityBtn) securityBtn.addEventListener('click', showSecuritySettings);

    // Feature 16: Import / Export
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', handleExport);
    const importBtn = document.getElementById('import-btn');
    if (importBtn) importBtn.addEventListener('click', handleImport);

    // Modal close
    document.getElementById('modal-close-btn').addEventListener('click', hideModal);
    document.getElementById('modal-overlay').addEventListener('click', hideModal);

    // Check if user is already logged in (session persistence + Remember Me)
    const existingUser = User.getCurrentUser();
    const rememberMe = localStorage.getItem('movieLibraryRememberMe') === 'true';
    if (existingUser && rememberMe) {
        state.currentUser = existingUser;
        showDashboard();
        showToast(`Welcome back, ${state.currentUser.name}! (auto-login)`, 'success');
    } else if (existingUser) {
        // User was logged in but didn't check "Remember Me" — still show dashboard
        // (session persists until logout, regardless of remember me)
        state.currentUser = existingUser;
        showDashboard();
    }

    // Build ML user profile on startup if user has movies
    // Uses Python backend if available, falls back to JS
    if (state.currentUser && state.currentUser.collection.length >= 2) {
        recommender.buildUserProfile(state.currentUser.collection)
            .then(() => console.log('🧠 ML profile ready'))
            .catch(e => console.warn('ML profile build failed:', e));
    }
}

// Start the app
initApp();