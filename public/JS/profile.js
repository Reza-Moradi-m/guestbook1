auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  const userDoc = await db.collection("users").doc(user.uid).get();
  const userData = userDoc.data();

  // Populate profile details
  document.getElementById("profile-name").textContent = userData.name || "No name set";
  document.getElementById("profile-username").textContent = userData.username || "No username set";
  document.getElementById("profile-picture").src = userData.profilePicture || "images/default-avatar.png";

  const entryPreviewDiv = document.getElementById("entry-preview");

  async function displayUserPosts() {
    try {
      const querySnapshot = await db
        .collection("guestbook")
        .where("userId", "==", user.uid)
        .orderBy("timestamp", "desc")
        .get();

      entryPreviewDiv.innerHTML = ""; // Clear existing content

      querySnapshot.forEach(async (doc) => {
        const data = doc.data();
        const postId = doc.id;

        const entryDiv = document.createElement("div");
        entryDiv.classList.add("entry");
        entryDiv.id = `post-${postId}`;

        // Post details
        const messageElement = document.createElement("p");
        messageElement.textContent = data.message || "No message.";

        const timestampElement = document.createElement("p");
        const timestamp = new Date(data.timestamp.seconds * 1000);
        timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

        let mediaElement = null;
        if (data.fileURL) {
          mediaElement = document.createElement("img");
          mediaElement.src = data.fileURL;
          mediaElement.style.maxWidth = "100%";
        }

        // Interaction buttons
        const interactionDiv = document.createElement("div");
        interactionDiv.classList.add("interaction-buttons");

        // Like Button
        const likeButton = document.createElement("button");
        likeButton.classList.add("like-button");
        const likesRef = db.collection("guestbook").doc(postId).collection("likes").doc(user.uid);
        let liked = false;

        async function renderLikeButton() {
          const snapshot = await db.collection("guestbook").doc(postId).collection("likes").get();
          const likeCount = snapshot.size;
          likeButton.textContent = `⭐ ${likeCount}`;
        }

        likeButton.addEventListener("click", async () => {
          if (liked) {
            await likesRef.delete();
            liked = false;
          } else {
            await likesRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
            liked = true;
          }
          renderLikeButton();
        });

        renderLikeButton();

        // Comment Section
        const commentButton = document.createElement("button");
        commentButton.textContent = "💬 Comment";
        const commentSection = document.createElement("div");
        commentSection.style.display = "none";

        commentButton.addEventListener("click", () => {
          commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
        });

        const commentInput = document.createElement("input");
        commentInput.placeholder = "Write a comment...";
        const commentSubmit = document.createElement("button");
        commentSubmit.textContent = "Submit";

        commentSubmit.addEventListener("click", async () => {
          if (commentInput.value.trim()) {
            await db.collection("guestbook").doc(postId).collection("comments").add({
              message: commentInput.value.trim(),
              userId: user.uid,
              author: userData.name,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
            commentInput.value = "";
            displayComments();
          }
        });

        commentSection.appendChild(commentInput);
        commentSection.appendChild(commentSubmit);

        async function displayComments() {
          commentSection.innerHTML = "";
          const commentsSnapshot = await db.collection("guestbook").doc(postId).collection("comments").get();

          commentsSnapshot.forEach((commentDoc) => {
            const commentData = commentDoc.data();
            const commentDiv = document.createElement("div");
            commentDiv.textContent = `${commentData.author}: ${commentData.message}`;
            commentSection.appendChild(commentDiv);
          });
        }

        // Share Button
        const shareButton = document.createElement("button");
        shareButton.textContent = "🔗 Share";
        shareButton.addEventListener("click", async () => {
          await navigator.clipboard.writeText(`${window.location.origin}#post-${postId}`);
          alert("Post link copied to clipboard!");
        });

        interactionDiv.appendChild(likeButton);
        interactionDiv.appendChild(commentButton);
        interactionDiv.appendChild(shareButton);

        entryDiv.appendChild(messageElement);
        entryDiv.appendChild(timestampElement);
        if (mediaElement) entryDiv.appendChild(mediaElement);
        entryDiv.appendChild(interactionDiv);
        entryDiv.appendChild(commentSection);

        entryPreviewDiv.appendChild(entryDiv);
      });
    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  }

  displayUserPosts();
});