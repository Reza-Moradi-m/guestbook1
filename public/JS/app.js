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
            let mediaElement = "";
            if (data.fileURL) {
                try {
                    const response = await fetch(data.fileURL, { method: "HEAD" });
                    const contentType = response.headers.get("Content-Type");

                    if (contentType.startsWith("image/")) {
                        mediaElement = `<img src="${data.fileURL}" alt="Uploaded Image" style="display: block; margin: auto; max-width: 100%; height: auto;" />`;
                    } else if (contentType.startsWith("video/")) {
                        mediaElement = `
                            <video controls style="display: block; margin: auto; max-width: 100%; height: auto;">
                                <source src="${data.fileURL}" type="${contentType}">
                                Your browser does not support the video tag.
                            </video>`;
                    } else {
                        mediaElement = `<a href="${data.fileURL}" target="_blank" class="entry-link">Download Attachment</a>`;
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

            // Create the input element for typing comments
            const commentInput = document.createElement("input");
            commentInput.type = "text";
            commentInput.placeholder = "Write a comment...";
            commentInput.classList.add("comment-input");

            // Create the submit button for comments
            const commentSubmit = document.createElement("button");
            commentSubmit.textContent = "Submit";
            commentSubmit.classList.add("comment-submit");

            // Create the cancel button for comments
            const commentCancel = document.createElement("button");
            commentCancel.textContent = "Cancel";
            commentCancel.classList.add("comment-cancel");

            // Submit the comment
            commentSubmit.addEventListener("click", async () => {
                const commentText = commentInput.value.trim();
                if (commentText) {
                    await window.db
                        .collection("guestbook")
                        .doc(postId)
                        .collection("comments")
                        .add({
                            message: commentText,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            author: "Anonymous User", // Add proper author info here
                            parentCommentId: null, // Default for top-level comments
                        });
                    commentInput.value = "";
                    displayComments(postId, commentSection);
                    commentSection.style.display = "none"; // Hide after submitting
                }
            });

            // Cancel the comment
            commentCancel.addEventListener("click", () => {
                commentInput.value = "";
                commentSection.style.display = "none"; // Hide on cancel
            });

            commentSection.appendChild(commentInput);
            commentSection.appendChild(commentSubmit);
            commentSection.appendChild(commentCancel);

            commentButton.addEventListener("click", () => {
                commentSection.style.display =
                    commentSection.style.display === "none" ? "block" : "none";
            });

            // Display comments
            displayComments(postId, commentSection);

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

            // Append all elements to the entry div
            entryDiv.innerHTML = `
                <div class="entry-content">
                    ${nameElement.outerHTML}
                    ${messageElement.outerHTML}
                    ${timestampElement.outerHTML}
                    ${mediaElement}
                </div>
            `;
            entryDiv.appendChild(interactionDiv);
            entryDiv.appendChild(commentSection);
            entryPreviewDiv.appendChild(entryDiv);
        });
    } catch (error) {
        console.error("Error fetching latest entries:", error);
    }
}

// Function to display comments
async function displayComments(postId, commentSection) {
    const commentsRef = window.db
        .collection("guestbook")
        .doc(postId)
        .collection("comments")
        .orderBy("timestamp", "asc");

    const querySnapshot = await commentsRef.get();

    commentSection.innerHTML = ""; // Clear existing comments

    querySnapshot.forEach((doc) => {
        const commentData = doc.data();

        const commentDiv = document.createElement("div");
        commentDiv.classList.add("comment");

        const commentText = document.createElement("p");
        commentText.textContent = `${commentData.author}: ${commentData.message}`;

        // Add a reply button
        const replyButton = document.createElement("button");
        replyButton.textContent = "☁ Reply";
        replyButton.classList.add("reply-button");

        // Reply section
        const replySection = document.createElement("div");
        replySection.classList.add("reply-section");
        replySection.style.display = "none";

        const replyInput = document.createElement("input");
        replyInput.type = "text";
        replyInput.placeholder = "Write a reply...";
        replyInput.classList.add("reply-input");

        const replySubmit = document.createElement("button");
        replySubmit.textContent = "Submit Reply";
        replySubmit.classList.add("reply-submit");

        const replyCancel = document.createElement("button");
        replyCancel.textContent = "Cancel";
        replyCancel.classList.add("reply-cancel");

        // Submit reply
        replySubmit.addEventListener("click", async () => {
            const replyText = replyInput.value.trim();
            if (replyText) {
                await window.db
                    .collection("guestbook")
                    .doc(postId)
                    .collection("comments")
                    .add({
                        message: replyText,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        author: "Anonymous User", // Replace with dynamic author
                        parentCommentId: doc.id, // Reference the parent comment
                    });
                replyInput.value = "";
                displayComments(postId, commentSection);
                replySection.style.display = "none"; // Hide reply section
            }
        });

        // Cancel reply
        replyCancel.addEventListener("click", () => {
            replyInput.value = "";
            replySection.style.display = "none";
        });

        replySection.appendChild(replyInput);
        replySection.appendChild(replySubmit);
        replySection.appendChild(replyCancel);

        replyButton.addEventListener("click", () => {
            replySection.style.display =
                replySection.style.display === "none" ? "block" : "none";
        });

        commentDiv.appendChild(commentText);
        commentDiv.appendChild(replyButton);
        commentDiv.appendChild(replySection);

        commentSection.appendChild(commentDiv);
    });
}

// Call the function to display entries
window.onload = displayLatestEntries;
