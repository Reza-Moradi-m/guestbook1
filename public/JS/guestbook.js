document.addEventListener("DOMContentLoaded", () => {
    const messageForm = document.getElementById("messageForm");
    const fileInput = document.getElementById("fileInput");
    const messagesDiv = document.getElementById("messages");
  
    console.log("DOM fully loaded and parsed.");
    // Add your existing Firebase code here
  });
  

document.getElementById("messageForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const message = document.getElementById("messageInput").value.trim();
    const file = document.getElementById("fileInput").files[0];

    if (!file) {
        alert("Please upload a file!");
        return;
    }

    try {
        // Upload file to Firebase Storage
        const storageRef = storage.ref(`uploads/${file.name}`);
        const snapshot = await storageRef.put(file);
        const fileURL = await snapshot.ref.getDownloadURL();

        // Add data to Firestore
        await db.collection("guestbook").add({
            firstName,
            lastName,
            message,
            fileURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        alert("Message and file uploaded successfully!");
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to upload. Please try again.");
    }
});

console.log("Firestore DB Reference:", db);
console.log("Storage Reference:", storage);
