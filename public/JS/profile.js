// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

const entryPreviewDiv = document.getElementById("entry-preview");

// DOM elements for editing profile
const profileNameInput = document.getElementById("edit-profile-name");
const profileUsernameInput = document.getElementById("edit-profile-username");
const profileEmailInput = document.getElementById("edit-profile-email");
const profilePictureInput = document.getElementById("edit-profile-picture");
const saveProfileButton = document.getElementById("save-profile");

// Load user's personal profile
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }
  loadUserProfile(user.uid);
  loadUserPosts(user.uid);
});

// Function to load profile details
async function loadUserProfile(userId) {
  try {
    const userDoc = await window.db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      alert("User data not found!");
      return;
    }

    // Display profile data
    document.getElementById("profile-name").textContent = userData.name || "No name set";
    document.getElementById("profile-username").textContent = userData.username || "No username set";
    document.getElementById("profile-picture").src = userData.profilePicture || "images/default-avatar.png";

    // Set editable values
    profileNameInput.value = userData.name || "";
    profileUsernameInput.value = userData.username || "";
    profileEmailInput.value = firebase.auth().currentUser.email;
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

// Save updated profile details
saveProfileButton.addEventListener("click", async () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    const updatedData = {
      name: profileNameInput.value.trim(),
      username: profileUsernameInput.value.trim(),
    };

    // Update Firestore
    await window.db.collection("users").doc(user.uid).update(updatedData);

    // Update email
    if (profileEmailInput.value !== user.email) {
      await user.updateEmail(profileEmailInput.value);
    }

    // Handle profile picture upload
    if (profilePictureInput.files.length > 0) {
      const file = profilePictureInput.files[0];
      const storageRef = window.storage.ref(`profile-pictures/${user.uid}`);
      await storageRef.put(file);
      const fileURL = await storageRef.getDownloadURL();
      await window.db.collection("users").doc(user.uid).update({ profilePicture: fileURL });
    }

    alert("Profile updated successfully!");
    window.location.reload();
  } catch (error) {
    console.error("Error updating profile:", error);
  }
});

// Load user's posts
async function loadUserPosts(userId) {
  try {
    const postsContainer = document.getElementById("posts-container");
    postsContainer.innerHTML = ""; // Clear previous posts

    const querySnapshot = await window.db
      .collection("guestbook")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    if (querySnapshot.empty) {
      postsContainer.innerHTML = "<p>No posts yet.</p>";
      return;
    }

    querySnapshot.forEach(async (doc) => {
      const data = doc.data();
      const postId = doc.id;

      const postDiv = document.createElement("div");
      postDiv.classList.add("entry");

      // Fetch user details for post
      const userDoc = await window.db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      // Post Header
      const nameElement = document.createElement("div");
      nameElement.innerHTML = `
        <div style="display: flex; align-items: center;">
          <img src="${userData.profilePicture || "images/default-avatar.png"}" 
               alt="Profile Picture" 
               style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
          <span>${userData.name || "Unknown"} (${userData.username || "NoUsername"})</span>
        </div>
      `;

      const messageElement = document.createElement("p");
      messageElement.textContent = `Message: ${data.message}`;

      const timestampElement = document.createElement("p");
      const timestamp = new Date(data.timestamp.seconds * 1000);
      timestampElement.textContent = `Posted on: ${timestamp.toLocaleString()}`;

      const interactionDiv = document.createElement("div");
      interactionDiv.appendChild(createLikeButton(postId));
      interactionDiv.appendChild(createCommentSection(postId).button);

      postDiv.appendChild(nameElement);
      postDiv.appendChild(messageElement);
      postDiv.appendChild(timestampElement);
      postDiv.appendChild(interactionDiv);

      postsContainer.appendChild(postDiv);
    });
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

// Like button
function createLikeButton(postId) {
  const likeButton = document.createElement("button");
  likeButton.textContent = "⭐ Loading...";

  async function renderLike() {
    const likesSnapshot = await window.db.collection("guestbook").doc(postId).collection("likes").get();
    likeButton.textContent = `⭐ ${likesSnapshot.size}`;
  }

  likeButton.addEventListener("click", async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const likeRef = window.db.collection("guestbook").doc(postId).collection("likes").doc(user.uid);
    const likeSnapshot = await likeRef.get();

    if (likeSnapshot.exists) {
      await likeRef.delete();
    } else {
      await likeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    renderLike();
  });

  renderLike();
  return likeButton;
}

// Comment section
function createCommentSection(postId) {
  const button = document.createElement("button");
  button.textContent = "💬 Comment";

  const section = document.createElement("div");
  section.style.display = "none";

  const input = document.createElement("input");
  input.placeholder = "Write a comment...";
  const submit = document.createElement("button");
  submit.textContent = "Submit";

  submit.addEventListener("click", async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;

    await window.db.collection("guestbook").doc(postId).collection("comments").add({
      userId: user.uid,
      message: input.value.trim(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    input.value = "";
  });

  button.addEventListener("click", () => {
    section.style.display = section.style.display === "none" ? "block" : "none";
  });

  section.appendChild(input);
  section.appendChild(submit);

  return { button, section };
}