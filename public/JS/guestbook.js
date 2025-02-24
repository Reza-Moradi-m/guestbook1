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
    message = message || ""; // Ensure message is always a string
    link = link || ""; // Ensure link is always a string

    // Preserve line breaks
    let formattedMessage = message.replace(/\n/g, "<br>");

    // ✅ Check if the link is already an iframe (to prevent errors)
    function isYouTubeIframe(link) {
        return typeof link === "string" && link.includes("youtube.com/embed/");
    }

    // ✅ Extract YouTube Video ID Safely
    function extractYouTubeVideoId(url) {
        try {
            if (url.includes("youtu.be")) {
                return url.split("/").pop().split("?")[0];
            } else if (url.includes("youtube.com/watch?v=")) {
                return new URL(url).searchParams.get("v");
            }
        } catch (error) {
            console.error("Invalid YouTube URL:", url);
            return null;
        }
        return null;
    }

    // ✅ Check if the provided link is a YouTube URL
    function isYouTubeLink(url) {
        return (
            typeof url === "string" &&
            (url.includes("youtube.com/watch?v=") || url.includes("youtu.be"))
        );
    }

    // ✅ Ensure that a valid YouTube link gets embedded properly
    let embeddedVideo = "";
    if (link && isYouTubeLink(link)) {
        const videoId = extractYouTubeVideoId(link);
        if (videoId && !link.includes("youtube.com/embed/")) {  // Prevent duplicate iframe embedding
            embeddedVideo = `<br><iframe width="65%" height="auto" 
    style="aspect-ratio: 16 / 9;" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe><br>`;
        }
    }

    // ✅ Ensure all standard links are clickable, but avoid duplicating YouTube links
    if (link && !isYouTubeLink(link)) {
        formattedMessage += `<br><a href="${link}" target="_blank" class="post-link">🔗 ${link}</a>`;
    }

    return formattedMessage + embeddedVideo;
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

            // ✅ Function to check if a URL is a YouTube link
            function isYouTubeLink(url) {
                return (
                    typeof url === "string" &&
                    (url.includes("youtube.com/watch?v=") || url.includes("youtu.be"))
                );
            }

            // ✅ Ensure `isYouTube` is always declared
            const isYouTube = data.link ? isYouTubeLink(data.link) : false;

            // ✅ Function to extract YouTube Video ID
            function extractYouTubeVideoId(url) {
                try {
                    if (url.includes("youtu.be")) {
                        return url.split("/").pop().split("?")[0];
                    } else if (url.includes("youtube.com/watch?v=")) {
                        return new URL(url).searchParams.get("v");
                    }
                } catch (error) {
                    console.error("Invalid YouTube URL:", url);
                    return null;
                }
                return null;
            }

            const videoId = isYouTube ? extractYouTubeVideoId(data.link) : null;
            const embeddedVideo = videoId
            

            const linkPreview = data.link
                ? isYouTube ? embeddedVideo : `<a href="${data.link}" target="_blank" class="post-link">🔗 ${data.link}</a>`
                : ""; // ✅ Embed YouTube video if it's a YouTube link

            const deleteButton =
                data.userId === firebase.auth().currentUser?.uid
                    ? `<button onclick="deletePost('${doc.id}')">Delete</button>`
                    : "";

            messageElement.innerHTML = `
                    <p><strong>${data.name} (${data.username}):</strong></p>
                    <p><strong><a href="post.html?postId=${doc.id}" class="post-link">Message:</a></strong> ${formatMessageWithLinksAndNewlines(data.message, data.link)}</p>
                    ${fileLink}
                    ${linkPreview}
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
