const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get("userId");

if (!userId) {
    alert("No user specified!");
    window.location.href = "index.html";
}

async function loadUserProfile() {
    const profileContainer = document.getElementById("profile-container");
    const postsContainer = document.getElementById("user-posts");

    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
        profileContainer.innerHTML = "<p>User not found.</p>";
        return;
    }

    profileContainer.innerHTML = `
        <img src="${userData.profilePicture || "images/default-avatar.png"}" alt="Profile Picture" class="entry-image">
        <h2>${userData.name}</h2>
        <p>Username: ${userData.username}</p>
    `;

    // Load user posts
    postsContainer.innerHTML = "";
    const querySnapshot = await db.collection("guestbook")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

    querySnapshot.forEach((doc) => {
        const postId = doc.id;
        const data = doc.data();
        const postElement = createPostElement(data, postId, false); // No delete button
        postsContainer.appendChild(postElement);
    });
}

loadUserProfile();