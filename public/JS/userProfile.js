window.db = firebase.firestore();
window.storage = firebase.storage();

const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");

const entryPreviewDiv = document.getElementById("entry-preview");

if (!userId) {
  alert("No user specified!");
  window.location.href = "index.html";
}

async function loadUserProfile() {
  try {
    // Fetch user details
    const userDoc = await window.db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      entryPreviewDiv.innerHTML = "<p>User not found.</p>";
      return;
    }

    // Display user details
    const header = document.createElement("div");
    header.classList.add("profile-header");
    header.innerHTML = `
      <img src="${userData.profilePicture || "images/default-avatar.png"}" alt="Profile Picture" class="profile-pic">
      <h2>${userData.name || "Unknown"}</h2>
      <p>Username: ${userData.username || "NoUsername"}</p>
    `;
    entryPreviewDiv.appendChild(header);

    // Fetch and display posts
    const postsContainer = document.createElement("div");
    postsContainer.classList.add("posts-container");
    entryPreviewDiv.appendChild(postsContainer);

    const querySnapshot = await window.db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    if (querySnapshot.empty) {
      postsContainer.innerHTML = "<p>No posts found for this user.</p>";
      return;
    }

    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      const postId = doc.id;

      const postDiv = document.createElement("div");
      postDiv.classList.add("entry");
      postDiv.id = `post-${postId}`;

      const nameElement = document.createElement("h3");
      nameElement.innerHTML = `<a href="userProfile.html?userId=${data.userId}" class="user-link">
                                ${data.name || "Unknown"} (${data.username || "NoUsername"})
                              </a>`;

      const messageElement = document.createElement("p");
      messageElement.textContent = `Message: ${data.message}`;

      const timestampElement = document.createElement("p");
      const timestamp = new Date(data.timestamp.seconds * 1000);
      timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

      let mediaElement = null;
      if (data.fileURL) {
        mediaElement = determineMediaElement(data.fileURL);
      }

      const interactionDiv = document.createElement("div");
      interactionDiv.classList.add("interaction-buttons");

      // Add interaction buttons
      const likeButton = createLikeButton(postId);
      const commentSection = createCommentSection(postId);
      const shareButton = createShareButton(postId, data);

      interactionDiv.appendChild(likeButton);
      interactionDiv.appendChild(commentSection.button);
      interactionDiv.appendChild(shareButton);

      postDiv.appendChild(nameElement);
      postDiv.appendChild(messageElement);
      postDiv.appendChild(timestampElement);
      if (mediaElement) postDiv.appendChild(mediaElement);
      postDiv.appendChild(interactionDiv);
      postDiv.appendChild(commentSection.section);

      postsContainer.appendChild(postDiv);
    });
  } catch (error) {
    console.error("Error loading user profile:", error);
    entryPreviewDiv.innerHTML = "<p>Failed to load profile and posts.</p>";
  }
}

function determineMediaElement(fileURL) {
  const fileExtension = fileURL.split(".").pop();
  if (["png", "jpg", "jpeg", "gif"].includes(fileExtension)) {
    const img = document.createElement("img");
    img.src = fileURL;
    img.classList.add("post-media");
    return img;
  } else if (["mp4", "webm"].includes(fileExtension)) {
    const video = document.createElement("video");
    video.controls = true;
    video.src = fileURL;
    video.classList.add("post-media");
    return video;
  } else {
    const link = document.createElement("a");
    link.href = fileURL;
    link.target = "_blank";
    link.textContent = "View Attachment";
    return link;
  }
}

// Like Button
function createLikeButton(postId) {
  const likeButton = document.createElement("button");
  likeButton.classList.add("like-button");

  async function renderLikeButton() {
    const likesSnapshot = await window.db
      .collection("guestbook")
      .doc(postId)
      .collection("likes")
      .get();
    likeButton.textContent = `⭐ ${likesSnapshot.size}`;
  }

  likeButton.addEventListener("click", async () => {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert("Sign in to like posts.");
      return;
    }

    const likeDoc = window.db
      .collection("guestbook")
      .doc(postId)
      .collection("likes")
      .doc(user.uid);

    const docSnapshot = await likeDoc.get();
    if (docSnapshot.exists) {
      await likeDoc.delete();
    } else {
      await likeDoc.set({
        likedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
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
      await window.db
        .collection("guestbook")
        .doc(postId)
        .collection("comments")
        .add({
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
    commentSection.style.display =
      commentSection.style.display === "none" ? "block" : "none";
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

// Share Button
function createShareButton(postId, data) {
  const shareButton = document.createElement("button");
  shareButton.textContent = "🔗 Share";

  shareButton.addEventListener("click", async () => {
    const postUrl = `${window.location.origin}/index.html#post-${postId}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      alert("Post link copied to clipboard!");
    } catch (err) {
      console.error("Error sharing post:", err);
    }
  });

  return shareButton;
}

// On page load
window.onload = loadUserProfile;