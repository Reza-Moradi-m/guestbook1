
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
            .orderBy("timestamp", "desc")
            .get();

        entryPreviewDiv.innerHTML = ""; // Clear any existing content

        querySnapshot.forEach(async (doc) => {
            const data = doc.data();
            const postId = doc.id;

            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");
            entryDiv.id = `post-${postId}`; // Add unique ID for each post

            // Create elements for name, message, timestamp
            const nameElement = document.createElement("h3");
            nameElement.textContent = `Name: ${data.firstName} ${data.lastName}`;

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

            // Like button
            const likeButton = document.createElement("button");
            likeButton.classList.add("like-button");
            const likesRef = window.db.collection("guestbook").doc(postId);
            let currentLikes = data.likes || 0;
            likeButton.innerHTML = `⭐ ${currentLikes}`;
            let liked = false;

            likeButton.addEventListener("click", async () => {
                const updatedLikes = liked ? currentLikes - 1 : currentLikes + 1;
                await likesRef.update({ likes: updatedLikes });
                liked = !liked;
                currentLikes = updatedLikes;
                likeButton.innerHTML = `⭐ ${currentLikes}`;
            });

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
                if (commentText) {
                    await window.db
                        .collection("guestbook")
                        .doc(postId)
                        .collection("comments")
                        .add({
                            author: "Anonymous User", // Change to dynamic user when authentication is added
                            message: commentText,
                            parentCommentId: null, // Top-level comment
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
        commentDiv.style.marginLeft = `${indentLevel * 20}px`; // Indent replies
        commentDiv.innerHTML = `
            <p><strong>${commentData.author}:</strong> ${commentData.message}</p>
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
