const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");

if (!userId) {
    alert("No user specified!");
    window.location.href = "index.html";
}

async function loadUserProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("userId");

    if (!userId) {
        alert("No user specified!");
        window.location.href = "index.html";
        return;
    }
    const profileContainer = document.getElementById("profile-container");
    const postsContainer = document.getElementById("user-posts");

    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
        profileContainer.innerHTML = "<p>User not found.</p>";
        return;
    }

    profileContainer.innerHTML = `
        <img src="${userData.profilePicture || "images/default-avatar.png"}" alt="Profile Picture" class="entry-image">
        <h2>${userData.name}</h2>
        <p>Username: ${userData.username}</p>
    `;

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "auth.html";
            return;
        }
      
        
      
        // Populate profile details
        document.getElementById("profile-name").textContent = userData.name || "No name set";
        document.getElementById("profile-username").textContent = userData.username || "No username set";
        document.getElementById("profile-picture").src = userData.profilePicture || "images/default-avatar.png";
      
        // Attach Firestore and Storage to `window` for global access
        window.db = firebase.firestore();
        window.storage = firebase.storage();
      
      // Reference to the entry preview div
      const entryPreviewDiv = document.getElementById("entry-preview");
      
      // Function to fetch and display the latest entries
      async function displayLatestEntries() {
      try {
        const querySnapshot = await window.db
            .collection("guestbook")
            .where("userId", "==", userId)
            .orderBy("timestamp", "desc")
            .get();
      
        postsContainer.innerHTML = "";// Clear any existing content
      
        querySnapshot.forEach(async (doc) => {
            const data = doc.data();
            const postId = doc.id;
      
            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");
            entryDiv.id = `post-${postId}`; // Add unique ID for each post
      
            // Display clickable username linking to userProfile.html
      const nameElement = document.createElement("h3");
      nameElement.innerHTML = `
      <a href="userProfile.html?userId=${data.userId}" class="user-link">
        ${data.name || "Unknown"} (${data.username || "NoUsername"})
      </a>
      `;
      
            const messageElement = document.createElement("p");
            messageElement.textContent = `Message: ${data.message}`;
      
            const timestampElement = document.createElement("p");
            const timestamp = new Date(data.timestamp.seconds * 1000);
            timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;
      
            // Determine the media type
            let mediaElement = null;
            if (data.fileURL) {
                try {
                    const response = await fetch(data.fileURL, { method: "HEAD" });
                    const contentType = response.headers.get("Content-Type");
      
                    if (contentType.startsWith("image/")) {
                        mediaElement = document.createElement("img");
                        mediaElement.src = data.fileURL;
                        mediaElement.alt = "Uploaded Image";
                        mediaElement.style.display = "block";
                        mediaElement.style.margin = "auto";
                        mediaElement.style.maxWidth = "100%";
                        mediaElement.style.height = "auto";
                    } else if (contentType.startsWith("video/")) {
                        mediaElement = document.createElement("video");
                        mediaElement.controls = true;
                        mediaElement.style.display = "block";
                        mediaElement.style.margin = "auto";
                        mediaElement.style.maxWidth = "100%";
                        mediaElement.style.height = "auto";
      
                        const sourceElement = document.createElement("source");
                        sourceElement.src = data.fileURL;
                        sourceElement.type = contentType;
                        mediaElement.appendChild(sourceElement);
                    } else {
                        mediaElement = document.createElement("a");
                        mediaElement.href = data.fileURL;
                        mediaElement.target = "_blank";
                        mediaElement.textContent = "Download Attachment";
                        mediaElement.classList.add("entry-link");
                    }
                } catch (error) {
                    console.error("Error fetching file metadata:", error);
                }
            }
      
            // Create interaction buttons (like, comment, share)
            const interactionDiv = document.createElement("div");
            interactionDiv.classList.add("interaction-buttons");
      
            // Like button logic
      const likeButton = document.createElement("button");
      likeButton.classList.add("like-button");
      
      const userId = firebase.auth().currentUser?.uid;
      const likesRef = window.db.collection("guestbook").doc(postId).collection("likes").doc(userId);
      let liked = false;
      
      // Check if user already liked the post
      if (userId) {
      const userLikeDoc = await likesRef.get();
      liked = userLikeDoc.exists;
      }
      
      async function updateLikes() {
      if (!userId) {
      alert("You need to log in to like this post!");
      return;
      }
      
      try {
      if (liked) {
      // Remove the like
      await likesRef.delete();
      liked = false;
      } else {
      // Add a like
      await likesRef.set({
        likedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      liked = true;
      }
      renderLikeButton();
      } catch (error) {
      console.error("Error updating like:", error);
      alert("Failed to update like.");
      }
      }
      
      async function getLikeCount() {
      const snapshot = await window.db.collection("guestbook").doc(postId).collection("likes").get();
      return snapshot.size; // Total number of likes
      }
      
      async function renderLikeButton() {
      const likeCount = await getLikeCount();
      likeButton.innerHTML = `⭐ ${likeCount}`;
      }
      
      likeButton.addEventListener("click", updateLikes);
      renderLikeButton();
      
      
            // Comment button
            const commentButton = document.createElement("button");
            commentButton.classList.add("comment-button");
            commentButton.textContent = "💬 Comment";
      
            // Comment section
            const commentSection = document.createElement("div");
            commentSection.classList.add("comment-section");
            commentSection.style.display = "none";
      
            // Existing comments container
            const existingComments = document.createElement("div");
            existingComments.classList.add("existing-comments");
      
            // Input field for comments
            const commentInput = document.createElement("input");
            commentInput.type = "text";
            commentInput.placeholder = "Write a comment...";
            commentInput.classList.add("comment-input");
      
            // Submit button for comments
            const commentSubmit = document.createElement("button");
            commentSubmit.textContent = "Submit";
            commentSubmit.classList.add("comment-submit");
      
            const cancelCommentButton = document.createElement("button");
            cancelCommentButton.textContent = "Cancel";
            cancelCommentButton.classList.add("cancel-comment-button");
      
            cancelCommentButton.addEventListener("click", () => {
                commentSection.style.display = "none"; // Hide comment box without submitting
                commentInput.value = ""; // Clear the input field
            });
      
            commentSubmit.addEventListener("click", async () => {
                const commentText = commentInput.value.trim();
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert("You must be logged in to comment.");
                    return;
                }
                if (commentText) {
                    const userDoc = await window.db.collection("users").doc(user.uid).get();
                    const userData = userDoc.data();
            
                    await window.db
                        .collection("guestbook")
                        .doc(postId)
                        .collection("comments")
                        .add({
                            author: userData.name || "Unknown",
                            username: userData.username || "NoUsername",
                            message: commentText,
                            parentCommentId: null,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    commentInput.value = ""; // Clear input after submitting
                    displayComments(postId, existingComments);
                }
            });
      
            // Add input and buttons to the comment section
            commentSection.appendChild(existingComments);
            commentSection.appendChild(commentInput);
            commentSection.appendChild(commentSubmit);
            commentSection.appendChild(cancelCommentButton);
      
            // Toggle the comment section on button click
            commentButton.addEventListener("click", () => {
                commentSection.style.display =
                    commentSection.style.display === "none" ? "block" : "none";
                displayComments(postId, existingComments); // Ensure comments are displayed when toggled
            });
      
            displayComments(postId, existingComments); // Display comments
      
            // Share button
            const shareButton = document.createElement("button");
            shareButton.classList.add("share-button");
            shareButton.textContent = "🔗 Share";
      
            shareButton.addEventListener("click", async () => {
                const postUrl = `${window.location.origin}#post-${postId}`;
                if (navigator.share) {
                    navigator.share({
                        title: "Check out this post!",
                        text: `${data.firstName} says: ${data.message}`,
                        url: postUrl,
                    });
                } else {
                    await navigator.clipboard.writeText(postUrl);
                    alert("Post link copied to clipboard!");
                }
            });
      
            interactionDiv.appendChild(likeButton);
            interactionDiv.appendChild(commentButton);
            interactionDiv.appendChild(shareButton);
      
            // Add Delete Button (Only for the post owner)
      if (data.userId === user.uid) { // Check if the current user is the post owner
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "🗑 Delete";
        deleteButton.classList.add("delete-button");
      
        // Delete button functionality
        deleteButton.addEventListener("click", async () => {
            const confirmDelete = confirm("Are you sure you want to delete this post?");
            if (confirmDelete) {
                try {
                    // Delete the post document from Firestore
                    await window.db.collection("guestbook").doc(postId).delete();
      
                    // Remove the post element from the DOM
                    document.getElementById(`post-${postId}`).remove();
      
                    alert("Post deleted successfully.");
                } catch (error) {
                    console.error("Error deleting post:", error);
                    alert("Failed to delete the post. Please try again.");
                }
            }
        });
      
        interactionDiv.appendChild(deleteButton);
      }
      
            entryDiv.appendChild(nameElement);
            entryDiv.appendChild(messageElement);
            entryDiv.appendChild(timestampElement);
            if (mediaElement) entryDiv.appendChild(mediaElement);
      
            entryDiv.appendChild(interactionDiv);
            entryDiv.appendChild(commentSection);
      
            entryPreviewDiv.appendChild(entryDiv);
        });
      } catch (error) {
        console.error("Error fetching latest entries:", error);
      }
      }
      
      // Function to display comments with proper nesting
      async function displayComments(postId, parentElement, parentId = null, indentLevel = 0) {
      if (parentId === null) {
        parentElement.innerHTML = ""; // Clear comments container for top-level comments only
      }
      
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
      commentDiv.style.marginLeft = `${indentLevel * 20}px`;
      commentDiv.innerHTML = `
      <p>
        <strong>
            <a href="userProfile.html?userId=${commentData.userId}" class="user-link">
                ${commentData.author} (${commentData.username})
            </a>
        </strong>: ${commentData.message}
      </p>
      `;
      
        const replyButton = document.createElement("button");
        replyButton.textContent = "Reply";
        replyButton.classList.add("reply-button");
      
        const replySection = document.createElement("div");
        replySection.classList.add("reply-section");
        replySection.style.display = "none";
      
        const replyInput = document.createElement("input");
        replyInput.type = "text";
        replyInput.placeholder = "Write a reply...";
        replyInput.classList.add("reply-input");
      
        const submitReplyButton = document.createElement("button");
        submitReplyButton.textContent = "Submit Reply";
        submitReplyButton.classList.add("submit-reply-button");
      
        const cancelReplyButton = document.createElement("button");
        cancelReplyButton.textContent = "Cancel";
        cancelReplyButton.classList.add("cancel-reply-button");
      
        cancelReplyButton.addEventListener("click", () => {
            replySection.style.display = "none"; // Hide reply section
            replyInput.value = ""; // Clear input
        });
      
        submitReplyButton.addEventListener("click", async () => {
            const replyText = replyInput.value.trim();
            if (replyText) {
                await window.db
                    .collection("guestbook")
                    .doc(postId)
                    .collection("comments")
                    .add({
                        author: "Anonymous User", // Replace with actual user
                        message: replyText,
                        parentCommentId: commentId, // Reply to this comment
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                replyInput.value = ""; // Clear input
                replySection.style.display = "none"; // Hide reply box after submitting
                displayComments(postId, parentElement, commentId, indentLevel + 1); // Refresh replies
            }
        });
      
        replyButton.addEventListener("click", () => {
            replySection.style.display =
                replySection.style.display === "none" ? "block" : "none";
        });
      
        replySection.appendChild(replyInput);
        replySection.appendChild(submitReplyButton);
        replySection.appendChild(cancelReplyButton);
      
        commentDiv.appendChild(replyButton);
        commentDiv.appendChild(replySection);
      
        parentElement.appendChild(commentDiv);
      
        // Fetch replies for this comment
        displayComments(postId, commentDiv, commentId, indentLevel + 1);
      });
      }
      
      // Call the function to display entries
      window.onload = displayLatestEntries;
      
})

loadUserProfile();}