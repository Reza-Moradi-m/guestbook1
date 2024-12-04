// Reference to the entry preview div
const entryPreviewDiv = document.getElementById("entry-preview");

// Function to fetch and display the latest entries
async function displayLatestEntries() {
    try {
        const querySnapshot = await window.db
            .collection("guestbook")
            .orderBy("timestamp", "desc")
            .get();

        entryPreviewDiv.innerHTML = ""; // Clear previous content

        querySnapshot.forEach(async (doc) => {
            const data = doc.data();
            const postId = doc.id;

            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");

            const nameElement = `<h3>Name: ${data.firstName} ${data.lastName}</h3>`;
            const messageElement = `<p>Message: ${data.message}</p>`;
            const timestamp = new Date(data.timestamp.seconds * 1000);
            const timestampElement = `<p>Posted on: ${timestamp.toLocaleString()}</p>`;
            let mediaElement = data.fileURL.match(/image/)
                ? `<img src="${data.fileURL}" alt="Uploaded Image" style="max-width: 100%; height: auto;" />`
                : `<video controls style="max-width: 100%; height: auto;">
                    <source src="${data.fileURL}" type="video/mp4">
                  </video>`;

            // Interaction buttons
            const interactionDiv = document.createElement("div");
            interactionDiv.classList.add("interaction-buttons");

            const likeButton = document.createElement("button");
            likeButton.classList.add("like-button");
            likeButton.textContent = "⭐ Like";
            const likesRef = window.db.collection("guestbook").doc(postId).collection("likes");
            const userLiked = await likesRef.doc("user_id").get();

            if (userLiked.exists) {
                likeButton.textContent = "⭐ Unlike";
            }

            likeButton.addEventListener("click", async () => {
                if (userLiked.exists) {
                    await likesRef.doc("user_id").delete();
                    likeButton.textContent = "⭐ Like";
                } else {
                    await likesRef.doc("user_id").set({ liked: true });
                    likeButton.textContent = "⭐ Unlike";
                }
            });

            // Comment Button
            const commentSection = document.createElement("div");
            commentSection.classList.add("comment-section");
            commentSection.style.display = "none";

            const commentButton = document.createElement("button");
            commentButton.classList.add("comment-button");
            commentButton.textContent = "💬 Comment";

            commentButton.addEventListener("click", () => {
                commentSection.style.display =
                    commentSection.style.display === "none" ? "block" : "none";
            });

            const commentInput = document.createElement("textarea");
            commentInput.placeholder = "Write your comment here...";

            const commentSubmit = document.createElement("button");
            commentSubmit.textContent = "Post Comment";

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

            // Share Button
            const shareButton = document.createElement("button");
            shareButton.classList.add("share-button");
            shareButton.textContent = "🔗 Share";

            shareButton.addEventListener("click", async () => {
                const postUrl = `${window.location.origin}?postId=${postId}`;
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

            displayComments(postId, commentSection);

            entryDiv.innerHTML = `
                ${nameElement}
                ${messageElement}
                ${timestampElement}
                ${mediaElement}
            `;
            entryDiv.appendChild(interactionDiv);
            entryDiv.appendChild(commentSection);
            entryPreviewDiv.appendChild(entryDiv);
        });
    } catch (error) {
        console.error("Error displaying posts:", error);
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
        const comment = doc.data();
        const commentElement = document.createElement("p");
        commentElement.textContent = comment.text;
        commentSection.appendChild(commentElement);
    });

    const seeAllCommentsButton = document.createElement("button");
    seeAllCommentsButton.textContent = "See All Comments";
    seeAllCommentsButton.addEventListener("click", async () => {
        const allComments = await commentsRef.get();
        commentSection.innerHTML = "";
        allComments.forEach((doc) => {
            const comment = doc.data();
            const commentElement = document.createElement("p");
            commentElement.textContent = comment.text;
            commentSection.appendChild(commentElement);
        });
        seeAllCommentsButton.style.display = "none";
    });

    if (querySnapshot.size >= 3) {
        commentSection.appendChild(seeAllCommentsButton);
    }
}

// Initial fetch of entries
window.onload = displayLatestEntries;
