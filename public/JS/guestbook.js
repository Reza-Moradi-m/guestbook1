const messageForm = document.getElementById("messageForm");
const fileInput = document.getElementById("fileInput");
const messagesDiv = document.getElementById("messages");

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in to upload a post.");
    return;
  }

  const message = document.getElementById("messageInput").value.trim();
  const file = fileInput.files[0];

    if (!message) {
    alert("Please enter a message.");
    return;
    }

  try {
    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();

    // Determine file type
    const fileType = file.type.includes("image")
      ? "image"
      : file.type.includes("video")
      ? "video"
      : "pdf";

    // Upload file to Storage
    const storageRef = storage.ref(`uploads/${Date.now()}_${file.name}`);
    const metadata = { customMetadata: { userId: user.uid } };
    const snapshot = await storageRef.put(file, metadata);
    const fileURL = await snapshot.ref.getDownloadURL();

    // Add post to Firestore
    await db.collection("guestbook").add({
      userId: user.uid,
      name: userData.name,
      username: userData.username,
      message,
      fileURL,
      fileType,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      likes: 0
    });

    alert("Post uploaded successfully!");
    displayMessages();
    messageForm.reset();
  } catch (error) {
    console.error("Error uploading post:", error.message);
  }
});

// Display messages
async function displayMessages() {
  messagesDiv.innerHTML = "";
  const snapshot = await db.collection("guestbook").orderBy("timestamp", "desc").get();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const postElement = document.createElement("div");

    let fileLink = "";
    if (data.fileType === "image") {
      fileLink = `<img src="${data.fileURL}" alt="Image" style="max-width: 100%; height: auto;">`;
    } else if (data.fileType === "video") {
      fileLink = `<video src="${data.fileURL}" controls style="max-width: 100%; height: auto;"></video>`;
    } else if (data.fileType === "pdf") {
      fileLink = `<a href="${data.fileURL}" target="_blank">Download PDF</a>`;
    }

    const deleteButton =
      data.userId === auth.currentUser?.uid
        ? `<button onclick="deletePost('${doc.id}')">Delete</button>`
        : "";

    postElement.innerHTML = `
      <p>
        <a href="userProfile.html?userId=${data.userId}">
          <strong>${data.name} (${data.username})</strong>
        </a>
      </p>
      <p>${data.message}</p>
      ${fileLink}
      ${deleteButton}
    `;
    messagesDiv.appendChild(postElement);
  });
}

// Delete Post
async function deletePost(postId) {
  try {
    await db.collection("guestbook").doc(postId).delete();
    alert("Post deleted successfully.");
    displayMessages();
  } catch (error) {
    console.error("Error deleting post:", error.message);
  }
}

displayMessages();
