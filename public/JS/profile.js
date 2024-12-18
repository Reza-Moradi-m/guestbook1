// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("User authenticated:", user.uid);
    loadUserProfile(user.uid);
  } else {
    console.warn("No user authenticated. Redirecting to login.");
    window.location.href = "login.html";
  }
});

// Load the user profile data
async function loadUserProfile(userId) {
  try {
    const userDoc = await window.db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (userData) {
      document.getElementById("profile-name").textContent = userData.name || "Anonymous User";
      document.getElementById("profile-username").textContent = userData.username || "NoUsername";
      document.getElementById("profile-email").textContent = firebase.auth().currentUser.email || "NoEmail";
      document.getElementById("profile-picture").src = userData.profilePicture || "images/default-avatar.png";
    }

    // Display posts
    displayUserPosts(userId);
  } catch (error) {
    console.error("Error loading user profile:", error);
    document.getElementById("profile-container").innerHTML = "<p>Error loading profile.</p>";
  }
}

// Display posts created by the user
async function displayUserPosts(userId) {
  const postsContainer = document.getElementById("posts-container");

  if (!postsContainer) {
    console.error("Posts container not found.");
    return;
  }

  try {
    const querySnapshot = await window.db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    postsContainer.innerHTML = ""; // Clear previous posts

    if (querySnapshot.empty) {
      postsContainer.innerHTML = "<p>No posts found.</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const postData = doc.data();
      const postId = doc.id;

      // Render post
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <div class="post-header">
          <img src="${postData.profilePicture || 'images/default-avatar.png'}" alt="Profile Picture" class="post-avatar">
          <strong>${postData.name || "Unknown"} (${postData.username || "NoUsername"})</strong>
          <p>${new Date(postData.timestamp.seconds * 1000).toLocaleString()}</p>
        </div>
        <p>${postData.message}</p>
        <div class="post-interactions">
          <button onclick="toggleLikes('${postId}')">⭐ Like</button>
          <button onclick="toggleComments('${postId}', this)">💬 Comment</button>
        </div>
        <div class="comments-container" id="comments-${postId}" style="display:none;"></div>
      `;
      postsContainer.appendChild(postDiv);
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    postsContainer.innerHTML = "<p>Error loading posts.</p>";
  }
}

// Function to display comments for a post
async function toggleComments(postId, button) {
  const commentsContainer = document.getElementById(`comments-${postId}`);
  if (commentsContainer.style.display === "none") {
    commentsContainer.style.display = "block";
    button.textContent = "🔽 Hide Comments";
    await displayComments(postId, commentsContainer);
  } else {
    commentsContainer.style.display = "none";
    button.textContent = "💬 Comment";
  }
}

async function displayComments(postId, parentElement, parentId = null) {
  parentElement.innerHTML = ""; // Clear previous comments
  const commentsRef = window.db
    .collection("guestbook")
    .doc(postId)
    .collection("comments")
    .where("parentCommentId", "==", parentId)
    .orderBy("timestamp", "asc");

  const querySnapshot = await commentsRef.get();

  querySnapshot.forEach((doc) => {
    const commentData = doc.data();
    const commentId = doc.id;

    const commentDiv = document.createElement("div");
    commentDiv.classList.add("comment");
    commentDiv.style.marginLeft = parentId === null ? "20px" : "40px";
    commentDiv.innerHTML = `
      <p>
        <strong>${commentData.author || "Anonymous"} (${commentData.username || "NoUsername"})</strong>: ${commentData.message}
      </p>
      <button onclick="replyToComment('${postId}', '${commentId}', '${commentData.username}')">Reply</button>
      <div id="replies-${commentId}" style="margin-left:20px;"></div>
    `;

    parentElement.appendChild(commentDiv);
    displayComments(postId, document.getElementById(`replies-${commentId}`), commentId); // Recursively load replies
  });
}

function replyToComment(postId, commentId, repliedUsername) {
  const replyText = prompt(`Reply to @${repliedUsername}:`);
  if (replyText) {
    postComment(postId, replyText, commentId, repliedUsername);
  }
}

async function postComment(postId, message, parentCommentId = null, repliedUsername = null) {
  const user = firebase.auth().currentUser;

  if (!user) {
    alert("You must be logged in to comment.");
    return;
  }

  const userDoc = await window.db.collection("users").doc(user.uid).get();
  const userData = userDoc.data();

  try {
    await window.db
      .collection("guestbook")
      .doc(postId)
      .collection("comments")
      .add({
        author: userData.name || "Anonymous",
        username: userData.username || "NoUsername",
        userId: user.uid,
        message: repliedUsername ? `@${repliedUsername} ${message}` : message,
        parentCommentId: parentCommentId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    alert("Comment added!");
  } catch (error) {
    console.error("Error posting comment:", error);
  }
}

// Handle Edit Profile Functionality
document.getElementById("edit-profile-button").addEventListener("click", () => {
  document.getElementById("edit-profile-section").style.display = "block";
});

document.getElementById("cancel-edit-button").addEventListener("click", () => {
  document.getElementById("edit-profile-section").style.display = "none";
});

document.getElementById("save-profile-button").addEventListener("click", async () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const newName = document.getElementById("edit-name").value;
  const newUsername = document.getElementById("edit-username").value;

  try {
    await window.db.collection("users").doc(user.uid).update({
      name: newName,
      username: newUsername,
    });
    alert("Profile updated!");
    window.location.reload();
  } catch (error) {
    console.error("Error saving profile:", error);
  }
});