// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

// DOM Elements
const searchInput = document.getElementById("search-input");
const searchType = document.getElementById("search-type");
const searchButton = document.getElementById("search-button");
const resultsList = document.getElementById("results-list");
const randomPostsContainer = document.getElementById("random-posts-container");
const entryPreviewDiv = document.getElementById("entry-preview");

firebase.auth().onAuthStateChanged((authUser) => {
  console.log("Auth state changed:", authUser);
  displayLatestEntries(authUser); // Pass `authUser` to enable like functionality if logged in
});

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

async function displayLatestEntries(authUser) {
  const userId = authUser ? authUser.uid : null;

  entryPreviewDiv.innerHTML = "";
  // Rest of the logic remains the same
  try {

    // Fetch followed users
    const querySnapshot = await window.db
      .collection("guestbook")
      .orderBy("timestamp", "desc")
      .get();




    if (querySnapshot.empty) {
      entryPreviewDiv.innerHTML = "<p>No posts found. Be the first to post something!</p>";
      return;
    }

    const processedPosts = new Set(); // ✅ Prevent duplicate posts

    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      const postId = doc.id;

      // ✅ Prevent duplicate posts from being added
      if (processedPosts.has(postId)) return;
      processedPosts.add(postId);




      const entryDiv = document.createElement("div");
      entryDiv.classList.add("entry");
      entryDiv.id = `post-${postId}`; // Add unique ID for each post

      // Fetch user profile picture and details
      const userDoc = await window.db.collection("users").doc(data.userId).get();
      const postUserData = userDoc.exists ? userDoc.data() : null;

      // Create the profile picture and username container
      const nameElement = document.createElement("div");
      nameElement.classList.add("post-user-info");
      nameElement.innerHTML = `
              <div style="display: flex; align-items: center;">
                  <img src="${postUserData?.profilePicture || 'images/default-avatar.png'}" 
                       alt="Profile Picture"  
                       style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
                  <a href="userProfile.html?userId=${data.userId}" class="user-link">
                      ${postUserData?.name || "Unknown"} (${postUserData?.username || "NoUsername"})
                  </a>
              </div>
          `;

      // Create the message and timestamp container
      const messageElement = document.createElement("p");
      messageElement.innerHTML = `
              <strong>Message:</strong>
              <a href="post.html?postId=${postId}" class="post-link">${data.message}</a>
          `;

      const timestampElement = document.createElement("p");
      timestampElement.innerHTML = `
              <strong>Posted on:</strong> ${new Date(data.timestamp.seconds * 1000).toLocaleString()}
          `;

      // Append elements to entryDiv in the correct order
      entryDiv.appendChild(nameElement); // Profile picture and username
      entryDiv.appendChild(messageElement); // Post message
      entryDiv.appendChild(timestampElement); // Post timestamp

      // Append the entryDiv to the posts container
      entryPreviewDiv.appendChild(entryDiv); // Use entryPreviewDiv instead of postsContainer
      // Determine the media type
      let mediaElement = null;
      if (data.fileURL) {
        try {
          console.log("Checking file URL:", data.fileURL); // Debugging log

          const response = await fetch(data.fileURL, { method: "HEAD" });

          if (!response.ok) {
            throw new Error(`File not found: ${data.fileURL}`);
          }


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
          console.error("Error fetching file metadata:", error.message);

          mediaElement = document.createElement("img");
          mediaElement.src = "images/default-avatar.png"; // Default placeholder
          mediaElement.alt = "File not found";
        }
      }

      // Create interaction buttons (like, comment, share)
      const interactionDiv = document.createElement("div");
      interactionDiv.classList.add("interaction-buttons");

      // Like button logic
      const likeButton = document.createElement("button");
      likeButton.classList.add("like-button");

      let likesRef = null;
      let liked = false;
      if (authUser) {
        userId = authUser.uid;
        likesRef = window.db.collection("guestbook").doc(postId).collection("likes").doc(userId);
      }


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
    
        // ✅ Fetch user details from Firestore
        let userData = { name: "Unknown", username: "NoUsername", profilePicture: "images/default-avatar.png" };
        try {
            const userDoc = await window.db.collection("users").doc(user.uid).get();
            if (userDoc.exists) {
                userData = userDoc.data();
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    
        if (commentText) {
            await window.db
                .collection("guestbook")
                .doc(postId)
                .collection("comments")
                .add({
                    author: userData.name || "Unknown",  // ✅ Now `userData` is defined
                    username: userData.username || "NoUsername",
                    userId: user.uid,  // ✅ Save userId for profile picture lookup
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
  } catch (error) {
    console.error("Error fetching latest entries:", error);
  }
}


// Function to display comments with proper nesting
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

  for (const doc of querySnapshot.docs) {
    const commentData = doc.data();
    const commentId = doc.id;

    let commentUserData = {
      profilePicture: "images/default-avatar.png",  // ✅ Default image
      name: "Unknown",
      username: "NoUsername",
    };

    if (commentData.userId) {
      try {
        const commentUserDoc = await window.db.collection("users").doc(commentData.userId).get();
        if (commentUserDoc.exists) {
          commentUserData = commentUserDoc.data();
        }
      } catch (error) {
        console.error("Error fetching user data for comment:", error);
      }
    }

    // Create the comment div
    const commentDiv = document.createElement("div");
    commentDiv.classList.add("comment");
    commentDiv.style.marginLeft = `${indentLevel * 20}px`; // Adjust margin for nesting

    // Set the correct profile picture and username for each comment
    commentDiv.innerHTML = `
          <div style="display: flex; align-items: center;">
              <img src="${commentUserData.profilePicture || 'images/default-avatar.png'}"
                   alt="Profile Picture"
                   style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
              <p>
                  <strong>
                      <a href="userProfile.html?userId=${commentData.userId}" class="user-link">
                          ${commentData.author || commentUserData.name || "Unknown"} (${commentData.username || commentUserData.username || "NoUsername"})
                      </a>
                  </strong>: ${commentData.message}
              </p>
          </div>
      `;

    // Add Reply button and reply section (if needed)
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

    // Toggle reply section on reply button click
    replyButton.addEventListener("click", () => {
      replySection.style.display =
        replySection.style.display === "none" ? "block" : "none";
    });

    // Submit reply logic
    submitReplyButton.addEventListener("click", async () => {
      const replyText = replyInput.value.trim();
      if (replyText) {
        await window.db
          .collection("guestbook")
          .doc(postId)
          .collection("comments")
          .add({
            author: commentUserData.name || "Anonymous User",
            username: commentUserData.username || "NoUsername",
            userId: commentData.userId,
            message: replyText,
            parentCommentId: commentId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });
        replyInput.value = ""; // Clear input field
        replySection.style.display = "none"; // Hide reply section
        displayComments(postId, parentElement, parentId, indentLevel + 1); // Refresh comments
      }
    });

    // Cancel reply logic
    cancelReplyButton.addEventListener("click", () => {
      replySection.style.display = "none"; // Hide reply section
      replyInput.value = ""; // Clear input
    });

    replySection.appendChild(replyInput);
    replySection.appendChild(submitReplyButton);
    replySection.appendChild(cancelReplyButton);
    commentDiv.appendChild(replyButton);
    commentDiv.appendChild(replySection);

    parentElement.appendChild(commentDiv);

    // Fetch and display replies recursively
    await displayComments(postId, parentElement, commentId, indentLevel + 1);
  }
}

firebase.auth().onAuthStateChanged((authUser) => {
  console.log("Auth state changed:", authUser);
  displayLatestEntries(authUser); // Pass `authUser` to enable conditional functionality
});