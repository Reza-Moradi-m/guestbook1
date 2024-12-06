 // Firebase configuration
 const firebaseConfig = {
  apiKey: "AIzaSyDjQvmQKE77NmdCNMjwQ9D8dEtxdo0ZrUc",
  authDomain: "astronomy-guestbook.firebaseapp.com",
  projectId: "astronomy-guestbook",
  storageBucket: "astronomy-guestbook.firebasestorage.app",
  messagingSenderId: "680979689903",
  appId: "1:680979689903:web:b31210872fff1d641b7f5a",
  measurementId: "G-LDFCYT5NGY"
};

firebase.initializeApp(firebaseConfig);

// Firebase Auth
const auth = firebase.auth();

// Signup Form Submission
const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    alert(`User created: ${userCredential.user.email}`);
  } catch (error) {
    console.error("Error signing up:", error.message);
    alert(error.message);
  }
});

// Login Form Submission
const loginForm = document.getElementById("login-form");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    alert(`Logged in as: ${userCredential.user.email}`);
    document.getElementById("logout-button").style.display = "block";
  } catch (error) {
    console.error("Error logging in:", error.message);
    alert(error.message);
  }
});

// Logout Button
const logoutButton = document.getElementById("logout-button");
logoutButton.addEventListener("click", async () => {
  try {
    await auth.signOut();
    alert("Logged out successfully");
    document.getElementById("logout-button").style.display = "none";
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert(error.message);
  }
});

// Authentication State Listener
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User is logged in:", user.email);
    document.getElementById("logout-button").style.display = "block";
  } else {
    console.log("No user is logged in");
    document.getElementById("logout-button").style.display = "none";
  }
});