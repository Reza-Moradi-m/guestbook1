const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");

if (!userId) {
  alert("No user specified!");
  window.location.href = "index.html";
}

const entryPreviewDiv = document.getElementById("entry-preview");

// Load User Profile Information
async function loadUserProfile() {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      alert("User profile not found.");
      return;
    }

    // Add user profile details
    const profileContainer = document.createElement("div");
    profileContainer.classList.add("profile-container");
    profileContainer.innerHTML = `
      <img src="${userData.profilePicture || 'images/default-avatar.png'}" 
           alt="Profile Picture" id="profile-picture" class="profile-image">
      <h2>${userData.name || "No Name"}</h2>
      <p>Username: ${userData.username || "No Username"}</p>
    `;
    document.body.prepend(profileContainer);

    // Fetch and display user posts
    displayUserPosts();
  } catch (error) {
    console.error("Error loading user profile:", error);
  }
}

// Fetch and Display User Posts with Full Interactions
async function displayUserPosts() {
  try {
    const querySnapshot = await db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    entryPreviewDiv.innerHTML = ""; // Clear existing posts

    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      const postId = doc.id;

      // Create Post Container
      const entryDiv = document.createElement("div");
      entryDiv.classList.add("entry");

      const messageElement = document.createElement("p");
      messageElement.textContent = data.message || "No message available.";

      const timestampElement = document.createElement("p");
      const timestamp = new Date(data.timestamp.seconds * 1000);
      timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

      // Media Handling
      let mediaElement = null;
      if (data.fileURL) {
        if (data.fileURL.endsWith(".jpg") || data.fileURL.endsWith(".png")) {
          mediaElement = document.createElement("img");
          mediaElement.src = data.fileURL;
          mediaElement.classList.add("entry-media");
        } else if (data.fileURL.endsWith(".mp4")) {
          mediaElement = document.createElement("video");
          mediaElement.controls = true;
          mediaElement.classList.add("entry-media");

          const sourceElement = document.createElement("source");
          sourceElement.src = data.fileURL;
          sourceElement.type = "video/mp4";
          mediaElement.appendChild(sourceElement);
        }
      }

      // Interaction Buttons (Like, Comment, Share)
      const interactionDiv = document.createElement("div");
      interactionDiv.classList.add("interaction-buttons");

      // Like Button
      const likeButton = document.createElement("button");
      likeButton.classList.add("like-button");
      const likesRef = db.collection("guestbook").doc(postId).collection("likes");
      let liked = false;

      async function renderLikeButton() {
        const snapshot = await likesRef.get();
        likeButton.textContent = `⭐ ${snapshot.size} Likes`;
      }

      likeButton.addEventListener("click", async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          alert("Please sign in to like posts!");
          return;
        }
        const userLikeRef = likesRef.doc(currentUser.uid);
        const userLikeSnapshot = await userLikeRef.get();
        if (userLikeSnapshot.exists) {
          await userLikeRef.delete();
          liked = false;
        } else {
          await userLikeRef.set({
            likedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          liked = true;
        }
        renderLikeButton();
      });
      renderLikeButton();

      // Comment Section
      const commentButton = document.createElement("button");
      commentButton.textContent = "💬 Comment";
      const commentSection = document.createElement("div");
      commentSection.classList.add("comment-section");
      commentSection.style.display = "none";

      commentButton.addEventListener("click", () => {
        commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
        displayComments();
      });

      const commentInput = document.createElement("input");
      commentInput.placeholder = "Write a comment...";
      const commentSubmit = document.createElement("button");
      commentSubmit.textContent = "Submit";

      commentSubmit.addEventListener("click", async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          alert("Please sign in to comment.");
          return;
        }

        if (commentInput.value.trim()) {
          await db.collection("guestbook").doc(postId).collection("comments").add({
            message: commentInput.value.trim(),
            userId: currentUser.uid,
            author: currentUser.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });
          commentInput.value = "";
          displayComments();
        }
      });

      commentSection.appendChild(commentInput);
      commentSection.appendChild(commentSubmit);

      async function displayComments() {
        commentSection.innerHTML = "";
        const commentsSnapshot = await db
          .collection("guestbook")
          .doc(postId)
          .collection("comments")
          .orderBy("timestamp", "asc")
          .get();

        commentsSnapshot.forEach((commentDoc) => {
          const commentData = commentDoc.data();
          const commentDiv = document.createElement("div");
          commentDiv.classList.add("comment");
          commentDiv.textContent = `${commentData.author}: ${commentData.message}`;
          commentSection.appendChild(commentDiv);
        });
      }

      // Share Button
      const shareButton = document.createElement("button");
      shareButton.textContent = "🔗 Share";
      shareButton.addEventListener("click", async () => {
        await navigator.clipboard.writeText(`${window.location.origin}#post-${postId}`);
        alert("Post link copied to clipboard!");
      });

      interactionDiv.appendChild(likeButton);
      interactionDiv.appendChild(commentButton);
      interactionDiv.appendChild(shareButton);

      entryDiv.appendChild(messageElement);
      entryDiv.appendChild(timestampElement);
      if (mediaElement) entryDiv.appendChild(mediaElement);
      entryDiv.appendChild(interactionDiv);
      entryDiv.appendChild(commentSection);

      entryPreviewDiv.appendChild(entryDiv);
    });
  } catch (error) {
    console.error("Error displaying user posts:", error);
  }
}

// Call functions to load profile and posts
loadUserProfile();