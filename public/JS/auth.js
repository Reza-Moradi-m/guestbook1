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

// Firebase Auth and Firestore
const auth = firebase.auth();
const db = firebase.firestore();

// Signup Form Submission
const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const name = document.getElementById("signup-name").value;
  const username = document.getElementById("signup-username").value;

  try {
    // Create user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Send email verification
    await user.sendEmailVerification();
    alert("Account created successfully! Please verify your email before logging in.");

    // Store additional user data in Firestore
    await db.collection("users").doc(user.uid).set({
      name,
      username,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Reset the signup form
    signupForm.reset();
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
    const user = userCredential.user;

    // Check email verification
    if (!user.emailVerified) {
      alert("Please verify your email before logging in.");
      await auth.signOut();
      return;
    }

    alert(`Welcome back, ${user.displayName || user.email}!`);
    loginForm.reset();
    updateUserStatus(); // Update user status
  } catch (error) {
    console.error("Error logging in:", error.message);
    alert(error.message);
  }
});

// Logout
const logoutButton = document.getElementById("logout-button");
logoutButton.addEventListener("click", async () => {
  try {
    await auth.signOut();
    alert("Logged out successfully.");
    updateUserStatus();
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert(error.message);
  }
});

// Update user status dynamically
function updateUserStatus() {
  const userStatus = document.getElementById("user-status");
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Fetch user details from Firestore
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();

      userStatus.innerHTML = `
        Signed in as: <strong>${userData?.name || user.email}</strong>
        <button id="logout-button">Log Out</button>
      `;

      // Bind logout button dynamically
      document.getElementById("logout-button").addEventListener("click", async () => {
        await auth.signOut();
      });
    } else {
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
    }
  });
}

// Set persistence to sign out users when the tab is closed
auth.setPersistence(firebase.auth.Auth.Persistence.NONE);

// Initialize user status
updateUserStatus();
