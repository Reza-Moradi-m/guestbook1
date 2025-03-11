// Firebase configuration (copy from common.js)
const firebaseConfig = {
    apiKey: "AIzaSyDjQvmQKE77NmdCNMjwQ9D8dEtxdo0ZrUc",
    authDomain: "astronomy-guestbook.firebaseapp.com",
    projectId: "astronomy-guestbook",
    storageBucket: "astronomy-guestbook.firebasestorage.app",
    messagingSenderId: "680979689903",
    appId: "1:680979689903:web:b31210872fff1d641b7f5a",
    measurementId: "G-LDFCYT5NGY"
  };
  
  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const db = firebase.firestore();
  const auth = firebase.auth();
  
  // Ensure user is logged in
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      alert("You need to be logged in to set your username.");
      window.location.href = "auth.html";
      return;
    }
  });
  
  // Handle form submission
  const setUsernameForm = document.getElementById("set-username-form");
  setUsernameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
  
    if (!username) {
      alert("Please enter a username.");
      return;
    }
  
    try {
      // Check if username is already taken
      const usernameQuery = await db.collection("users").where("username", "==", username).get();
      if (!usernameQuery.empty) {
        alert("Username already taken. Please choose another.");
        return;
      }
  
      // Update user's document with username
      const user = auth.currentUser;
      await db.collection("users").doc(user.uid).update({
        username: username
      });
  
      alert("Username set successfully!");
      window.location.href = "profile.html"; // Redirect to profile page
    } catch (error) {
      console.error("Error setting username:", error.message);
      alert(error.message);
    }
  });