// Attach Firestore to `window`
window.db = firebase.firestore();

// Parse the postId from the URL
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("postId");

if (!postId) {
  alert("No post found. Redirecting to guestbook.");
  window.location.href = "guestbook.html";
}

// Fetch and display the post data
(async () => {
  try {
    const postDoc = await window.db.collection("guestbook").doc(postId).get();
    if (!postDoc.exists) {
      alert("Post not found. Redirecting to guestbook.");
      window.location.href = "guestbook.html";
      return;
    }

    const postData = postDoc.data();
    document.getElementById("post-message").innerText = postData.message;
    document.getElementById("post-author").innerText = `Posted by: ${postData.name} (${postData.username})`;
    document.getElementById("post-timestamp").innerText = `Posted on: ${
      new Date(postData.timestamp.seconds * 1000).toLocaleString()
    }`;

    if (postData.fileURL) {
      const postMedia = document.getElementById("post-media");
      postMedia.src = postData.fileURL;
      postMedia.style.display = "block";
    }
  } catch (error) {
    console.error("Error fetching post data:", error);
    alert("Failed to load the post. Try again.");
  }
})();