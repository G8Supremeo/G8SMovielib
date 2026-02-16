// ===== EVENT EMITTER CLASS =====
// A custom publish/subscribe (pub/sub) system.
// Instead of tightly coupling functions (calling renderCollection() directly),
// we fire events like 'movie:added' and let any listener respond.
// This is the OBSERVER PATTERN — a real-world design pattern used in Node.js, React, and more.

class EventEmitter {
    constructor() {
        // Private map of event names → arrays of callback functions
        this._events = {};
    }

    // Register a callback for a specific event
    on(eventName, callback) {
        if (!this._events[eventName]) {
            this._events[eventName] = [];
        }
        this._events[eventName].push(callback);
        return this; // Allow chaining: emitter.on('a', fn).on('b', fn)
    }

    // Register a callback that fires ONLY ONCE, then auto-removes itself
    once(eventName, callback) {
        const wrapper = (...args) => {
            callback(...args);
            this.off(eventName, wrapper);
        };
        return this.on(eventName, wrapper);
    }

    // Remove a specific callback from an event
    off(eventName, callback) {
        if (!this._events[eventName]) return this;
        this._events[eventName] = this._events[eventName].filter(cb => cb !== callback);
        return this;
    }

    // Fire an event — calls ALL registered callbacks with the provided data
    emit(eventName, data) {
        if (!this._events[eventName]) return false;
        this._events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for "${eventName}":`, error);
            }
        });
        return true;
    }

    // Get all registered event names (useful for debugging)
    eventNames() {
        return Object.keys(this._events);
    }

    // Get the number of listeners for a specific event
    listenerCount(eventName) {
        return this._events[eventName] ? this._events[eventName].length : 0;
    }
}

// Create a SINGLE global event bus that the entire app shares
const appEvents = new EventEmitter();
