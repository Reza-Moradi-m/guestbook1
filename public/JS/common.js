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
  
  // Update User Status on Navbar
  auth.onAuthStateChanged((user) => {
    const userStatus = document.getElementById("user-status");
    const logoutButton = document.getElementById("logout-button");
  
    if (user) {
      userStatus.innerHTML = `<span>Signed in as <a href="profile.html">${user.displayName || user.email}</a></span>`;
      if (logoutButton) logoutButton.style.display = "block";
    } else {
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
      if (logoutButton) logoutButton.style.display = "none";
    }
  });
  
  // Logout Functionality
  document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("logout-button");
  
    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        try {
          await auth.signOut();
          alert("Logged out.");
        } catch (error) {
          alert(error.message);
        }
      });
    }
  });
  
