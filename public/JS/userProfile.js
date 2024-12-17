// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");
// Reference to the entry preview div
const entryPreviewDiv = document.getElementById("entry-preview");
if (!userId) {
    alert("No user specified!");
    window.location.href = "index.html";
  }

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("User authenticated:", user.uid);
        loadUserProfile();
    } else {
        console.warn("No user authenticated. Posts may still load without user-specific actions.");
        loadUserProfile(); // Allow posts to load without authentication
    }
});
  
  async function loadUserProfile() {
    try {
        
      // Fetch user details
      const userDoc = await window.db.collection("users").doc(userId).get();
      const userData = userDoc.data();
  
      if (!userData) {
        entryPreviewDiv.innerHTML = "<p>User not found.</p>";
        return;
      }

      entryPreviewDiv.innerHTML = ""; // Start with a clean slate


  
      // Display user details
      const header = document.createElement("div");
      header.classList.add("profile-header");
      header.innerHTML = `
        <img src="${userData.profilePicture || "images/default-avatar.png"}" alt="Profile Picture" class="profile-pic">
        <h2>${userData.name || "Unknown"}</h2>
        <p>Username: ${userData.username || "NoUsername"}</p>
      `;
      entryPreviewDiv.appendChild(header);

      // Step 3: Create a separate container for posts
      const postsContainer = document.createElement("div");
      postsContainer.id = "posts-container"; // Unique ID for posts
      entryPreviewDiv.appendChild(postsContainer); // Add it to the page

      // Step 4: Fetch and display posts
      displayLatestEntries();
  } catch (error) {
      console.error("Error loading user profile:", error);
      entryPreviewDiv.innerHTML = "<p>Error loading user profile.</p>";
  }
}
const authUser = firebase.auth().currentUser;
const currentUserId = authUser ? authUser.uid : null;
// Function to fetch and display the latest entries
async function displayLatestEntries() {
try {
const querySnapshot = await window.db
    .collection("guestbook")
    .where("userId", "==", userId)
    .orderBy("timestamp", "desc")
    .get();

    // Get the posts container
    const postsContainer = document.getElementById("posts-container");


    if (querySnapshot.empty) {
        entryPreviewDiv.innerHTML += "<p>No posts found for this user.</p>";
        return;
    }

    // Step 2: Clear only the posts container (do not touch the profile header)
    postsContainer.innerHTML = ""; // Clear previous posts if any

    

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



if (currentUserId) {
    const likesRef = window.db.collection("guestbook").doc(postId).collection("likes").doc(currentUserId);
    // Continue like button logic...
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
}





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

    // Append the post container to postsContainer
            postsContainer.appendChild(entryDiv);

    if (mediaElement) entryDiv.appendChild(mediaElement);

    entryDiv.appendChild(interactionDiv);
    entryDiv.appendChild(commentSection);

    

    
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
    // Check if the user is authenticated
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("You must be logged in to submit a reply.");
        return;
    }

    const replyText = replyInput.value.trim();
    if (!replyText) {
        alert("Reply cannot be empty.");
        return;
    }

    try {
        // Fetch user data for author details
        const userDoc = await window.db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        await window.db
            .collection("guestbook")
            .doc(postId)
            .collection("comments")
            .add({
                author: userData?.name || "Anonymous User", // Get name from user data
                userId: user.uid, // Add userId for reference
                message: replyText,
                parentCommentId: commentId, // Reply to this comment
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

        // Clear input and hide reply box
        replyInput.value = "";
        replySection.style.display = "none";

        // Refresh comments to show the new reply
        displayComments(postId, parentElement, commentId, indentLevel + 1);
    } catch (error) {
        console.error("Error submitting reply:", error);
        alert("Failed to submit reply. Please try again.");
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
   

