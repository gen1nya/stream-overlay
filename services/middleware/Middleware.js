class Middleware {
    processMessage(message) {
        throw new Error('processMessage not implemented');
    }
}

module.exports = Middleware;