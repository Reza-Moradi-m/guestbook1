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

  // Initialize User Status
updateUserStatus();
