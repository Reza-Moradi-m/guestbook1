// Import and initialize Firebase
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import { firebaseConfig } from "./firebase-config.js"; // Ensure firebaseConfig.js has been set up correctly

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Handle form submission
document.getElementById("messageForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const message = document.getElementById("messageInput").value;
    const fileInput = document.getElementById("fileInput").files[0];

    if (!fileInput) {
        alert("Please upload an image or video.");
        return;
    }

    try {
        // Create a reference to the file in Firebase Storage
        const storageRef = ref(storage, `uploads/${fileInput.name}`);
        const uploadTask = uploadBytesResumable(storageRef, fileInput);

        // Show upload progress
        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress}% done`);
            },
            (error) => {
                console.error("Error during upload:", error);
                alert("File upload failed.");
            },
            async () => {
                // Get the file's download URL after upload
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                // Save entry details to Firestore or local storage
                const entry = {
                    firstName,
                    lastName,
                    message,
                    fileName: fileInput.name,
                    fileURL: downloadURL,
                    fileType: fileInput.type,
                    timestamp: new Date().toISOString(),
                };

                // Save to localStorage for testing (replace with Firestore later if needed)
                const entries = JSON.parse(localStorage.getItem("guestbookEntries")) || [];
                entries.push(entry);
                localStorage.setItem("guestbookEntries", JSON.stringify(entries));

                // Clear the form
                document.getElementById("messageForm").reset();
                alert("Your entry has been saved!");
            }
        );
    } catch (error) {
        console.error("Error uploading file:", error);
        alert("An unexpected error occurred. Please try again.");
    }
});
