// ===== ACHIEVEMENT / BADGE SYSTEM =====
// Unlockable achievements that reward users for milestones.
// Demonstrates: static data, observer pattern integration, encapsulation,
// and computed state (checking conditions against user data).

class Achievement {
    #unlocked;
    #unlockedDate;

    constructor(id, title, description, icon, condition) {
        this.id = id;                    // Unique identifier
        this.title = title;              // Display name
        this.description = description;  // What you need to do
        this.icon = icon;                // Emoji icon
        this.condition = condition;      // Function that checks if achieved
        this.#unlocked = false;
        this.#unlockedDate = null;
    }

    get unlocked() {
        return this.#unlocked;
    }

    get unlockedDate() {
        return this.#unlockedDate;
    }

    // Check if the achievement should be unlocked based on user data
    check(user) {
        if (this.#unlocked) return false; // Already unlocked
        if (this.condition(user)) {
            this.#unlocked = true;
            this.#unlockedDate = new Date().toISOString();
            return true; // Newly unlocked!
        }
        return false;
    }

    // Force unlock (for loading from saved data)
    forceUnlock(date) {
        this.#unlocked = true;
        this.#unlockedDate = date;
    }

    // Convert to JSON for saving
    toJSON() {
        return {
            id: this.id,
            unlocked: this.#unlocked,
            unlockedDate: this.#unlockedDate
        };
    }

    // Display HTML for the achievement badge
    display() {
        return `
            <div class="achievement-badge ${this.#unlocked ? 'unlocked' : 'locked'}">
                <span class="achievement-icon">${this.icon}</span>
                <div class="achievement-info">
                    <span class="achievement-title">${this.title}</span>
                    <span class="achievement-desc">${this.description}</span>
                </div>
                ${this.#unlocked
                ? `<span class="achievement-date">🔓 ${new Date(this.#unlockedDate).toLocaleDateString()}</span>`
                : '<span class="achievement-locked">🔒</span>'}
            </div>
        `;
    }
}

// ===== ACHIEVEMENT DEFINITIONS =====
// All possible achievements in the app
const ACHIEVEMENTS = [
    new Achievement('first_movie', 'First Steps', 'Add your first movie', '🎬',
        (user) => user.collection.length >= 1),
    new Achievement('five_movies', 'Getting Started', 'Collect 5 movies', '📚',
        (user) => user.collection.length >= 5),
    new Achievement('ten_movies', 'Movie Buff', 'Collect 10 movies', '🎞️',
        (user) => user.collection.length >= 10),
    new Achievement('twenty_movies', 'Cinephile', 'Collect 20 movies', '🏆',
        (user) => user.collection.length >= 20),
    new Achievement('first_review', 'Critic Debut', 'Write your first review', '✍️',
        (user) => user.collection.some(m => m.reviews.length > 0)),
    new Achievement('five_reviews', 'Seasoned Critic', 'Write 5 reviews', '📝',
        (user) => user.collection.reduce((sum, m) => sum + m.reviews.length, 0) >= 5),
    new Achievement('ten_reviews', 'Movie Critic', 'Write 10 reviews', '🎖️',
        (user) => user.collection.reduce((sum, m) => sum + m.reviews.length, 0) >= 10),
    new Achievement('action_fan', 'Action Hero', 'Collect 3 Action movies', '🔥',
        (user) => user.collection.filter(m => m.genre === 'Action').length >= 3),
    new Achievement('comedy_fan', 'Comedy King', 'Collect 3 Comedy movies', '😂',
        (user) => user.collection.filter(m => m.genre === 'Comedy').length >= 3),
    new Achievement('horror_fan', 'Fearless', 'Collect 3 Horror movies', '👻',
        (user) => user.collection.filter(m => m.genre === 'Horror').length >= 3),
    new Achievement('drama_fan', 'Drama Lover', 'Collect 3 Drama movies', '🎭',
        (user) => user.collection.filter(m => m.genre === 'Drama').length >= 3),
    new Achievement('diverse', 'Genre Explorer', 'Have movies in 4+ genres', '🌍',
        (user) => {
            const genres = new Set(user.collection.map(m => m.genre));
            return genres.size >= 4;
        }),
    new Achievement('five_star', 'Perfection', 'Give a movie a 5-star review', '⭐',
        (user) => user.collection.some(m => m.reviews.some(r => r.rating === 5))),
    new Achievement('watchlist_starter', 'Planning Ahead', 'Add a movie to your watchlist', '📋',
        (user) => user.watchlist && user.watchlist.length >= 1),
    new Achievement('mood_tracker', 'Mood Mapper', 'Log your mood for 3 movies', '😊',
        (user) => user.collection.filter(m => m.mood).length >= 3),
];

// ===== ACHIEVEMENT MANAGER =====
// Checks all achievements and tracks which are unlocked
const AchievementManager = {
    achievements: ACHIEVEMENTS,

    // Load saved achievement states  
    loadState(savedAchievements) {
        if (!savedAchievements) return;
        savedAchievements.forEach(saved => {
            const achievement = this.achievements.find(a => a.id === saved.id);
            if (achievement && saved.unlocked) {
                achievement.forceUnlock(saved.unlockedDate);
            }
        });
    },

    // Check all achievements against user data, return newly unlocked ones
    checkAll(user) {
        const newlyUnlocked = [];
        this.achievements.forEach(achievement => {
            if (achievement.check(user)) {
                newlyUnlocked.push(achievement);
            }
        });
        return newlyUnlocked;
    },

    // Get all achievements as JSON for saving
    toJSON() {
        return this.achievements.map(a => a.toJSON());
    },

    // Get display HTML for all achievements
    displayAll() {
        return this.achievements.map(a => a.display()).join('');
    },

    // Get counts
    getProgress() {
        const total = this.achievements.length;
        const unlocked = this.achievements.filter(a => a.unlocked).length;
        return { total, unlocked, percentage: Math.round((unlocked / total) * 100) };
    }
};
