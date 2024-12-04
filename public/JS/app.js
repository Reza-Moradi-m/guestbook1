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

            // Create elements for name, message, and timestamp
            const nameElement = `<h3>Name: ${data.firstName} ${data.lastName}</h3>`;
            const messageElement = `<p>Message: ${data.message}</p>`;
            const timestampElement = `<p>Posted on: ${new Date(data.timestamp.seconds * 1000).toLocaleString()}</p>`;

            // Determine the media type using a HEAD request
            let mediaElement = "";
            if (data.fileURL) {
                try {
                    const response = await fetch(data.fileURL, { method: "HEAD" });
                    const contentType = response.headers.get("Content-Type");

                    if (contentType.startsWith("image/")) {
                        mediaElement = `<img src="${data.fileURL}" alt="Uploaded Image" style="display: block; margin: auto; max-width: 100%; height: auto; cursor: zoom-in;" />`;
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

            // Add interaction buttons (like, comment)
            const interactionButtons = `
                <div class="interactions">
                    <button onclick="toggleLike('${postId}')">Like</button>
                    <button onclick="showCommentBox('${postId}')">Comment</button>
                    <span id="likes-count-${postId}">0 Likes</span>
                </div>
                <div id="comments-section-${postId}" class="comments-section"></div>
            `;

            // Combine everything into entry div
            entryDiv.innerHTML = `
                <div class="entry-content">
                    ${nameElement}
                    ${messageElement}
                    ${timestampElement}
                    ${mediaElement}
                    ${interactionButtons}
                </div>
            `;

            // Append to entry preview
            entryPreviewDiv.appendChild(entryDiv);

            // Fetch and render likes and comments
            updateLikeCount(postId);
            fetchComments(postId);
        });
    } catch (error) {
        console.error("Error fetching latest entries:", error);
        alert("Failed to load latest entries. Please try again later.");
    }
}

// Like functionality
async function toggleLike(postId) {
    const userId = "user123"; // Replace with authenticated user ID
    const likeRef = window.db.collection("guestbook").doc(postId).collection("likes").doc(userId);

    const likeDoc = await likeRef.get();
    if (likeDoc.exists) {
        await likeRef.delete(); // Remove like
    } else {
        await likeRef.set({
            userId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    updateLikeCount(postId);
}

// Update like count dynamically
async function updateLikeCount(postId) {
    const likesRef = window.db.collection("guestbook").doc(postId).collection("likes");
    const snapshot = await likesRef.get();
    const likeCount = snapshot.size;

    document.getElementById(`likes-count-${postId}`).textContent = `${likeCount} Likes`;
}

// Add a comment
async function addComment(postId, message, parentCommentId = null) {
    const commentsRef = window.db.collection("guestbook").doc(postId).collection("comments");

    await commentsRef.add({
        message,
        parentCommentId,
        author: "Anonymous", // Replace with authenticated username
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    fetchComments(postId);
}

// Fetch and render comments
async function fetchComments(postId) {
    const commentsRef = window.db.collection("guestbook").doc(postId).collection("comments").orderBy("timestamp");
    const snapshot = await commentsRef.get();

    const commentsContainer = document.getElementById(`comments-section-${postId}`);
    commentsContainer.innerHTML = ""; // Clear current comments

    snapshot.forEach((doc) => {
        const comment = doc.data();
        const commentDiv = document.createElement("div");
        commentDiv.classList.add("comment");

        commentDiv.innerHTML = `
            <p><strong>${comment.author}:</strong> ${comment.message}</p>
            <button onclick="showReplyBox('${postId}', '${doc.id}')">Reply</button>
            <div id="replies-${doc.id}" class="replies"></div>
        `;

        commentsContainer.appendChild(commentDiv);

        // Render nested replies
        renderReplies(postId, doc.id, commentDiv.querySelector(`#replies-${doc.id}`));
    });
}

// Render replies recursively
async function renderReplies(postId, parentCommentId, container) {
    const repliesRef = window.db
        .collection("guestbook")
        .doc(postId)
        .collection("comments")
        .where("parentCommentId", "==", parentCommentId)
        .orderBy("timestamp");

    const snapshot = await repliesRef.get();

    snapshot.forEach((doc) => {
        const reply = doc.data();
        const replyDiv = document.createElement("div");
        replyDiv.classList.add("reply");

        replyDiv.innerHTML = `<p><strong>${reply.author}:</strong> ${reply.message}</p>`;

        container.appendChild(replyDiv);

        // Recursively fetch more replies
        renderReplies(postId, doc.id, replyDiv);
    });
}

// Call display entries on load
window.onload = displayLatestEntries;
