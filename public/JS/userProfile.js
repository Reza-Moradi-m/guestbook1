// userProfile.js

// DOM Elements
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");
const profileContainer = document.getElementById("profile-section");
const entryPreviewDiv = document.getElementById("entry-preview");

if (!userId) {
  alert("No user specified!");
  window.location.href = "index.html";
}

// Load user profile and posts
async function loadUserProfile() {
  try {
    // Fetch user data
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      profileContainer.innerHTML = "<p>User not found.</p>";
      return;
    }

    // Populate user profile
    profileContainer.innerHTML = `
      <img src="${userData.profilePicture || "images/default-avatar.png"}" alt="Profile Picture" id="profile-picture">
      <h2>${userData.name}</h2>
      <p>Username: ${userData.username}</p>
    `;

    // Fetch and display user posts
    displayUserPosts(userId);
  } catch (error) {
    console.error("Error loading user profile:", error);
    alert("Failed to load user profile.");
  }
}

// Function to display user posts
async function displayUserPosts(userId) {
  entryPreviewDiv.innerHTML = ""; // Clear existing content

  try {
    const querySnapshot = await db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    if (querySnapshot.empty) {
      entryPreviewDiv.innerHTML = "<p>No posts found for this user.</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      const entryDiv = document.createElement("div");
      entryDiv.classList.add("entry");

      const messageElement = document.createElement("p");
      messageElement.textContent = `Message: ${data.message}`;

      const timestampElement = document.createElement("p");
      const timestamp = new Date(data.timestamp.seconds * 1000);
      timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

      let mediaElement = null;
      if (data.fileURL) {
        mediaElement = createMediaElement(data.fileURL);
      }

      entryDiv.appendChild(messageElement);
      entryDiv.appendChild(timestampElement);
      if (mediaElement) entryDiv.appendChild(mediaElement);

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

// Load profile on page load
window.onload = loadUserProfile;