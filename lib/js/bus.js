const listeners = {};

const bus = {
    emit: function(event,message) {
        if (listeners[event]) {
            listeners[event].forEach(function(listener) {
                if (message) {
                    listener(message);
                } else {
                    listener();
                }
            });
        }
    },
    on: function(event,listener) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(listener);
    }
}

module.exports = bus;
