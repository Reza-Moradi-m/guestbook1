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

            // Main comment input section
            const mainCommentSection = document.createElement("div");
            mainCommentSection.classList.add("main-comment-section");

            const mainCommentInput = document.createElement("input");
            mainCommentInput.type = "text";
            mainCommentInput.placeholder = "Write a comment...";
            mainCommentInput.classList.add("main-comment-input");

            const mainCommentSubmit = document.createElement("button");
            mainCommentSubmit.textContent = "Submit";
            mainCommentSubmit.classList.add("main-comment-submit");

            // Submit main comment
            mainCommentSubmit.addEventListener("click", async () => {
                const commentText = mainCommentInput.value.trim();
                if (commentText) {
                    await window.db
                        .collection("guestbook")
                        .doc(postId)
                        .collection("comments")
                        .add({
                            message: commentText,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            author: "Anonymous User", // Replace with dynamic author
                            parentCommentId: null, // Main comments have no parent
                        });
                    mainCommentInput.value = "";
                    displayComments(postId, entryDiv); // Refresh comments
                }
            });

            mainCommentSection.appendChild(mainCommentInput);
            mainCommentSection.appendChild(mainCommentSubmit);

            // Add interaction buttons
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

            interactionDiv.appendChild(likeButton);

            entryDiv.innerHTML = `
                <div class="entry-content">
                    ${nameElement.outerHTML}
                    ${messageElement.outerHTML}
                    ${timestampElement.outerHTML}
                    ${mediaElement}
                </div>
            `;
            entryDiv.appendChild(interactionDiv);
            entryDiv.appendChild(mainCommentSection);
            entryPreviewDiv.appendChild(entryDiv);

            // Display comments
            displayComments(postId, entryDiv); // Nested comments
        });
    } catch (error) {
        console.error("Error fetching latest entries:", error);
    }
}

// Function to display comments with nested replies
async function displayComments(postId, entryDiv, parentId = null, level = 0) {
    const commentsRef = window.db
        .collection("guestbook")
        .doc(postId)
        .collection("comments")
        .where("parentCommentId", "==", parentId)
        .orderBy("timestamp", "asc");

    const querySnapshot = await commentsRef.get();

    querySnapshot.forEach((doc) => {
        const commentData = doc.data();

        const commentDiv = document.createElement("div");
        commentDiv.classList.add("comment");
        commentDiv.style.marginLeft = `${level * 20}px`; // Indentation for replies

        const commentText = document.createElement("p");
        commentText.textContent = `${commentData.author}: ${commentData.message}`;

        // Reply button
        const replyButton = document.createElement("button");
        replyButton.textContent = "☁ Reply";
        replyButton.classList.add("reply-button");

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
                        author: "Anonymous User",
                        parentCommentId: doc.id, // Parent comment ID
                    });
                replyInput.value = "";
                replySection.style.display = "none"; // Hide after submission
                displayComments(postId, entryDiv, parentId, level + 1); // Refresh replies
            }
        });

        replyButton.addEventListener("click", () => {
            replySection.style.display =
                replySection.style.display === "none" ? "block" : "none";
        });

        replySection.appendChild(replyInput);
        replySection.appendChild(replySubmit);

        commentDiv.appendChild(commentText);
        commentDiv.appendChild(replyButton);
        commentDiv.appendChild(replySection);

        entryDiv.appendChild(commentDiv);

        // Recursive call for nested replies
        displayComments(postId, entryDiv, doc.id, level + 1);
    });
}

// Call the function to display entries
window.onload = displayLatestEntries;
