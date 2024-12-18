// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

const entryPreviewDiv = document.getElementById("entry-preview");

// DOM elements for editing personal profile
const profileNameInput = document.getElementById("edit-profile-name");
const profileUsernameInput = document.getElementById("edit-profile-username");
const profileEmailInput = document.getElementById("edit-profile-email");
const profilePictureInput = document.getElementById("edit-profile-picture");
const saveProfileButton = document.getElementById("save-profile");

// Function to load user's personal profile
firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  try {
    // Fetch user data
    const userDoc = await window.db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();

    if (!userData) {
      alert("User data not found!");
      return;
    }

    // Display user details
    document.getElementById("profile-name").textContent = userData.name || "No name set";
    document.getElementById("profile-username").textContent = userData.username || "No username set";
    document.getElementById("profile-picture").src = userData.profilePicture || "images/default-avatar.png";

    // Set values for editable inputs
    profileNameInput.value = userData.name || "";
    profileUsernameInput.value = userData.username || "";
    profileEmailInput.value = user.email || "";

    // Load user's posts
    loadUserPosts(user.uid);
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
});

// Save updated profile information
saveProfileButton.addEventListener("click", async () => {
  const user = firebase.auth().currentUser;

  if (!user) {
    alert("No user logged in!");
    return;
  }

  try {
    const updatedData = {
      name: profileNameInput.value.trim(),
      username: profileUsernameInput.value.trim(),
    };

    // Update Firestore user document
    await window.db.collection("users").doc(user.uid).update(updatedData);

    // Update email if changed
    if (profileEmailInput.value !== user.email) {
      await user.updateEmail(profileEmailInput.value);
    }

    // Handle profile picture upload
    if (profilePictureInput.files.length > 0) {
      const file = profilePictureInput.files[0];
      const storageRef = window.storage.ref(`profile-pictures/${user.uid}`);
      await storageRef.put(file);
      const fileURL = await storageRef.getDownloadURL();

      // Update profile picture URL in Firestore
      await window.db.collection("users").doc(user.uid).update({
        profilePicture: fileURL,
      });
    }

    alert("Profile updated successfully!");
    window.location.reload();
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Failed to update profile. Please try again.");
  }
});

// Function to load user's posts with comments, likes, and replies
async function loadUserPosts(userId) {
  try {
    const querySnapshot = await window.db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    entryPreviewDiv.innerHTML = ""; // Clear existing content

    if (querySnapshot.empty) {
      entryPreviewDiv.innerHTML = "<p>No posts found.</p>";
      return;
    }

    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      const postId = doc.id;

      const postDiv = document.createElement("div");
      postDiv.classList.add("entry");
      postDiv.id = `post-${postId}`;

      // Display user details with profile picture
      const nameElement = document.createElement("div");
      nameElement.classList.add("post-user-info");
      nameElement.innerHTML = `
        <div style="display: flex; align-items: center;">
          <img src="${data.profilePicture || "images/default-avatar.png"}"
               alt="Profile Picture"
               style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
          <a href="userProfile.html?userId=${data.userId}" class="user-link">
              ${data.name || "Unknown"} (${data.username || "NoUsername"})
          </a>
        </div>
      `;

      const messageElement = document.createElement("p");
      messageElement.textContent = `Message: ${data.message}`;

      const timestampElement = document.createElement("p");
      const timestamp = new Date(data.timestamp.seconds * 1000);
      timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

      // Create interaction buttons (like, comment, share)
      const interactionDiv = document.createElement("div");
      interactionDiv.classList.add("interaction-buttons");

      const likeButton = createLikeButton(postId);
      const commentSection = createCommentSection(postId);

      interactionDiv.appendChild(likeButton);
      interactionDiv.appendChild(commentSection.button);

      postDiv.appendChild(nameElement);
      postDiv.appendChild(messageElement);
      postDiv.appendChild(timestampElement);
      postDiv.appendChild(interactionDiv);
      postDiv.appendChild(commentSection.section);

      entryPreviewDiv.appendChild(postDiv);
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  }
}

// Like Button
function createLikeButton(postId) {
  const likeButton = document.createElement("button");
  likeButton.textContent = "⭐ Loading...";

  async function renderLikeButton() {
    const likesSnapshot = await window.db.collection("guestbook").doc(postId).collection("likes").get();
    likeButton.textContent = `⭐ ${likesSnapshot.size}`;
  }

  likeButton.addEventListener("click", async () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert("Sign in to like posts.");
      return;
    }

    const likeDoc = window.db.collection("guestbook").doc(postId).collection("likes").doc(user.uid);

    const docSnapshot = await likeDoc.get();
    if (docSnapshot.exists) {
      await likeDoc.delete();
    } else {
      await likeDoc.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    renderLikeButton();
  });

  renderLikeButton();
  return likeButton;
}

// Comment Section
function createCommentSection(postId) {
  const commentButton = document.createElement("button");
  commentButton.textContent = "💬 Comment";

  const commentSection = document.createElement("div");
  commentSection.classList.add("comment-section");
  commentSection.style.display = "none";

  const commentInput = document.createElement("input");
  commentInput.placeholder = "Add a comment...";
  const commentSubmit = document.createElement("button");
  commentSubmit.textContent = "Submit";

  const commentsContainer = document.createElement("div");
  commentsContainer.classList.add("comments-container");

  commentSubmit.addEventListener("click", async () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert("Sign in to comment.");
      return;
    }

    const commentText = commentInput.value.trim();
    if (commentText) {
      await window.db.collection("guestbook").doc(postId).collection("comments").add({
        userId: user.uid,
        message: commentText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });

      commentInput.value = "";
      loadComments(postId, commentsContainer);
    }
  });

  commentSection.appendChild(commentInput);
  commentSection.appendChild(commentSubmit);
  commentSection.appendChild(commentsContainer);

  commentButton.addEventListener("click", () => {
    commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
    loadComments(postId, commentsContainer);
  });

  return { button: commentButton, section: commentSection };
}

async function loadComments(postId, container) {
  container.innerHTML = "";
  const commentsSnapshot = await window.db
    .collection("guestbook")
    .doc(postId)
    .collection("comments")
    .orderBy("timestamp", "asc")
    .get();

  commentsSnapshot.forEach((doc) => {
    const comment = doc.data();
    const commentDiv = document.createElement("div");
    commentDiv.classList.add("comment");
    commentDiv.innerHTML = `
      <strong>${comment.userId}</strong>: ${comment.message} <br>
      <small>${new Date(comment.timestamp.seconds * 1000).toLocaleString()}</small>
    `;
    container.appendChild(commentDiv);
  });
}