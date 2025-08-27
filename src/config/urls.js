// Frontend URL Configuration for Lymlife
// Use environment variables for different environments

const config = {
  // Production URLs
  production: {
    webBaseUrl: "https://lymlife.com",
    appScheme: "lymlife://",
    apiBaseUrl: "https://api.lymlife.com",
  },

  // Development URLs
  development: {
    webBaseUrl: "http://localhost:3000",
    appScheme: "lymlife://",
    apiBaseUrl: "http://localhost:8000",
  },

  // Staging URLs
  staging: {
    webBaseUrl: "https://staging.lymlife.com",
    appScheme: "lymlife://",
    apiBaseUrl: "https://staging-api.lymlife.com",
  },
};

// Get current environment
const environment = process.env.NODE_ENV || "development";

// Export URLs based on environment
module.exports = {
  // Web URLs
  webBaseUrl: config[environment].webBaseUrl,

  // App Deep Link URLs
  appScheme: config[environment].appScheme,

  // API URLs
  apiBaseUrl: config[environment].apiBaseUrl,

  // Specific endpoint URLs
  getPasswordResetUrl: (token) => {
    return {
      web: `${config[environment].webBaseUrl}/reset-password?token=${token}`,
      app: `${config[environment].appScheme}reset-password?token=${token}`,
      universal: `${
        config[environment].webBaseUrl
      }/deep-link/redirect?type=reset-password&token=${token}&appUrl=${encodeURIComponent(
        `${config[environment].appScheme}reset-password?token=${token}`
      )}`,
    };
  },

  getEmailVerificationUrl: (token) => {
    return {
      web: `${config[environment].webBaseUrl}/verify-email?token=${token}`,
      app: `${config[environment].appScheme}verify-email?token=${token}`,
      universal: `${
        config[environment].webBaseUrl
      }/deep-link/redirect?type=verify-email&token=${token}&appUrl=${encodeURIComponent(
        `${config[environment].appScheme}verify-email?token=${token}`
      )}`,
    };
  },

  getLoginUrl: () => {
    return {
      web: `${config[environment].webBaseUrl}/login`,
      app: `${config[environment].appScheme}login`,
    };
  },

  // Utility function to detect environment
  isProduction: environment === "production",
  isDevelopment: environment === "development",
  isStaging: environment === "staging",

  // Current environment
  environment,
};
