// Check if the user is logged in
auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "auth.html"; // Redirect to login page if not authenticated
      return;
    }
  
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();
  
    // Populate profile details
    document.getElementById("profile-name").textContent = userData.name || "No name set";
    document.getElementById("profile-username").textContent = userData.username || "No username set";
    document.getElementById("profile-email").textContent = userData.email || "No email set";
    const profilePicture = userData.profilePicture || "images/default-avatar.png";
    document.getElementById("profile-picture").src = profilePicture;
  
    // Load user posts
    loadUserPosts(user.uid);
  });
  
  // Edit Profile Button
  document.getElementById("edit-profile-button").addEventListener("click", () => {
    document.getElementById("profile-section").style.display = "none";
    document.getElementById("edit-profile-section").style.display = "block";
  });
  
  // Cancel Edit Button
  document.getElementById("cancel-edit-button").addEventListener("click", () => {
    document.getElementById("edit-profile-section").style.display = "none";
    document.getElementById("profile-section").style.display = "block";
  });
  
  // Save Profile Changes
  document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const name = document.getElementById("edit-name").value.trim();
    const username = document.getElementById("edit-username").value.trim();
    const email = document.getElementById("edit-email").value.trim();
    const password = document.getElementById("edit-password").value.trim();
    const file = document.getElementById("edit-profile-picture").files[0];
  
    try {
      // Update Firestore user data
      const user = auth.currentUser;
      const updates = {};
  
      if (name) updates.name = name;
      if (username) updates.username = username;
      if (email) {
        await user.updateEmail(email);
        updates.email = email;
      }
      if (password) await user.updatePassword(password);
  
      if (file) {
        const storageRef = firebase.storage().ref(`profilePictures/${user.uid}`);
        const snapshot = await storageRef.put(file);
        updates.profilePicture = await snapshot.ref.getDownloadURL();
      }
  
      await db.collection("users").doc(user.uid).update(updates);
      alert("Profile updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error.message);
      alert("Failed to update profile.");
    }
  });
  
  // Load User Posts
  async function loadUserPosts(userId) {
    const postsContainer = document.getElementById("posts-container");
    postsContainer.innerHTML = "";
  
    const querySnapshot = await db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();
  
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const postElement = document.createElement("div");
      postElement.classList.add("post");
      postElement.innerHTML = `
        <p><strong>${data.message}</strong></p>
        <a href="${data.fileURL}" target="_blank">View Attachment</a>
        <button class="delete-button" data-id="${doc.id}">Delete</button>
    `;

    postsContainer.appendChild(postElement);
  });

  setupDeleteButtons();
}

// Setup delete buttons with confirmation popup
function setupDeleteButtons() {
  const deleteButtons = document.querySelectorAll(".delete-button");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const postId = button.getAttribute("data-id");
      showDeletePopup(postId);
    });
  });
}

// Delete confirmation popup logic
function showDeletePopup(postId) {
  const popup = document.getElementById("delete-popup");
  const confirmButton = document.getElementById("confirm-delete");
  const cancelButton = document.getElementById("cancel-delete");

  popup.style.display = "flex";

  confirmButton.onclick = async () => {
    try {
      await db.collection("guestbook").doc(postId).delete();
      alert("Post deleted successfully.");
      popup.style.display = "none";
      loadUserPosts(auth.currentUser.uid);
    } catch (error) {
      console.error("Error deleting post:", error.message);
      alert("Failed to delete post.");
    }
  };

  cancelButton.onclick = () => {
    popup.style.display = "none";
  };
}

  