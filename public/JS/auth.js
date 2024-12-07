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



// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Signup Form Submission
const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Prevent form from reloading the page

  const name = document.getElementById("signup-name").value.trim();
  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();

  try {
    // Check if username is already taken
    const usernameQuery = await db.collection("users").where("username", "==", username).get();
    if (!usernameQuery.empty) {
      alert("Username already taken. Please choose another.");
      return;
    }

    // Create user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Send email verification
    await user.sendEmailVerification();
    alert("Account created successfully! Please verify your email before logging in.");

    // Save user data to Firestore
    await db.collection("users").doc(user.uid).set({
      name,
      username,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Clear input fields
    signupForm.reset();
  } catch (error) {
    console.error("Error signing up:", error.message);
    alert(error.message);
  }
});

// Login Form Submission
const loginForm = document.getElementById("login-form");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Prevent form from reloading the page

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Check email verification
    if (!user.emailVerified) {
      alert("Please verify your email before logging in.");
      await auth.signOut();
      return;
    }

    alert(`Welcome, ${user.email}`);
    loginForm.reset();
    updateUserStatus();
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
    alert("Logged out successfully.");
    updateUserStatus();
  } catch (error) {
    console.error("Error logging out:", error.message);
    alert(error.message);
  }
});

// Update User Status Across Pages
function updateUserStatus() {
  const userStatus = document.getElementById("user-status");

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();

      userStatus.innerHTML = `
        <span>Signed in as <a href="profile.html">${userData?.username || user.email}</a></span>
        <button id="logout-button" style="margin-left: 10px;">Log Out</button>
      `;

      // Dynamically add logout functionality
      document.getElementById("logout-button").addEventListener("click", async () => {
        await auth.signOut();
        alert("Logged out successfully.");
        updateUserStatus();
      });
    } else {
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
    }
  });
}

// Ensure session persistence is set to "NONE" to log out on tab close
auth.setPersistence(firebase.auth.Auth.Persistence.NONE);

// Initialize User Status
updateUserStatus();
