// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

// DOM Elements
const searchInput = document.getElementById("search-input");
const searchType = document.getElementById("search-type");
const searchButton = document.getElementById("search-button");
const resultsList = document.getElementById("results-list");
const randomPostsContainer = document.getElementById("random-posts-container");

// Event listener for the search button
searchButton.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  const type = searchType.value;

  if (!query) {
    alert("Please enter a search term.");
    return;
  }

  // Clear previous results resultsList.innerHTML = "";
  

  try {
    let results = [];

    if (type === "name") {
      results = await searchByName(query);
    } else if (type === "username") {
      results = await searchByUsername(query);
    } else if (type === "postText") {
      results = await searchByPostText(query);
    }

    displayResults(results, type);
  } catch (error) {
    console.error("Error during search:", error);
    alert("Failed to perform the search. Try again.");
  }
});

// Search by name
async function searchByName(query) {
  const querySnapshot = await db
    .collection("users")
    .where("nameLower", ">=", query.toLowerCase())
    .where("nameLower", "<=", query.toLowerCase() + "\uf8ff")
    .get();
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "user" }));
}

// Search by username
async function searchByUsername(query) {
  const querySnapshot = await db
    .collection("users")
    .where("username", ">=", query.toLowerCase())
    .where("username", "<=", query.toLowerCase() + "\uf8ff")
    .get();
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "user" }));
}

// Search by post text
async function searchByPostText(query) {
  const querySnapshot = await db
    .collection("guestbook")
    .where("message", ">=", query.toLowerCase())
    .where("message", "<=", query.toLowerCase() + "\uf8ff")
    .get();
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "post" }));
}

// Display search results
function displayResults(results, type) {
  if (results.length === 0) {
    resultsList.innerHTML = "<li>No results found.</li>";
    return;
  }

  results.forEach((result) => {
    const listItem = document.createElement("li");
    listItem.classList.add("result-item");

    if (type === "name" || type === "username") {
      listItem.innerHTML = `
        <strong>${result.name}</strong>
        <a href="userProfile.html?userId=${result.id}">View Profile</a>
      `;
    } else if (type === "postText") {
      listItem.innerHTML = `
        <p>${result.message}</p>
        <a href="post.html?postId=${result.id}">View Post</a>
      `;
    }

    resultsList.appendChild(listItem);
  });
}

// Function to fetch and display the latest entries for followed accounts
async function displayLatestEntries() {


  // Fetch all posts from the guestbook collection
  const querySnapshot = await window.db
    .collection("guestbook")
    .orderBy("timestamp", "desc")
    .get();

  const entryPreviewDiv = document.getElementById("random-posts-container");

  entryPreviewDiv.innerHTML = ""; // Clear any existing content

  if (querySnapshot.empty) {
    entryPreviewDiv.innerHTML = "<p>No posts found. Be the first to post something!</p>";
    return;
  }



  querySnapshot.forEach(async (doc) => {
    const data = doc.data();
    const postId = doc.id;

    const entryDiv = document.createElement("div");
    entryDiv.classList.add("entry");
    entryDiv.id = `post-${postId}`; // Add unique ID for each post

    const userDoc = await window.db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();


    // Add profile picture
    const profilePicElement = document.createElement("img");
    profilePicElement.src = userData.profilePicture || "images/default-avatar.png";
    profilePicElement.alt = "Profile Picture";
    profilePicElement.style.width = "40px";
    profilePicElement.style.height = "40px";
    profilePicElement.style.borderRadius = "50%";
    profilePicElement.style.marginRight = "10px";

    // Display clickable username linking to userProfile.html
    const nameElement = document.createElement("h3");
    nameElement.innerHTML = `
  <a href="userProfile.html?userId=${data.userId}" class="user-link">
      ${data.name || "Unknown"} (${data.username || "NoUsername"})
  </a>
`;

    const messageElement = document.createElement("p");
    messageElement.innerHTML = `
            Message: <a href="post.html?postId=${postId}" class="post-link">${data.message}</a>
          `;

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

    entryDiv.appendChild(nameElement);
    entryDiv.appendChild(messageElement);
    entryDiv.appendChild(timestampElement);
    if (mediaElement) entryDiv.appendChild(mediaElement);

    entryDiv.appendChild(interactionDiv);
    entryDiv.appendChild(commentSection);

    entryPreviewDiv.appendChild(entryDiv);
  });


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
}

document.addEventListener("DOMContentLoaded", () => {
  displayLatestEntries();
});