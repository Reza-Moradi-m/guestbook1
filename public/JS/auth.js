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
  const firstName = document.getElementById("signup-firstname").value;
  const lastName = document.getElementById("signup-lastname").value;
  const username = document.getElementById("signup-username").value;

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update user profile
    await user.updateProfile({
      displayName: `${firstName} ${lastName}`,
    });

    // Save additional user info in Firestore
    await firebase.firestore().collection("users").doc(user.uid).set({
      firstName,
      lastName,
      username,
      email,
    });

    // Send email verification
    await user.sendEmailVerification();
    alert("Account created successfully! Please verify your email to log in.");

    // Clear input fields
    signupForm.reset();
    updateUserStatus();
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
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      alert("Please verify your email before logging in.");
      return;
    }

    alert(`Welcome back, ${user.displayName || user.email}!`);
    loginForm.reset();
    updateUserStatus();
  } catch (error) {
    console.error("Error logging in:", error.message);
    alert(error.message);
  }
});

// Logout
const logoutButton = document.getElementById("logout-button");
logoutButton.addEventListener("click", async () => {
  try {
    await firebase.auth().signOut();
    alert("Logged out successfully.");
    updateUserStatus();
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert(error.message);
  }
});

// Update user status placeholder across pages
function updateUserStatus() {
  const userStatus = document.getElementById("user-status");

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      userStatus.innerHTML = `<span>Signed in as <a href="profile.html">${user.displayName || user.email}</a></span> | <button id="logout-button">Log Out</button>`;
    } else {
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
    }
  });
}

// Initialize user status
updateUserStatus();