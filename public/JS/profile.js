// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();
const entryPreviewDiv = document.getElementById("entry-preview");

// Check if user is logged in and load their profile
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("User authenticated:", user.uid);
        loadUserProfile(user.uid);
        loadUserPosts(user.uid);
    } else {
        console.warn("No user authenticated. Redirecting to Sign In.");
        window.location.href = "auth.html";
    }
});

// Function to load the user profile
async function loadUserProfile(userId) {
    try {
        const userDoc = await window.db.collection("users").doc(userId).get();
        const userData = userDoc.data();

        if (userData) {
            // Populate profile details
            document.getElementById("profile-picture").src = userData.profilePicture || "images/default-avatar.png";
            document.getElementById("profile-name").textContent = userData.name || "Anonymous";
            document.getElementById("profile-username").textContent = userData.username || "NoUsername";
            document.getElementById("profile-email").textContent = firebase.auth().currentUser.email || "NoEmail";

            // Populate Edit Profile form
            document.getElementById("edit-name").value = userData.name || "";
            document.getElementById("edit-username").value = userData.username || "";
            document.getElementById("edit-email").value = firebase.auth().currentUser.email || "";
        }
    } catch (error) {
        console.error("Error loading user profile:", error);
    }
}

// Event listeners for profile editing
document.getElementById("edit-profile-button").addEventListener("click", () => {
    document.getElementById("edit-profile-section").style.display = "block";
    document.getElementById("profile").style.display = "none";
});

document.getElementById("cancel-edit-button").addEventListener("click", () => {
    document.getElementById("edit-profile-section").style.display = "none";
    document.getElementById("profile").style.display = "block";
});

// Function to save profile changes
document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = firebase.auth().currentUser;
    if (!user) {
        alert("You must be logged in to edit your profile.");
        return;
    }

    const newName = document.getElementById("edit-name").value;
    const newUsername = document.getElementById("edit-username").value;
    const newEmail = document.getElementById("edit-email").value;
    const newProfilePicture = document.getElementById("edit-profile-picture").files[0];

    try {
        // Update user profile details in Firestore
        const updates = { name: newName, username: newUsername };
        if (newProfilePicture) {
            const storageRef = window.storage.ref(`profilePictures/${user.uid}`);
            await storageRef.put(newProfilePicture);
            updates.profilePicture = await storageRef.getDownloadURL();
        }

        await window.db.collection("users").doc(user.uid).update(updates);

        // Update email if changed
        if (newEmail && newEmail !== user.email) {
            await user.updateEmail(newEmail);
        }

        alert("Profile updated successfully!");
        window.location.reload(); // Refresh page
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
    }
});

// Function to load user's posts
async function loadUserPosts(userId) {
    try {
        const querySnapshot = await window.db
            .collection("guestbook")
            .where("userId", "==", userId)
            .orderBy("timestamp", "desc")
            .get();

        if (querySnapshot.empty) {
            entryPreviewDiv.innerHTML = "<p>You have not created any posts yet.</p>";
            return;
        }

        entryPreviewDiv.innerHTML = ""; // Clear previous content

        querySnapshot.forEach(async (doc) => {
            const data = doc.data();
            const postId = doc.id;

            const postDiv = document.createElement("div");
            postDiv.classList.add("entry");

            // Fetch user profile picture
            const userDoc = await window.db.collection("users").doc(data.userId).get();
            const userData = userDoc.data();

            postDiv.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <img src="${userData?.profilePicture || "images/default-avatar.png"}" 
                         alt="Profile Picture" 
                         style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
                    <strong>${userData?.name || "Anonymous"} (${userData?.username || "NoUsername"})</strong>
                </div>
                <p>${data.message}</p>
                <p><small>Posted on: ${new Date(data.timestamp.seconds * 1000).toLocaleString()}</small></p>
                <button onclick="deletePost('${postId}')">Delete</button>
            `;

            entryPreviewDiv.appendChild(postDiv);
        });
    } catch (error) {
        console.error("Error loading user posts:", error);
        entryPreviewDiv.innerHTML = "<p>Error loading posts.</p>";
    }
}

// Function to delete a post
async function deletePost(postId) {
    const confirmation = confirm("Are you sure you want to delete this post?");
    if (!confirmation) return;

    try {
        await window.db.collection("guestbook").doc(postId).delete();
        alert("Post deleted successfully!");
        loadUserPosts(firebase.auth().currentUser.uid); // Reload posts
    } catch (error) {
        console.error("Error deleting post:", error);
        alert("Failed to delete post. Please try again.");
    }
}