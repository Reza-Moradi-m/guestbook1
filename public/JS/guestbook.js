// Import the Firestore and Storage instances from the HTML file
import { db, storage } from "./path-to-your-html-file.js";

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
    // Upload file to Firebase Storage
    const storageRef = storage.ref(`uploads/${file.name}`);
    const snapshot = await storageRef.put(file);
    const fileURL = await snapshot.ref.getDownloadURL();

    // Save message and file URL to Firestore
    await db.collection("guestbook").add({
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
    const querySnapshot = await db
      .collection("guestbook")
      .orderBy("timestamp", "desc")
      .get();

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
