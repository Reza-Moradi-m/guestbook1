
// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

// Reference to the entry preview div
const entryPreviewDiv = document.getElementById("entry-preview");


// Function to fetch and display the latest entries for followed accounts
async function displayLatestEntries(authUser) {
    // Rest of the logic remains the same
    try {

        // Fetch followed users
        const followingSnapshot = await window.db
            .collection("users")
            .doc(authUser.uid)
            .collection("following")
            .get();

        if (followingSnapshot.empty) {
            entryPreviewDiv.innerHTML = "<p>You are not following anyone. Follow users to see their posts here!</p>";
            return;
        }

        const followedUserIds = followingSnapshot.docs.map((doc) => doc.id);

        // Fetch posts from followed users
        const querySnapshot = await window.db
            .collection("guestbook")
            .where("userId", "in", followedUserIds)
            .orderBy("timestamp", "desc")
            .get();

        entryPreviewDiv.innerHTML = ""; // Clear any existing content

        if (querySnapshot.empty) {
            entryPreviewDiv.innerHTML = "<p>No posts found from followed users. Start following users to see their posts!</p>";
            return;
        }

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            const postId = doc.id;

            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");
            entryDiv.id = `post-${postId}`; // Add unique ID for each post

            const userDoc = await window.db.collection("users").doc(data.userId).get();
            const userData = userDoc.exists ? userDoc.data() : { profilePicture: null, name: "Unknown", username: "NoUsername" };

            // Create a container for the profile picture and username
            const userContainer = document.createElement("div");
            userContainer.style.display = "flex";
            userContainer.style.alignItems = "center";

            // Add profile picture
            const profilePicElement = document.createElement("img");
            profilePicElement.src = userData.profilePicture || "images/default-avatar.png";
            profilePicElement.alt = "Profile Picture";
            profilePicElement.style.width = "40px";
            profilePicElement.style.height = "40px";
            profilePicElement.style.borderRadius = "50%";
            profilePicElement.style.marginRight = "10px";

            // Add clickable username linking to userProfile.html
            const nameElement = document.createElement("h3");
            nameElement.innerHTML = `
    <a href="userProfile.html?userId=${data.userId}" class="user-link">
        ${userData.name} (${userData.username})
    </a>
`;

            // Append profile picture and username to the container
            userContainer.appendChild(profilePicElement);
            userContainer.appendChild(nameElement);

            // Append the user container to the post entry
            entryDiv.appendChild(userContainer);

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

            const userId = authUser.uid;
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
        }
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

    for (const doc of querySnapshot.docs) {
        const commentData = doc.data();
        const commentId = doc.id;

        const commentDiv = document.createElement("div");
        commentDiv.classList.add("comment");

        // Ensure only a single level of indentation
        const indentationLevel = parentId === null ? 0 : 20;
        commentDiv.style.marginLeft = `${indentationLevel}px`;

        // Fetch user data asynchronously
        let commentUserData = { profilePicture: null }; // Default if user data is missing
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

        commentDiv.innerHTML = `
            <div style="display: flex; align-items: center;">
                <img src="${commentUserData.profilePicture || 'images/default-avatar.png'}"
                     alt="Profile Picture"
                     style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
                <p>
                    <strong>
                        <a href="userProfile.html?userId=${commentData.userId}" class="user-link">
                            ${commentData.author || "Unknown"} (${commentData.username || "NoUsername"})
                        </a>
                    </strong>: ${commentData.message}
                </p>
            </div>
        `;

        // Add Reply button and section
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
                        author: commentData.author || "Anonymous User",
                        username: commentData.username || "NoUsername",
                        message: replyText,
                        parentCommentId: commentId, // Reply to this comment
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                replyInput.value = ""; // Clear input
                replySection.style.display = "none"; // Hide reply box after submitting
                displayComments(postId, parentElement); // Refresh comments
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

        // Fetch replies for this comment (limit nesting to one level)
        if (parentId === null) {
            await displayComments(postId, commentDiv, commentId, 1);
        }
    }
}

// Call the function to display entries
firebase.auth().onAuthStateChanged((authUser) => {
    if (authUser) {
        displayLatestEntries(authUser);
    } else {
        entryPreviewDiv.innerHTML = "<p>You must log in to see posts from followed users.</p>";
    }
});
