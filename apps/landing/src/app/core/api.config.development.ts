// Local Landing uses the same running EEMO API as Head, Operator, and Collector.
// Production keeps api.config.ts; do not start a second backend for Landing.
export const API_BASE_URL = 'http://localhost:5117';
// Active LGU cards stay on the LOCAL Head Portal while developing Landing.
export const PORTAL_LOGIN_URL = 'http://localhost:5198/login';
