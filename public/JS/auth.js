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
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await user.updateProfile({
      displayName: `${firstName} ${lastName}`,
    });

    await firebase.firestore().collection("users").doc(user.uid).set({
      firstName,
      lastName,
      username,
      email,
    });

    await user.sendEmailVerification();
    alert("Account created successfully! Please verify your email.");
    signupForm.reset();
    updateUserStatus();
  } catch (error) {
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

    if (!user.emailVerified) {
      alert("Please verify your email before logging in.");
      await auth.signOut();
      return;
    }

    alert(`Welcome, ${user.displayName || user.email}`);
    loginForm.reset();
    updateUserStatus();
  } catch (error) {
    alert(error.message);
  }
});

// Logout
const logoutButton = document.getElementById("logout-button");
logoutButton.addEventListener("click", async () => {
  try {
    await auth.signOut();
    alert("Logged out.");
    updateUserStatus();
  } catch (error) {
    alert(error.message);
  }
});

// Update user status across pages
function updateUserStatus() {
  const userStatus = document.getElementById("user-status");
  auth.onAuthStateChanged((user) => {
    if (user) {
      userStatus.innerHTML = `<span>Signed in as <a href="profile.html">${user.displayName || user.email}</a></span>`;
      logoutButton.style.display = "block";
    } else {
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
      logoutButton.style.display = "none";
    }
  });
}

auth.setPersistence(firebase.auth.Auth.Persistence.NONE);

updateUserStatus();