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

  // Load user posts
  loadUserPosts(user.uid);
});

async function loadUserPosts(userId) {
  const postsContainer = document.getElementById("posts-container");
  postsContainer.innerHTML = "";

  const querySnapshot = await db.collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

  querySnapshot.forEach((doc) => {
      const postId = doc.id;
      const data = doc.data();
      const postElement = createPostElement(data, postId, true); // Enable delete button
      postsContainer.appendChild(postElement);
  });
}

function createPostElement(data, postId, canDelete = false) {
  const postDiv = document.createElement("div");
  postDiv.classList.add("entry");

  postDiv.innerHTML = `
      <h3>
          <a href="userProfile.html?userId=${data.userId}" class="user-link">
              ${data.name} (${data.username})
          </a>
      </h3>
      <p>${data.message}</p>
      ${data.fileURL ? createMediaElement(data.fileURL) : ""}
      <div class="interaction-buttons">
          <button class="like-button" id="like-${postId}">⭐ 0</button>
          <button class="comment-button" id="comment-${postId}">💬 Comment</button>
      </div>
      <div class="comment-section" id="comments-${postId}" style="display:none;"></div>
  `;

  if (canDelete) {
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Delete";
      deleteButton.classList.add("remove-button");
      deleteButton.addEventListener("click", async () => {
          if (confirm("Are you sure you want to delete this post?")) {
              await db.collection("guestbook").doc(postId).delete();
              postDiv.remove();
              alert("Post deleted successfully.");
          }
      });
      postDiv.appendChild(deleteButton);
  }

  setupLikeButton(postId, postDiv.querySelector(`#like-${postId}`));
  setupCommentSection(postId, postDiv.querySelector(`#comment-${postId}`), postDiv.querySelector(`#comments-${postId}`));

  return postDiv;
}

function createMediaElement(fileURL) {
  const type = fileURL.split(".").pop();
  if (["jpg", "jpeg", "png", "gif"].includes(type)) {
      return `<img src="${fileURL}" class="entry-image" alt="Uploaded Image">`;
  } else if (["mp4", "webm"].includes(type)) {
      return `<video controls class="entry-video"><source src="${fileURL}" type="video/${type}"></video>`;
  } else if (["pdf"].includes(type)) {
      return `<a href="${fileURL}" target="_blank" class="entry-link">View PDF</a>`;
  }
  return `<a href="${fileURL}" target="_blank">Download File</a>`;
}

async function setupLikeButton(postId, button) {
  const userId = firebase.auth().currentUser.uid;
  const likesRef = db.collection("guestbook").doc(postId).collection("likes");

  const likeSnapshot = await likesRef.get();
  button.innerHTML = `⭐ ${likeSnapshot.size}`;

  const userLike = await likesRef.doc(userId).get();
  let liked = userLike.exists;

  button.addEventListener("click", async () => {
      if (liked) {
          await likesRef.doc(userId).delete();
      } else {
          await likesRef.doc(userId).set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
      liked = !liked;

      const updatedSnapshot = await likesRef.get();
      button.innerHTML = `⭐ ${updatedSnapshot.size}`;
  });
}

async function setupCommentSection(postId, button, commentSection) {
  button.addEventListener("click", () => {
      commentSection.style.display = commentSection.style.display === "none" ? "block" : "none";
      displayComments(postId, commentSection);
  });
}

async function displayComments(postId, parentElement) {
  parentElement.innerHTML = "";
  const querySnapshot = await db.collection("guestbook").doc(postId).collection("comments").orderBy("timestamp").get();

  querySnapshot.forEach((doc) => {
      const data = doc.data();
      const commentDiv = document.createElement("div");
      commentDiv.innerHTML = `
          <p>
              <strong>
                  <a href="userProfile.html?userId=${data.userId}" class="user-link">
                      ${data.author} (${data.username})
                  </a>
              </strong>: ${data.message}
          </p>
      `;
      parentElement.appendChild(commentDiv);
  });

  // Add comment input
  const inputDiv = document.createElement("div");
  inputDiv.innerHTML = `
      <input type="text" placeholder="Write a comment..." id="comment-input-${postId}">
      <button id="submit-comment-${postId}">Submit</button>
  `;
  parentElement.appendChild(inputDiv);

  const submitButton = inputDiv.querySelector(`#submit-comment-${postId}`);
  submitButton.addEventListener("click", async () => {
      const input = inputDiv.querySelector(`#comment-input-${postId}`).value;
      const user = firebase.auth().currentUser;

      if (input && user) {
          const userDoc = await db.collection("users").doc(user.uid).get();
          const userData = userDoc.data();

          await db.collection("guestbook").doc(postId).collection("comments").add({
              userId: user.uid,
              author: userData.name,
              username: userData.username,
              message: input,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });
          displayComments(postId, parentElement);
      }
  });
}