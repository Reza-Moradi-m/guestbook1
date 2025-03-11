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

function updateUserStatus() {
  const userStatus = document.getElementById("user-status");

  if (!userStatus) {
    console.warn("User status element not found in the DOM.");
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const userDoc = await db.collection("users").doc(user.uid).get();
      const userData = userDoc.data();

      if (!userData.username) {
        userStatus.innerHTML = `
          <span>Please <a href="set-username.html">set your username</a></span>
          <button id="logout-button" style="margin-left: 10px;">Log Out</button>
        `;
      } else {
        userStatus.innerHTML = `
          <span>Signed in as <a href="profile.html">${userData.username}</a></span>
          <button id="logout-button" style="margin-left: 10px;">Log Out</button>
        `;
      }

      const logoutButton = document.getElementById("logout-button");
      logoutButton?.addEventListener("click", async () => {
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

// Ensure session persistence across pages
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    console.error("Error setting persistence:", error.message);
  });

// Initialize user status for every page
updateUserStatus();


