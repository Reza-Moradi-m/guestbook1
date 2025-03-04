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

// Initialize Firebase only if it hasn't been initialized already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

// Toggle the hamburger menu
document.addEventListener("DOMContentLoaded", () => {
  const hamburgerMenu = document.getElementById("hamburger-menu");
  const menuList = document.getElementById("menu-list");

  if (!hamburgerMenu || !menuList) {
    console.error("Hamburger menu or menu list not found on this page.");
    return;
  }

  hamburgerMenu.addEventListener("click", () => {
    menuList.classList.toggle("active");
    console.log("Menu toggled:", menuList.classList.contains("active"));
  });
});

// Firebase Auth
const auth = firebase.auth();
const db = firebase.firestore();

// Function to update user status in the navigation bar
function updateUserStatus() {
  const userStatus = document.getElementById("user-status");

  // Check if user-status element exists in the DOM
  if (!userStatus) {
    console.warn("User status element not found in the DOM.");
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Fetch user data from Firestore
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();

      // Display username or email with a logout button
      userStatus.innerHTML = `
        <span>Signed in as <a href="profile.html">${userData?.username || user.email}</a></span>
        <button id="logout-button" style="margin-left: 10px;">Log Out</button>
      `;

      // Add logout button functionality dynamically
      const logoutButton = document.getElementById("logout-button");
      logoutButton?.addEventListener("click", async () => {
        try {
          await auth.signOut();
          alert("Logged out successfully.");
          updateUserStatus(); // Update the status after logging out
        } catch (error) {
          console.error("Error logging out:", error.message);
          alert(error.message);
        }
      });
    } else {
      // Show "Sign In" link if no user is signed in
      userStatus.innerHTML = `<a href="auth.html">Sign In</a>`;
    }
  });
}

// Ensure session persistence across pages
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    console.error("Error setting persistence:", error.message);
  });

// Initialize user status for every page
updateUserStatus();

let deferredPrompt;

document.addEventListener("DOMContentLoaded", () => {
  const installButton = document.getElementById("install-button");

  if (!installButton) {
    console.error("Install button not found in the DOM.");
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.style.display = "block"; // Show the install button when available
  });

  installButton.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        console.log("User installed the app");
      }
      deferredPrompt = null;
      installButton.style.display = "none"; // Hide button after installation
    }
  });
});