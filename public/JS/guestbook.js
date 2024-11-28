// Import Firebase modules
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, addDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { app } from "./firebase-config.js";

// Initialize Firebase Storage and Firestore
const storage = getStorage(app);
const db = getFirestore(app);

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
        const storageRef = ref(storage, `uploads/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(snapshot.ref);

        // Save message and file URL to Firestore
        await addDoc(collection(db, "guestbook"), {
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
        const q = query(collection(db, "guestbook"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const messageElement = document.createElement("div");
            messageElement.classList.add("message");

            messageElement.innerHTML = `
                <p><strong>${data.firstName} ${data.lastName}:</strong> ${data.message}</p>
                ${data.fileURL ? `<a href="${data.fileURL}" target="_blank">View Attachment</a>` : ""}
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
