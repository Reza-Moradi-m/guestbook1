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
            nameElement.textContent = `Name: ${data.firstName} ${data.lastName}`;

            const messageElement = document.createElement("p");
            messageElement.textContent = `Message: ${data.message}`;

            const timestampElement = document.createElement("p");
            const timestamp = new Date(data.timestamp.seconds * 1000); // Convert Firestore timestamp to Date
            timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

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
                    ${nameElement.outerHTML}
                    ${messageElement.outerHTML}
                    ${timestampElement.outerHTML}
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

// Clear all entries function (if needed for your application)
async function clearAllEntries() {
    if (confirm("Are you sure you want to delete all entries?")) {
        try {
            const querySnapshot = await window.db.collection("guestbook").get();
            const batch = window.db.batch();

            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            alert("All entries have been deleted!");
            displayLatestEntries(); // Refresh the entries on the page
        } catch (error) {
            console.error("Error deleting all entries:", error);
            alert("Failed to delete entries. Please try again later.");
        }
    }
}

// Add a button to clear all entries (optional)
const clearButton = document.createElement("button");
clearButton.textContent = "Clear All Entries";
clearButton.classList.add("clear-button");
clearButton.addEventListener("click", clearAllEntries);
entryPreviewDiv.before(clearButton);

// Call the function to display entries when the page loads
window.onload = displayLatestEntries;
