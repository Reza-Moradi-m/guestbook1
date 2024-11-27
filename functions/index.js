// Import function triggers from their respective submodules:
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Example cloud function
exports.helloWorld = onRequest((request, response) => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// Example of another potential function:
// exports.helloWorld = onRequest((request, response) => {
//     logger.info("Hello logs!", { structuredData: true });
//     response.send("Hello from Firebase!");
// });
