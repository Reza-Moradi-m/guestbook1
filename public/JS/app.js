// Reference to the entry preview div
const entryPreviewDiv = document.getElementById("entry-preview");

// Function to fetch and display the latest entries
async function displayLatestEntries() {
    try {
        // Fetch the latest entries from Firestore
        const querySnapshot = await window.db
            .collection("guestbook")
            .orderBy("timestamp", "desc")
            .limit(5) // Fetch the last 5 entries (adjust as needed)
            .get();

        // Clear any existing content
        entryPreviewDiv.innerHTML = "";

        querySnapshot.forEach(async (doc) => {
            const data = doc.data();

            // Create a container for each entry
            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");

            // Create elements for name and message
            const nameElement = document.createElement("h3");
            nameElement.textContent = `${data.firstName} ${data.lastName}`;

            const messageElement = document.createElement("p");
            messageElement.textContent = data.message;

            // Create an element for the image or video
            let mediaElement;
            if (data.fileURL) {
                if (data.fileURL.match(/\.(jpeg|jpg|gif|png)$/)) {
                    // It's an image
                    mediaElement = document.createElement("img");
                    mediaElement.src = data.fileURL;
                    mediaElement.alt = "User uploaded image";
                } else if (data.fileURL.match(/\.(mp4|webm|ogg)$/)) {
                    // It's a video
                    mediaElement = document.createElement("video");
                    mediaElement.src = data.fileURL;
                    mediaElement.controls = true;
                } else {
                    // Other file types
                    mediaElement = document.createElement("a");
                    mediaElement.href = data.fileURL;
                    mediaElement.textContent = "Download Attachment";
                    mediaElement.target = "_blank";
                }
            }

            // Append elements to the entry div
            entryDiv.appendChild(nameElement);
            entryDiv.appendChild(messageElement);
            if (mediaElement) {
                entryDiv.appendChild(mediaElement);
            }

            // Append the entry div to the entry preview div
            entryPreviewDiv.appendChild(entryDiv);
        });
    } catch (error) {
        console.error("Error fetching latest entries:", error);
        alert("Failed to load latest entries. Please try again later.");
    }
}

// Call the function to display entries when the page loads
window.onload = displayLatestEntries;
