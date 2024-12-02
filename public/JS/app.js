// Reference to the entry preview div
const entryPreviewDiv = document.getElementById("entry-preview");

// Function to fetch and display the latest entries
async function displayLatestEntries() {
    try {
        // Fetch the latest entries from Firestore
        const querySnapshot = await window.db
            .collection("guestbook")
            .orderBy("timestamp", "desc")
            .limit(5) // Fetch the last 5 entries
            .get();

        // Clear any existing content
        entryPreviewDiv.innerHTML = "";

        querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Create a container for each entry
            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");

            // Create elements for name and message
            const nameElement = document.createElement("h3");
            nameElement.textContent = `${data.firstName} ${data.lastName}`;

            const messageElement = document.createElement("p");
            messageElement.textContent = data.message;

            // Create an element for the image, video, or file preview
            let mediaElement = '';
            if (data.fileURL) {
                const fileType = data.fileURL.split('.').pop().toLowerCase(); // Extract file extension
                if (['jpeg', 'jpg', 'gif', 'png'].includes(fileType)) {
                    // It's an image
                    mediaElement = `<img src="${data.fileURL}" alt="Uploaded Image" class="entry-image" />`;
                } else if (['mp4', 'webm', 'ogg'].includes(fileType)) {
                    // It's a video
                    mediaElement = `
                        <video class="entry-video" controls>
                            <source src="${data.fileURL}" type="video/${fileType}" />
                            Your browser does not support the video tag.
                        </video>`;
                } else {
                    // Other file types
                    mediaElement = `<a href="${data.fileURL}" target="_blank" class="entry-link">Download Attachment</a>`;
                }
            }

            // Append elements to the entry div
            entryDiv.innerHTML = `
                <div class="entry-content">
                    <h3>${data.firstName} ${data.lastName}</h3>
                    <p>${data.message}</p>
                    ${mediaElement}
                </div>
            `;

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
