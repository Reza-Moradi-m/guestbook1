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

// Firebase Auth
const auth = firebase.auth();
const db = firebase.firestore(); // Firestore for saving user data

// Sign-Up Functionality
const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const firstName = document.getElementById("signup-firstname").value;
  const lastName = document.getElementById("signup-lastname").value;
  const username = document.getElementById("signup-username").value;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update user profile
    await user.updateProfile({
      displayName: `${firstName} ${lastName}`,
    });

    // Save user details in Firestore
    await db.collection("users").doc(user.uid).set({
      firstName,
      lastName,
      username,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Send email verification
    await user.sendEmailVerification();
    alert("Account created successfully! Please verify your email before logging in.");

    signupForm.reset();
    updateUserStatus();
  } catch (error) {
    console.error("Error during sign-up:", error.message);
    alert(error.message);
  }
});

// Login Functionality
const loginForm = document.getElementById("login-form");
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      alert("Please verify your email before logging in.");
      await auth.signOut();
      return;
    }

    alert(`Welcome back, ${user.displayName || user.email}!`);
    loginForm.reset();
    updateUserStatus();
  } catch (error) {
    console.error("Error during login:", error.message);
    alert(error.message);
  }
});

// Logout Functionality
const logoutButton = document.getElementById("logout-button");
logoutButton.addEventListener("click", async () => {
  try {
    await auth.signOut();
    alert("Logged out successfully.");
    updateUserStatus();
  } catch (error) {
    console.error("Error during logout:", error.message);
    alert(error.message);
  }
});

// Update User Status Across Pages
function updateUserStatus() {
  const userStatus = document.getElementById("user-status");

  auth.onAuthStateChanged((user) => {
    if (user) {
      userStatus.innerHTML = `
        <span>Signed in as <a href="profile.html">${user.displayName || user.email}</a></span>
        <button id="logout-button" style="margin-left: 10px;">Log Out</button>
      `;

      // Rebind the logout button event
      document.getElementById("logout-button").addEventListener("click", async () => {
        try {
          await auth.signOut();
          alert("Logged out successfully.");
          updateUserStatus();
        } catch (error) {
          console.error("Error during logout:", error.message);
        }
      });
    } else {
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
    }
  });
}

// Automatically Sign Out on Tab Close
window.addEventListener("beforeunload", async () => {
  if (auth.currentUser) {
    await auth.signOut();
  }
});

// Initialize User Status
updateUserStatus();