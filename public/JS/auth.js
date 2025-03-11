

// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

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

// Google Sign-In
const googleSignInButton = document.getElementById("google-sign-in");
googleSignInButton.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // Check if the user already exists in Firestore
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (!userDoc.exists) {
      // Create a new user in Firestore without a username initially
      await db.collection("users").doc(user.uid).set({
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      // Redirect to set username page
      window.location.href = "set-username.html";
    } else {
      // Check if username is set
      const userData = userDoc.data();
      if (!userData.username) {
        // Redirect to set username page
        window.location.href = "set-username.html";
      } else {
        alert(`Welcome, ${userData.username}!`);
        updateUserStatus();
      }
    }
  } catch (error) {
    console.error("Error signing in with Google:", error.message);
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

      // Add logout button functionality dynamically
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
    } else {
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
    }
  });
}

// Ensure session persistence is set to "local" Ensures users stay logged in across page reloads and navigation between pages.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Initialize User Status
updateUserStatus();
