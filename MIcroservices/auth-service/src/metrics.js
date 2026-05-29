const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// NEW — login counter for brute force detection
const loginAttempts = new client.Counter({
  name: 'auth_login_attempts_total',
  help: 'Nombre de tentatives de login',
  labelNames: ['status', 'reason'],
  registers: [register]
});

module.exports = { register, httpRequestDuration, loginAttempts };
