// Reference to form and input elements
const messageForm = document.getElementById("messageForm");
const fileInput = document.getElementById("fileInput");
const messagesDiv = document.getElementById("messages");

// Form submission handler
messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("messageInput").value.trim();
    const file = fileInput.files[0];

    if (!message) {
        alert("Message is required!");
        return;
    }

    try {
        const user = firebase.auth().currentUser;

        if (!user) {
            alert("You must be logged in to submit a post.");
            return;
        }

        // Fetch user profile data
        const userDoc = await window.db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        let fileURL = null;

        // Upload file only if it exists
        if (file) {
            const storageRef = window.storage.ref(`uploads/${file.name}`);
            const snapshot = await storageRef.put(file);
            fileURL = await snapshot.ref.getDownloadURL();
        }

        // Save post data to Firestore
        await window.db.collection("guestbook").add({
            userId: user.uid,
            username: userData.username,
            name: userData.name,
            message,
            fileURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
        // Update the document with the postId
        await docRef.update({ postId: docRef.id });

        alert("Post uploaded successfully!");
        messageForm.reset();
        displayMessages();
    } catch (error) {
        console.error("Error uploading post:", error.message);
        alert("Failed to upload post.");
    }
});

// Fetch and display messages from Firestore
async function displayMessages() {
    messagesDiv.innerHTML = "";

    try {
        const querySnapshot = await window.db
            .collection("guestbook")
            .orderBy("timestamp", "desc")
            .get();

        querySnapshot.forEach((doc) => {
            const data = doc.data();

            const messageElement = document.createElement("div");
            messageElement.classList.add("message");

            const fileLink = data.fileURL
                ? `<a href="${data.fileURL}" target="_blank">View Attachment</a>`
                : "";

            const deleteButton =
                data.userId === firebase.auth().currentUser?.uid
                    ? `<button onclick="deletePost('${doc.id}')">Delete</button>`
                    : "";

                    messageElement.innerHTML = `
                      <p><strong>${data.name} (${data.username}):</strong>
                        <a href="post.html?postId=${doc.id}" class="post-link">${data.message}</a>
                      </p>
                      ${fileLink}
                      ${deleteButton}
                    `;
            messagesDiv.appendChild(messageElement);
        });
    } catch (error) {
        console.error("Error fetching messages:", error.message);
        alert("Failed to load messages.");
    }
}

// Delete Post
async function deletePost(postId) {
    try {
        await window.db.collection("guestbook").doc(postId).delete();
        alert("Post deleted successfully.");
        displayMessages();
    } catch (error) {
        console.error("Error deleting post:", error.message);
        alert("Failed to delete post.");
    }
}

// Display messages on page load
displayMessages();
