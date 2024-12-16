// profile.js

// DOM Elements
const profilePicture = document.getElementById("profile-picture");
const profileName = document.getElementById("profile-name");
const profileUsername = document.getElementById("profile-username");
const entryPreviewDiv = document.getElementById("entry-preview");

// Check User Authentication
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }

  try {
    // Fetch user profile data
    const userDoc = await db.collection("users").doc(user.uid).get();
    const userData = userDoc.data();

    // Populate profile details
    profileName.textContent = userData.name || "No name set";
    profileUsername.textContent = userData.username || "No username set";
    profilePicture.src = userData.profilePicture || "images/default-avatar.png";

    // Fetch and display user's posts
    displayUserPosts(user.uid);
  } catch (error) {
    console.error("Error loading profile:", error);
    alert("Failed to load profile. Please try again.");
  }
});

// Function to display user posts
async function displayUserPosts(userId) {
  entryPreviewDiv.innerHTML = ""; // Clear previous content

  try {
    const querySnapshot = await db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    if (querySnapshot.empty) {
      entryPreviewDiv.innerHTML = "<p>No posts found.</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const postId = doc.id;

      const entryDiv = document.createElement("div");
      entryDiv.classList.add("entry");

      // Post content
      const messageElement = document.createElement("p");
      messageElement.textContent = `Message: ${data.message}`;

      const timestampElement = document.createElement("p");
      const timestamp = new Date(data.timestamp.seconds * 1000);
      timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

      // Media element if any
      let mediaElement = null;
      if (data.fileURL) {
        mediaElement = createMediaElement(data.fileURL);
      }

      // Delete button (only for the post owner)
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "🗑 Delete";
      deleteButton.classList.add("delete-button");
      deleteButton.addEventListener("click", () => deletePost(postId, entryDiv));

      // Append to entry
      entryDiv.appendChild(messageElement);
      entryDiv.appendChild(timestampElement);
      if (mediaElement) entryDiv.appendChild(mediaElement);
      entryDiv.appendChild(deleteButton);

      entryPreviewDiv.appendChild(entryDiv);
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  }
}

// Helper to create media elements
function createMediaElement(url) {
  const img = document.createElement("img");
  img.src = url;
  img.style.maxWidth = "100%";
  img.style.height = "auto";
  return img;
}

// Function to delete a post
async function deletePost(postId, entryElement) {
  if (confirm("Are you sure you want to delete this post?")) {
    try {
      await db.collection("guestbook").doc(postId).delete();
      entryElement.remove();
      alert("Post deleted successfully.");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post.");
    }
  }
}