// Attach Firestore and Storage to `window`
window.db = firebase.firestore();
window.storage = firebase.storage();

// Parse the postId from the URL
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("postId");

if (!postId) {
  alert("No post found. Redirecting to guestbook.");
  window.location.href = "guestbook.html";
}

// Function to fetch and display post details
(async () => {
  try {
    // Fetch post data
    const postDoc = await window.db.collection("guestbook").doc(postId).get();
    if (!postDoc.exists) {
      alert("Post not found. Redirecting to guestbook.");
      window.location.href = "guestbook.html";
      return;
    }

    const postData = postDoc.data();

    // Display post details
    document.getElementById("post-message").innerHTML = `
      <strong>Message:</strong> ${postData.message}
    `;

    // Link the author's name and username to their profile
    document.getElementById("post-author").innerHTML = `
      <strong>Posted by:</strong> 
      <a href="userProfile.html?userId=${postData.userId}" class="user-link">
        ${postData.name || "Unknown"} (${postData.username || "NoUsername"})
      </a>
    `;

    // Display the timestamp
    document.getElementById("post-timestamp").innerText = `
      Posted on: ${new Date(postData.timestamp.seconds * 1000).toLocaleString()}
    `;

    // Display post media
    if (postData.fileURL) {
      const postMedia = document.getElementById("post-media");
      postMedia.src = postData.fileURL;
      postMedia.style.display = "block";
    }

    // Fetch and display the author's profile picture
    const userDoc = await window.db.collection("users").doc(postData.userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const profilePicture = userData.profilePicture || "images/default-avatar.png";
      const profilePictureElement = document.createElement("img");
      profilePictureElement.src = profilePicture;
      profilePictureElement.alt = "Profile Picture";
      profilePictureElement.style.width = "50px";
      profilePictureElement.style.height = "50px";
      profilePictureElement.style.borderRadius = "50%";

      document.getElementById("post-details").prepend(profilePictureElement);
    }

    // Add interaction buttons (like, comment, share)
    const interactionDiv = document.createElement("div");
    interactionDiv.classList.add("interaction-buttons");

    // Like Button
    const likeButton = document.createElement("button");
    likeButton.classList.add("like-button");
    likeButton.textContent = "⭐ Loading...";
    let liked = false;

    const userId = firebase.auth().currentUser?.uid;
    const likesRef = window.db.collection("guestbook").doc(postId).collection("likes");

    async function updateLikes() {
      if (!userId) {
        alert("You need to log in to like this post!");
        return;
      }

      try {
        if (liked) {
          await likesRef.doc(userId).delete();
          liked = false;
        } else {
          await likesRef.doc(userId).set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
          liked = true;
        }
        renderLikeButton();
      } catch (error) {
        console.error("Error updating like:", error);
      }
    }

    async function renderLikeButton() {
      const likeCount = (await likesRef.get()).size;
      likeButton.textContent = liked ? `⭐ ${likeCount}` : `☆ ${likeCount}`;
    }

    if (userId) {
      const likeDoc = await likesRef.doc(userId).get();
      liked = likeDoc.exists;
    }
    likeButton.addEventListener("click", updateLikes);
    renderLikeButton();

    // Comment Button
    const commentButton = document.createElement("button");
    commentButton.textContent = "💬 Comment";

    const commentSection = document.createElement("div");
    commentSection.classList.add("comment-section");
    commentSection.style.display = "none";

    commentButton.addEventListener("click", () => {
      commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
    });

    // Add Comment Form
    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.placeholder = "Write a comment...";
    const commentSubmit = document.createElement("button");
    commentSubmit.textContent = "Submit";

    commentSubmit.addEventListener("click", async () => {
      const commentText = commentInput.value.trim();
      if (!commentText || !userId) return;

      const userDoc = await window.db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      await window.db.collection("guestbook").doc(postId).collection("comments").add({
        author: userData.name,
        username: userData.username,
        message: commentText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      commentInput.value = "";
      displayComments();
    });

    commentSection.appendChild(commentInput);
    commentSection.appendChild(commentSubmit);

    // Display Comments
    const commentsContainer = document.createElement("div");
    commentsContainer.id = "comments-container";

    async function displayComments() {
      commentsContainer.innerHTML = "";
      const commentsSnapshot = await window.db
        .collection("guestbook")
        .doc(postId)
        .collection("comments")
        .orderBy("timestamp", "asc")
        .get();

      commentsSnapshot.forEach((doc) => {
        const comment = doc.data();
        const commentDiv = document.createElement("div");
        commentDiv.innerHTML = `
          <p><strong>${comment.author} (${comment.username}):</strong> ${comment.message}</p>
        `;
        commentsContainer.appendChild(commentDiv);
      });
    }

    await displayComments();
    commentSection.appendChild(commentsContainer);

    // Share Button
    const shareButton = document.createElement("button");
    shareButton.textContent = "🔗 Share";
    shareButton.addEventListener("click", async () => {
      const postUrl = `${window.location.origin}/post.html?postId=${postId}`;
      await navigator.clipboard.writeText(postUrl);
      alert("Post URL copied to clipboard!");
    });

    interactionDiv.appendChild(likeButton);
    interactionDiv.appendChild(commentButton);
    interactionDiv.appendChild(shareButton);

    document.getElementById("post-details").appendChild(interactionDiv);
    document.getElementById("post-details").appendChild(commentSection);
  } catch (error) {
    console.error("Error fetching post data:", error);
    alert("Failed to load the post.");
  }
})();