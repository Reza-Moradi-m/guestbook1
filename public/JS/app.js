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

            // Log the creation of comment section for debugging
console.log("Comment Section created: ", commentSection);

            // Create the input element for typing comments
            const commentInput = document.createElement("input");
            commentInput.type = "text";
            commentInput.placeholder = "Write a comment...";
            commentInput.classList.add("comment-input");

            // Ensure input element is properly appended
console.log("Comment Input created: ", commentInput);

            // Create the submit button for comments
            const commentSubmit = document.createElement("button");
            commentSubmit.textContent = "Submit";
            commentSubmit.classList.add("comment-submit");

            // Ensure submit button is properly appended
console.log("Comment Submit Button created: ", commentSubmit);

            // Submit the comment
            commentSubmit.addEventListener("click", async () => {
                const commentText = commentInput.value.trim();
                if (commentText) {
                    await window.db
                        .collection("guestbook")
                        .doc(postId)
                        .collection("comments")
                        .add({
                            text: commentText,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    commentInput.value = "";
                    displayComments(postId, commentSection);
                }
            });

            commentSection.appendChild(commentInput);
            commentSection.appendChild(commentSubmit);

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

    const querySnapshot = await commentsRef.limit(3).get();

    const existingComments = document.createElement("div");
    existingComments.classList.add("existing-comments");

    commentSection.innerHTML = ""; // Clear existing comments
    commentSection.appendChild(existingComments);

    querySnapshot.forEach((doc) => {
        const commentData = doc.data();
        const commentDiv = document.createElement("p");
        commentDiv.textContent = commentData.text;
        existingComments.appendChild(commentDiv);
    });

    // Add "See All Comments" button
    const seeAllButton = document.createElement("button");
    seeAllButton.textContent = "See All Comments";
    seeAllButton.classList.add("see-all-comments");

    seeAllButton.addEventListener("click", async () => {
        const allCommentsSnapshot = await commentsRef.get();
        existingComments.innerHTML = ""; // Clear existing comments
        allCommentsSnapshot.forEach((doc) => {
            const commentData = doc.data();
            const commentDiv = document.createElement("p");
            commentDiv.textContent = commentData.text;
            existingComments.appendChild(commentDiv);
        });
        seeAllButton.style.display = "none"; // Hide button after showing all comments
    });

    if (querySnapshot.size >= 3) {
        commentSection.appendChild(seeAllButton);
    }
}

// Call the function to display entries
window.onload = displayLatestEntries;
