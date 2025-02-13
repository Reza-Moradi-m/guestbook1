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



async function loadUserProfile() {
  try {

    // Fetch user details
    const userDoc = await window.db.collection("users").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : { name: "Anonymous User", username: "NoUsername" };

    if (!userData) {
      entryPreviewDiv.innerHTML = "<p>User not found.</p>";
      return;
    }


    // ✅ Get the correct container for profile details
    const profileSection = document.getElementById("profile-section");
    if (!profileSection) {
      console.error("ERROR: Profile section not found in the HTML!");
      return; // Prevent further errors
    }
    profileSection.innerHTML = ""; // Clear any previous content

    // ✅ Append profile info to `profile-section`
    const header = document.createElement("div");
    header.classList.add("profile-header");
    header.innerHTML = `
         <img src="${userData.profilePicture || "images/default-avatar.png"}" alt="Profile Picture" class="profile-pic">
         <h2>${userData.name || "Unknown"}</h2>
         <p>Username: ${userData.username || "NoUsername"}</p>
     `;

    profileSection.appendChild(header); // ✅ Correct placement

    // Add Follow/Unfollow button
    // ✅ Follow button goes in `profile-section`
    const followButton = document.createElement("button");
    followButton.id = "follow-button";
    followButton.textContent = "follow";
    profileSection.appendChild(followButton); // ✅ Correct placement

    // Check if the current user is following the profile user
    async function updateFollowButton() {
      const authUser = firebase.auth().currentUser;
      if (!authUser) return;

      const followRef = window.db
        .collection("users")
        .doc(authUser.uid)
        .collection("following")
        .doc(userId);

      const followDoc = await followRef.get();
      if (followDoc.exists) {
        followButton.textContent = "Unfollow";
        followButton.onclick = unfollowUser;
      } else {
        followButton.textContent = "Follow";
        followButton.onclick = followUser;
      }
    }

    // Follow a user
    async function followUser() {
      const authUser = firebase.auth().currentUser;
      if (!authUser) {
        alert("You need to log in to follow users!");
        return;
      }

      const batch = window.db.batch();

      const followingRef = window.db
        .collection("users")
        .doc(authUser.uid)
        .collection("following")
        .doc(userId);
      batch.set(followingRef, { followedAt: firebase.firestore.FieldValue.serverTimestamp() });

      const followersRef = window.db
        .collection("users")
        .doc(userId)
        .collection("followers")
        .doc(authUser.uid);
      batch.set(followersRef, { followedAt: firebase.firestore.FieldValue.serverTimestamp() });

      try {
        await batch.commit();
        updateFollowButton();
        alert("You are now following this user.");
      } catch (error) {
        console.error("Error following user:", error);
        alert("Failed to follow user. Try again.");
      }
    }

    // Unfollow a user
    async function unfollowUser() {
      const authUser = firebase.auth().currentUser;
      if (!authUser) {
        alert("You need to log in to unfollow users!");
        return;
      }

      const batch = window.db.batch();

      const followingRef = window.db
        .collection("users")
        .doc(authUser.uid)
        .collection("following")
        .doc(userId);
      batch.delete(followingRef);

      const followersRef = window.db
        .collection("users")
        .doc(userId)
        .collection("followers")
        .doc(authUser.uid);
      batch.delete(followersRef);

      try {
        await batch.commit();
        updateFollowButton();
        alert("You have unfollowed this user.");
      } catch (error) {
        console.error("Error unfollowing user:", error);
        alert("Failed to unfollow user. Try again.");
      }
    }

    // Initialize follow button
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        updateFollowButton();
      } else {
        followButton.style.display = "none";
      }
    });
    // ✅ Message button goes in `profile-section`
    const messageButton = document.createElement("button");
    messageButton.id = "message-button";
    messageButton.textContent = "Message";
    profileSection.appendChild(messageButton); // ✅ Correct placement

    // Navigate to the messenger page with the selected user
    messageButton.addEventListener("click", async () => {
      const authUser = firebase.auth().currentUser;
      if (!authUser) {
        alert("You need to log in to message users!");
        return;
      }

      try {
        const chatId = await createOrGetChatRoom(authUser.uid, userId);
        if (chatId) {
          window.location.href = `chatroom.html?chatId=${chatId}`;
        } else {
          alert("Failed to create a chat room.");
        }
      } catch (error) {
        console.error("Error navigating to chat:", error);
        alert("Unable to start chat. Please try again.");
      }
    });

    // Function to create or retrieve an existing chat room
    async function createOrGetChatRoom(currentUserId, targetUserId) {
      const chatRef = window.db.collection("messages");

      // Search for an existing chat
      const existingChat = await chatRef
        .where("participants", "array-contains", currentUserId)
        .get();

      for (const doc of existingChat.docs) {
        const data = doc.data();
        if (data.participants.includes(targetUserId)) {
          return doc.id; // Return the existing chat ID
        }
      }

      // Create a new chat for self or with another user
      const participants = currentUserId === targetUserId
        ? [currentUserId, currentUserId]
        : [currentUserId, targetUserId];

      // If no existing chat, create a new one
      const newChat = await chatRef.add({
        participants: [currentUserId, targetUserId],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      return newChat.id;
    }

    // Step 3: Check if postsContainer already exists; if not, create it
    let postsContainer = document.getElementById("posts-container");

    if (!postsContainer) {
      postsContainer = document.createElement("div");
      postsContainer.id = "posts-container"; // Unique ID for posts
      document.getElementById("profile-section").innerHTML = "<p>Error loading user profile.</p>";
    }

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

      // Fetch user profile picture and details
      const userDoc = await window.db.collection("users").doc(data.userId).get();
      const postUserData = userDoc.data();

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

      // ✅ Append profile info to the correct section
      const profileSection = document.getElementById("profile-section");
      profileSection.appendChild(header);
      profileSection.appendChild(followButton);
      profileSection.appendChild(messageButton);

      // Append the entryDiv to the posts container
      postsContainer.appendChild(entryDiv);




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
      likeButton.textContent = "⭐ Loading..."; // Placeholder text while loading likes

      const likesRef = window.db.collection("guestbook").doc(postId).collection("likes");
      let liked = false; // Default value for liked state

      // Fetch like count and determine if current user liked the post
      async function initializeLikes() {
        try {
          const likeCount = await likesRef.get(); // Fetch all likes for this post
          const currentUser = firebase.auth().currentUser;

          if (currentUser && currentUser.uid) {
            const userLikeDoc = await likesRef.doc(currentUser.uid).get();
            liked = userLikeDoc.exists; // Check if the user already liked the post
          }

          renderLikeButton(likeCount.size); // Update button with total likes
        } catch (error) {
          console.error("Error fetching like count:", error);
          likeButton.textContent = "⭐ Error";
        }
      }

      // Function to update like count and button state
      async function updateLikes() {
        const currentUser = firebase.auth().currentUser;

        if (!currentUser) {
          alert("You need to log in to like this post!");
          return;
        }

        try {
          const userLikeRef = likesRef.doc(currentUser.uid);

          if (liked) {
            await userLikeRef.delete(); // Remove the like
            liked = false;
          } else {
            await userLikeRef.set({
              likedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            liked = true;
          }

          const likeCount = (await likesRef.get()).size; // Refresh like count
          renderLikeButton(likeCount);
        } catch (error) {
          console.error("Error updating like:", error);
          alert("Failed to update like.");
        }
      }

      // Render the like button with updated count
      function renderLikeButton(likeCount) {
        likeButton.innerHTML = liked ? `⭐ ${likeCount}` : `☆ ${likeCount}`;
      }

      likeButton.addEventListener("click", updateLikes);
      initializeLikes(); // Initialize the like button on load



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
    parentElement.innerHTML = ""; // Clear top-level comments only
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
    commentDiv.style.marginLeft = parentId === null ? "20px" : "40px";
    commentDiv.style.textAlign = "left"; // Align text to the left
    commentDiv.innerHTML = `
<p class="comment-text">
<strong class="comment-author">
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



        // Fetch the user data for the current user
        const userDoc = await window.db.collection("users").doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (!userData || !userData.username) {
          console.error("Error: Username for current user not found.");
          alert("Your profile is missing a username. Please update it before replying.");
          return;
        }

        // Ensure 'commentData.username' exists for the person being replied to
        const repliedTo = commentData.username || "UnknownUser"; // Fallback if username is missing

        // Add the reply to Firestore
        await window.db.collection("guestbook").doc(postId).collection("comments").add({
          author: userData.name || "Anonymous User", // Current reply author
          username: userData.username || "NoUsername", // Current reply author's username
          userId: user.uid, // ID of the current reply author
          message: `@${repliedTo} ${replyText}`, // Prefix reply text with the replied-to username
          parentCommentId: commentId, // Parent comment ID for nesting
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
        // Clear input and hide reply box
        replyInput.value = "";
        replySection.style.display = "none";

        // Dynamically append the new reply to the DOM
        const newReplyDiv = document.createElement("div");
        newReplyDiv.classList.add("comment");
        newReplyDiv.style.marginLeft = `${(indentLevel + 1) * 20}px`; // Indent reply properly
        newReplyDiv.style.textAlign = "left";
        newReplyDiv.innerHTML = `
<p>
<strong>
    <a href="userProfile.html?userId=${user.uid}" class="user-link">
        ${userData?.name || "Anonymous User"} (${userData?.username || "NoUsername"})
    </a>
</strong>: ${replyText}
</p>
`;

        // Append the new reply
        parentElement.appendChild(newReplyDiv);
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
    displayComments(postId, parentElement, commentId, indentLevel + 1);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserProfile(); // ✅ Ensure profile loads first
  displayLatestEntries(); // ✅ Then load posts
});


firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    console.error("No user is signed in.");
    alert("You need to sign in to perform this action.");
    window.location.href = "auth.html"; // Redirect to login
  } else {
    console.log("Current user ID:", user.uid);
  }
});