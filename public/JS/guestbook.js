// Reference to form and input elements
const messageForm = document.getElementById("messageForm");
const fileInput = document.getElementById("fileInput");
const messagesDiv = document.getElementById("messages");

// Form submission handler
messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const message = document.getElementById("messageInput").value.trim();
    const file = fileInput.files[0];

    if (!file) {
        alert("Please upload a file!");
        return;
    }

    try {
        // Ensure `db` and `storage` are available
        if (!window.db || !window.storage) {
            throw new Error("Firebase services are not initialized yet.");
        }

        // Upload file to Firebase Storage
        const storageRef = window.storage.ref(`uploads/${file.name}`);
        const snapshot = await window.storage.uploadBytes(storageRef, file);
        const fileURL = await window.storage.getDownloadURL(snapshot.ref);

        // Save message and file URL to Firestore
        await window.db.collection("guestbook").add({
            firstName,
            lastName,
            message,
            fileURL,
            timestamp: new Date(),
        });

        alert("Message and file uploaded successfully!");
        displayMessages();
        messageForm.reset();
    } catch (error) {
        console.error("Error uploading file or saving message:", error);
        alert("Failed to upload file and save message. Please try again.");
    }
});

// Fetch and display messages from Firestore
async function displayMessages() {
    messagesDiv.innerHTML = ""; // Clear current messages

    try {
        const q = window.db.collection("guestbook").orderBy("timestamp", "desc");
        const querySnapshot = await q.get();

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const messageElement = document.createElement("div");
            messageElement.classList.add("message");

            messageElement.innerHTML = `
                <p><strong>${data.firstName} ${data.lastName}:</strong> ${data.message}</p>
                ${
                    data.fileURL
                        ? `<a href="${data.fileURL}" target="_blank">View Attachment</a>`
                        : ""
                }
            `;
            messagesDiv.appendChild(messageElement);
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        alert("Failed to load messages. Please refresh the page.");
    }
}

// Initial call to display messages
displayMessages();
