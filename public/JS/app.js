// Reference to the entry preview div
const entryPreviewDiv = document.getElementById("entry-preview");

// Function to fetch and display the latest entries
async function displayLatestEntries() {
    try {
        // Fetch the latest entries from Firestore
        const querySnapshot = await window.db
            .collection("guestbook")
            .orderBy("timestamp", "desc")
            .get();

        // Clear any existing content
        entryPreviewDiv.innerHTML = "";

        querySnapshot.forEach(async (doc) => {
            const data = doc.data();
            const postId = doc.id;

            // Create a container for each entry
            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");

            // Create elements for name, message, timestamp
            const nameElement = document.createElement("h3");
            nameElement.textContent = `Name: ${data.firstName} ${data.lastName}`;

            const messageElement = document.createElement("p");
            messageElement.textContent = `Message: ${data.message}`;

            const timestampElement = document.createElement("p");
            const timestamp = new Date(data.timestamp.seconds * 1000); // Convert Firestore timestamp to Date
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

            // Create like, comment, and share buttons
            const interactionDiv = document.createElement("div");
            interactionDiv.classList.add("interaction-buttons");

            // Like button
            const likeButton = document.createElement("button");
            likeButton.classList.add("like-button");
            likeButton.innerHTML = `⭐ ${data.likes || 0}`;
            likeButton.addEventListener("click", async () => {
                const postRef = window.db.collection("guestbook").doc(postId);
                await postRef.update({ likes: (data.likes || 0) + 1 });
                likeButton.innerHTML = `⭐ ${(data.likes || 0) + 1}`;
            });

            // Comment button
            const commentButton = document.createElement("button");
            commentButton.classList.add("comment-button");
            commentButton.textContent = "💬 Comment";
            commentButton.addEventListener("click", () => {
                const commentBox = entryDiv.querySelector(".comment-box");
                commentBox.style.display =
                    commentBox.style.display === "none" ? "block" : "none";
            });

            // Share button
            const shareButton = document.createElement("button");
            shareButton.classList.add("share-button");
            shareButton.textContent = "🔗 Share";
            shareButton.addEventListener("click", async () => {
                if (navigator.share) {
                    navigator.share({
                        title: "Check out this post!",
                        text: `${data.firstName} ${data.lastName} says: ${data.message}`,
                        url: data.fileURL,
                    });
                } else {
                    navigator.clipboard.writeText(data.fileURL);
                    alert("Post link copied to clipboard!");
                }
            });

            interactionDiv.appendChild(likeButton);
            interactionDiv.appendChild(commentButton);
            interactionDiv.appendChild(shareButton);

            // Comment section
            const commentSection = document.createElement("div");
            commentSection.classList.add("comment-section");

            // Comment input box
            const commentBox = document.createElement("textarea");
            commentBox.classList.add("comment-box");
            commentBox.style.display = "none";
            commentBox.placeholder = "Write a comment...";

            const commentSubmit = document.createElement("button");
            commentSubmit.textContent = "Post Comment";
            commentSubmit.addEventListener("click", async () => {
                const comment = commentBox.value.trim();
                if (comment) {
                    await window.db
                        .collection("guestbook")
                        .doc(postId)
                        .collection("comments")
                        .add({
                            text: comment,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    commentBox.value = "";
                    displayComments(postId, commentSection);
                }
            });

            commentSection.appendChild(commentBox);
            commentSection.appendChild(commentSubmit);

            // Display comments
            displayComments(postId, commentSection);

            // Append elements to the entry div
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

    commentSection.innerHTML = ""; // Clear existing comments

    querySnapshot.forEach((doc) => {
        const commentData = doc.data();
        const commentDiv = document.createElement("p");
        commentDiv.textContent = commentData.text;
        commentSection.appendChild(commentDiv);
    });

    // Add "See All Comments" button
    const seeAllButton = document.createElement("button");
    seeAllButton.textContent = "See All Comments";
    seeAllButton.addEventListener("click", async () => {
        const allCommentsSnapshot = await commentsRef.get();
        commentSection.innerHTML = ""; // Clear comments
        allCommentsSnapshot.forEach((doc) => {
            const commentData = doc.data();
            const commentDiv = document.createElement("p");
            commentDiv.textContent = commentData.text;
            commentSection.appendChild(commentDiv);
        });
        seeAllButton.style.display = "none";
    });

    if (querySnapshot.size >= 3) {
        commentSection.appendChild(seeAllButton);
    }
}

// Call the function to display entries
window.onload = displayLatestEntries;
