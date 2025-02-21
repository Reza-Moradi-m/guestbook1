// Reference to form and input elements
const messageForm = document.getElementById("messageForm");
const fileInput = document.getElementById("fileInput");
const linkInput = document.getElementById("linkInput"); // ✅ New input field for links
const messagesDiv = document.getElementById("messages");

// Form submission handler
messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = document.getElementById("messageInput").value.trim();
    let file = fileInput.files[0];
    const link = linkInput.value.trim(); // ✅ Get the link input value

    // ✅ Ensure at least one field is filled (message, file, or link)
    if (!message && !file && !link) {
        alert("You must provide a message, a file, or a link.");
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

        // ✅ Convert HEIC files before upload
        if (file && (file.type === "image/heic" || file.name.endsWith(".heic"))) {
            try {
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: "image/jpeg",  // Convert to JPEG
                    quality: 0.8,
                });

                file = new File([convertedBlob], file.name.replace(".heic", ".jpg"), { type: "image/jpeg" });
                console.log("Converted HEIC to JPEG:", file);
            } catch (error) {
                console.error("Error converting HEIC file:", error);
                alert("Failed to convert HEIC file. Please use JPEG or PNG.");
                return;
            }
        }

        // ✅ Upload file if exists
        if (file) {
            const storageRef = window.storage.ref(`uploads/${file.name}`);
            const snapshot = await storageRef.put(file);
            fileURL = await snapshot.ref.getDownloadURL();
        }

        // ✅ Save post data to Firestore (including link)
        const docRef = await window.db.collection("guestbook").add({
            userId: user.uid,
            username: userData.username,
            name: userData.name,
            message,
            fileURL,
            link, // ✅ Store the link if provided
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // ✅ Update the document with postId
        await docRef.update({ postId: docRef.id });

        alert("Post uploaded successfully!");
        messageForm.reset();
        displayMessages();
    } catch (error) {
        console.error("Error uploading post:", error.message);
        alert("Failed to upload post.");
    }
});

function formatMessageWithLinksAndNewlines(message, link = "") {
    if (!message) message = ""; // Prevent null messages

    // Preserve line breaks by replacing `\n` with `<br>`
    let formattedMessage = message.replace(/\n/g, "<br>");

    // Regular expression to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    formattedMessage = formattedMessage.replace(urlRegex, function (url) {
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
            const videoId = url.includes("youtu.be")
                ? url.split("/").pop()
                : new URL(url).searchParams.get("v");

            return videoId
                ? `<br><iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" allowfullscreen></iframe><br>`
                : `<a href="${url}" target="_blank">${url}</a>`;
        }

        return `<a href="${url}" target="_blank">${url}</a>`; // Standard links
    });

    // Handle cases where a separate `link` field exists
    if (link) {
        if (link.includes("youtube.com") || link.includes("youtu.be")) {
            const videoId = link.includes("youtu.be")
                ? link.split("/").pop()
                : new URL(link).searchParams.get("v");

            return formattedMessage + `<br><iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" 
                    frameborder="0" allowfullscreen></iframe><br>`;
        }
        formattedMessage += `<br><a href="${link}" target="_blank" class="post-link">🔗 ${link}</a>`;
    }

    return formattedMessage;
}

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

            const isYouTube = data.link && data.link.includes("youtube.com/watch?v=");
            const embeddedVideo = isYouTube
                ? `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${new URL(data.link).searchParams.get("v")}" frameborder="0" allowfullscreen></iframe>`
                : "";

            const linkPreview = data.link
                ? isYouTube ? embeddedVideo : `<a href="${data.link}" target="_blank" class="post-link">🔗 ${data.link}</a>`
                : ""; // ✅ Embed YouTube video if it's a YouTube link

            const deleteButton =
                data.userId === firebase.auth().currentUser?.uid
                    ? `<button onclick="deletePost('${doc.id}')">Delete</button>`
                    : "";

            messageElement.innerHTML = `
                    <p><strong>${data.name} (${data.username}):</strong></p>
                    <p>${formatMessageWithLinksAndNewlines(data.message, data.link)}</p>
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
