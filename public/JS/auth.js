import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "./firebase-config.js";

// Signup Form Submission
const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
    await signOut(auth);
    alert("Logged out successfully");
    document.getElementById("logout-button").style.display = "none";
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert(error.message);
  }
});
