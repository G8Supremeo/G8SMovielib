// ===== TOAST NOTIFICATION SYSTEM =====
// Replaces ugly alert() boxes with sleek, animated toast notifications.
// Uses a SINGLETON-like pattern — only one ToastManager exists.
// Demonstrates: encapsulation, DOM manipulation, CSS animations, and setTimeout.

class Toast {
    // Private fields
    #type;
    #message;
    #duration;
    #element;

    constructor(message, type = 'info', duration = 3000) {
        this.#message = message;
        this.#type = type;           // 'success', 'error', 'warning', 'info'
        this.#duration = duration;
        this.#element = null;
    }

    // Get the icon for each toast type
    #getIcon() {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[this.#type] || icons.info;
    }

    // Create the DOM element for the toast
    render() {
        const el = document.createElement('div');
        el.className = `toast toast-${this.#type}`;
        el.innerHTML = `
            <span class="toast-icon">${this.#getIcon()}</span>
            <span class="toast-message">${this.#message}</span>
        `;
        this.#element = el;
        return el;
    }

    // Animate the toast away and remove from DOM
    dismiss() {
        if (!this.#element) return;
        this.#element.classList.add('toast-exit');
        setTimeout(() => {
            this.#element.remove();
        }, 300); // Wait for exit animation
    }

    get duration() {
        return this.#duration;
    }
}

// ===== TOAST MANAGER (Singleton Module) =====
// Manages the toast container and queues toast display
const ToastManager = {
    _container: null,

    // Initialize the toast container (called once on app start)
    init() {
        if (this._container) return;
        this._container = document.createElement('div');
        this._container.id = 'toast-container';
        this._container.className = 'toast-container';
        document.body.appendChild(this._container);
    },

    // Show a toast notification
    show(message, type = 'info', duration = 3000) {
        this.init(); // Ensure container exists

        const toast = new Toast(message, type, duration);
        const element = toast.render();
        this._container.appendChild(element);

        // Trigger entrance animation
        requestAnimationFrame(() => {
            element.classList.add('toast-enter');
        });

        // Auto-dismiss after duration
        setTimeout(() => toast.dismiss(), toast.duration);

        // Also emit an event so other parts of the app can react
        if (typeof appEvents !== 'undefined') {
            appEvents.emit('toast:shown', { message, type });
        }

        return toast;
    },

    // Convenience methods
    success(message, duration) { return this.show(message, 'success', duration); },
    error(message, duration) { return this.show(message, 'error', duration); },
    warning(message, duration) { return this.show(message, 'warning', duration); },
    info(message, duration) { return this.show(message, 'info', duration); }
};
