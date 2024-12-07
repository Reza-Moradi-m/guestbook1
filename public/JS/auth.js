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




// Ensure session persistence is set to "LOCAL" Ensures users stay logged in across page reloads and navigation between pages
auth.setPersistence(firebase.auth.Auth.Persistence.LCOAL);

// Initialize User Status
updateUserStatus();
