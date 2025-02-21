// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();
// Reference to the entry preview div
const entryPreviewDiv = document.getElementById("entry-preview");
let userId;

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        console.log("User authenticated:", user.uid);
        userId = user.uid; // Ensure `userId` is set

        // Wait until userId is fully assigned, then load data
        try {
            await Promise.all([loadUserProfile(), displayLatestEntries()]);
        } catch (error) {
            console.error("Error loading user profile or entries:", error);
        }
    } else {
        console.warn("No user authenticated. Redirecting to login.");
        window.location.href = "auth.html"; // Redirect to login
    }
});

// AFTER Code in `profile.js`
async function loadUserProfile() {
    try {
        if (!userId) {
            console.error("User ID is undefined. Cannot load user profile.");
            return;
        }

        // Fetch user details from Firestore
        const userDoc = await window.db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            console.warn("User document not found in Firestore.");
            setDefaultProfile(); // Set default values for missing user
            return;
        }

        const userData = userDoc.data();

        // Safely assign profile data with fallbacks for missing fields
        document.getElementById("profile-name").innerText = userData.name || "Anonymous User";
        document.getElementById("profile-username").innerText = userData.username || "NoUsername";
        document.getElementById("profile-email").innerText = userData.email || "No Email";
        document.getElementById("profile-picture").src = userData.profilePicture || "images/default-avatar.png";

        console.log("User profile loaded successfully:", userData);
    } catch (error) {
        console.error("Error loading user profile:", error);
        setDefaultProfile(); // Set default values in case of an error
    }
}

// Helper function to set default profile values
function setDefaultProfile() {
    document.getElementById("profile-name").innerText = "Anonymous User";
    document.getElementById("profile-username").innerText = "NoUsername";
    document.getElementById("profile-email").innerText = "No Email";
    document.getElementById("profile-picture").src = "images/default-avatar.png";
}
const authUser = firebase.auth().currentUser;
const currentUserId = authUser ? authUser.uid : null;

// Function to check if a username is already taken
async function isUsernameTaken(username, currentUserId) {
    const usernameQuery = await db.collection("users").where("username", "==", username).get();

    for (const doc of usernameQuery.docs) {
        if (doc.id !== currentUserId) {
            return true; // Username is taken by another user
        }
    }
    return false; // Username is available
}

// Function to save profile changes
document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = firebase.auth().currentUser;
    if (!user) {
        alert("You must be logged in to edit your profile.");
        return;
    }

    const newName = document.getElementById("edit-name").value.trim();
    const newUsername = document.getElementById("edit-username").value.trim();
    const newEmail = document.getElementById("edit-email").value.trim();
    const newProfilePicture = document.getElementById("edit-profile-picture").files[0];

    try {
        // ✅ Step 1: Check if the new username is already taken (excluding the current user)
        if (newUsername && await isUsernameTaken(newUsername, user.uid)) {
            alert("Username is already taken. Please choose another.");
            return;
        }

        // ✅ Step 2: Prepare profile updates
        const updates = {};
        if (newName) updates.name = newName;
        if (newUsername) updates.username = newUsername;

        // ✅ Step 3: Upload profile picture if a file is selected
        if (newProfilePicture) {
            const storageRef = window.storage.ref(`profilePictures/${user.uid}`);
            await storageRef.put(newProfilePicture);
            updates.profilePicture = await storageRef.getDownloadURL();
        }

        // ✅ Step 4: Update Firestore user document
        await window.db.collection("users").doc(user.uid).update(updates);

        // ✅ Step 5: Update email if changed
        if (newEmail && newEmail !== user.email) {
            await user.updateEmail(newEmail);
        }

        alert("Profile updated successfully!");
        window.location.reload(); // Reload the page to reflect changes
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile. Please try again.");
    }
});

// Function to fetch and display the latest entries
async function displayLatestEntries() {
    try {
        if (!userId) {
            console.error("User ID is undefined. Cannot fetch entries.");
            return;
        }

        // Get the posts container
        const postsContainer = document.getElementById("posts-container");
        if (!postsContainer) {
            console.error("Posts container not found in the DOM.");
            return;
        }
        // Clear previous posts
        postsContainer.innerHTML = "";

        const querySnapshot = await window.db
            .collection("guestbook")
            .where("userId", "==", userId)
            .orderBy("timestamp", "desc")
            .get();




        if (querySnapshot.empty) {
            entryPreviewDiv.innerHTML += "<p>No posts found for this user.</p>";
            return;
        }

        // Step 2: Clear only the posts container (do not touch the profile header)
        postsContainer.innerHTML = ""; // Clear previous posts if any



        querySnapshot.forEach(async (doc) => {
            const data = doc.data();
            const postId = doc.id;

            const entryDiv = document.createElement("div");
            entryDiv.classList.add("entry");
            entryDiv.id = `post-${postId}`; // Add unique ID for each post

            // Fetch user profile picture and details
            const userDoc = await window.db.collection("users").doc(data.userId).get();
            const postUserData = userDoc.data();

            // Create the profile picture and username container
            const nameElement = document.createElement("div");
            nameElement.classList.add("post-user-info");
            nameElement.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <img src="${postUserData?.profilePicture || 'images/default-avatar.png'}" 
                         alt="Profile Picture"  
                         style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
                    <a href="userProfile.html?userId=${data.userId}" class="user-link">
                        ${postUserData?.name || "Unknown"} (${postUserData?.username || "NoUsername"})
                    </a>
                </div>
            `;

            // Create the message and timestamp container
            const messageElement = document.createElement("p");
            messageElement.innerHTML = `
                <strong>Message:</strong>
                <a href="post.html?postId=${postId}" class="post-link">${data.message}</a>
            `;

            const timestampElement = document.createElement("p");
            timestampElement.innerHTML = `
                <strong>Posted on:</strong> ${new Date(data.timestamp.seconds * 1000).toLocaleString()}
            `;

            // Append elements to entryDiv in the correct order
            entryDiv.appendChild(nameElement); // Profile picture and username
            entryDiv.appendChild(messageElement); // Post message
            entryDiv.appendChild(timestampElement); // Post timestamp

            // Append the entryDiv to the posts container
            postsContainer.appendChild(entryDiv);




            // Determine the media type
            let mediaElement = null;
            if (data.fileURL) {
                try {
                    let fileURL = data.fileURL;

                    if (!fileURL.startsWith("https://")) {
                        if (data.fileName) {
                            const fileRef = window.storage.ref(`uploads/${data.fileName}`);
                            fileURL = await fileRef.getDownloadURL();
                        } else {
                            throw new Error("File metadata missing fileName.");
                        }
                    }

                    const response = await fetch(fileURL, { method: "HEAD" });
                    const contentType = response.headers.get("Content-Type");

                    if (contentType.startsWith("image/")) {
                        mediaElement = document.createElement("img");
                        mediaElement.src = data.fileURL;
                        mediaElement.alt = "Uploaded Image";
                        mediaElement.style.display = "block";
                        mediaElement.style.margin = "auto";
                        mediaElement.style.maxWidth = "100%";
                        mediaElement.style.height = "auto";
                    } else if (contentType.startsWith("video/")) {
                        mediaElement = document.createElement("video");
                        mediaElement.controls = true;
                        mediaElement.style.display = "block";
                        mediaElement.style.margin = "auto";
                        mediaElement.style.maxWidth = "100%";
                        mediaElement.style.height = "auto";

                        const sourceElement = document.createElement("source");
                        sourceElement.src = data.fileURL;
                        sourceElement.type = contentType;
                        mediaElement.appendChild(sourceElement);
                    } else {
                        mediaElement = document.createElement("a");
                        mediaElement.href = data.fileURL;
                        mediaElement.target = "_blank";
                        mediaElement.textContent = "Download Attachment";
                        mediaElement.classList.add("entry-link");
                    }
                } catch (error) {
                    console.error("Error fetching file metadata:", error);
                }
            }

            // Create interaction buttons (like, comment, share)
            const interactionDiv = document.createElement("div");
            interactionDiv.classList.add("interaction-buttons");



            // Like button logic
            const likeButton = document.createElement("button");
            likeButton.classList.add("like-button");
            likeButton.textContent = "⭐ Loading..."; // Placeholder text while loading likes

            const likesRef = window.db.collection("guestbook").doc(postId).collection("likes");
            let liked = false; // Default value for liked state

            // Fetch like count and determine if current user liked the post
            async function initializeLikes() {
                try {
                    const likeCount = await likesRef.get(); // Fetch all likes for this post
                    const currentUser = firebase.auth().currentUser;

                    if (currentUser && currentUser.uid) {
                        const userLikeDoc = await likesRef.doc(currentUser.uid).get();
                        liked = userLikeDoc.exists; // Check if the user already liked the post
                    }

                    renderLikeButton(likeCount.size); // Update button with total likes
                } catch (error) {
                    console.error("Error fetching like count:", error);
                    likeButton.textContent = "⭐ Error";
                }
            }

            // Function to update like count and button state
            async function updateLikes() {
                const currentUser = firebase.auth().currentUser;

                if (!currentUser) {
                    alert("You need to log in to like this post!");
                    return;
                }

                try {
                    const userLikeRef = likesRef.doc(currentUser.uid);

                    if (liked) {
                        await userLikeRef.delete(); // Remove the like
                        liked = false;
                    } else {
                        await userLikeRef.set({
                            likedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                        liked = true;
                    }

                    const likeCount = (await likesRef.get()).size; // Refresh like count
                    renderLikeButton(likeCount);
                } catch (error) {
                    console.error("Error updating like:", error);
                    alert("Failed to update like.");
                }
            }

            // Render the like button with updated count
            function renderLikeButton(likeCount) {
                likeButton.innerHTML = liked ? `⭐ ${likeCount}` : `☆ ${likeCount}`;
            }

            likeButton.addEventListener("click", updateLikes);
            initializeLikes(); // Initialize the like button on load



            // Comment button
            const commentButton = document.createElement("button");
            commentButton.classList.add("comment-button");
            commentButton.textContent = "💬 Comment";

            // Comment section
            const commentSection = document.createElement("div");
            commentSection.classList.add("comment-section");
            commentSection.style.display = "none";

            // Existing comments container
            const existingComments = document.createElement("div");
            existingComments.classList.add("existing-comments");

            // Input field for comments
            const commentInput = document.createElement("input");
            commentInput.type = "text";
            commentInput.placeholder = "Write a comment...";
            commentInput.classList.add("comment-input");

            // Submit button for comments
            const commentSubmit = document.createElement("button");
            commentSubmit.textContent = "Submit";
            commentSubmit.classList.add("comment-submit");

            const cancelCommentButton = document.createElement("button");
            cancelCommentButton.textContent = "Cancel";
            cancelCommentButton.classList.add("cancel-comment-button");

            cancelCommentButton.addEventListener("click", () => {
                commentSection.style.display = "none"; // Hide comment box without submitting
                commentInput.value = ""; // Clear the input field
            });

            commentSubmit.addEventListener("click", async () => {
                const commentText = commentInput.value.trim();
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert("You must be logged in to comment.");
                    return;
                }
                if (commentText) {
                    const userDoc = await window.db.collection("users").doc(user.uid).get();
                    const userData = userDoc.data();

                    await window.db
                        .collection("guestbook")
                        .doc(postId)
                        .collection("comments")
                        .add({
                            author: userData.name || "Unknown",
                            username: userData.username || "NoUsername",
                            message: commentText,
                            parentCommentId: null,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                    commentInput.value = ""; // Clear input after submitting
                    displayComments(postId, existingComments);
                }
            });

            // Add input and buttons to the comment section
            commentSection.appendChild(existingComments);
            commentSection.appendChild(commentInput);
            commentSection.appendChild(commentSubmit);
            commentSection.appendChild(cancelCommentButton);

            // Toggle the comment section on button click
            commentButton.addEventListener("click", () => {
                commentSection.style.display =
                    commentSection.style.display === "none" ? "block" : "none";
                displayComments(postId, existingComments); // Ensure comments are displayed when toggled
            });

            displayComments(postId, existingComments); // Display comments

            // Share button
            const shareButton = document.createElement("button");
            shareButton.classList.add("share-button");
            shareButton.textContent = "🔗 Share";

            shareButton.addEventListener("click", async () => {
                const postUrl = `${window.location.origin}#post-${postId}`;
                if (navigator.share) {
                    navigator.share({
                        title: "Check out this post!",
                        text: `${data.firstName} says: ${data.message}`,
                        url: postUrl,
                    });
                } else {
                    await navigator.clipboard.writeText(postUrl);
                    alert("Post link copied to clipboard!");
                }
            });

            interactionDiv.appendChild(likeButton);
            interactionDiv.appendChild(commentButton);
            interactionDiv.appendChild(shareButton);

            entryDiv.appendChild(nameElement);
            entryDiv.appendChild(messageElement);
            entryDiv.appendChild(timestampElement);

            // Append the post container to postsContainer
            postsContainer.appendChild(entryDiv);

            if (mediaElement) entryDiv.appendChild(mediaElement);

            entryDiv.appendChild(interactionDiv);
            entryDiv.appendChild(commentSection);



        });

    } catch (error) {
        console.error("Error fetching latest entries:", error);
    }


    // Function to display comments with proper nesting
    async function displayComments(postId, parentElement, parentId = null, indentLevel = 0) {
        if (parentId === null) {
            parentElement.innerHTML = ""; // ✅ Clear top-level comments only
        }

        const commentsRef = window.db
            .collection("guestbook")
            .doc(postId)
            .collection("comments")
            .where("parentCommentId", "==", parentId)
            .orderBy("timestamp", "asc");

        const querySnapshot = await commentsRef.get();

        querySnapshot.forEach(async (doc) => {
            const commentData = doc.data();
            const commentId = doc.id;

            let commentUserData = {
                profilePicture: "images/default-avatar.png", // ✅ Default image
                name: "Unknown",
                username: "NoUsername",
            };

            if (commentData.userId) {
                try {
                    const commentUserDoc = await window.db.collection("users").doc(commentData.userId).get();
                    if (commentUserDoc.exists) {
                        commentUserData = commentUserDoc.data();
                    }
                } catch (error) {
                    console.error("Error fetching comment user data:", error);
                }
            }

            const commentDiv = document.createElement("div");
            commentDiv.classList.add("comment");
            commentDiv.style.marginLeft = parentId === null ? "20px" : "40px";
            commentDiv.style.textAlign = "left"; // Align text to the left

            // ✅ Comment format (same as reply format)
            commentDiv.innerHTML = `
        <div style="display: flex; align-items: center;">
            <img src="${commentUserData.profilePicture}" 
                 alt="Profile Picture" 
                 style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
            <p>
                <strong>
                    <a href="userProfile.html?userId=${commentData.userId}" class="user-link">
                        ${commentUserData.name} (${commentUserData.username})
                    </a>
                </strong>: ${commentData.message}
            </p>
        </div>
      `;

            // ✅ Reply button
            const replyButton = document.createElement("button");
            replyButton.textContent = "Reply";
            replyButton.classList.add("reply-button");

            // ✅ Reply section (initially hidden)
            const replySection = document.createElement("div");
            replySection.classList.add("reply-section");
            replySection.style.display = "none";

            const replyInput = document.createElement("input");
            replyInput.type = "text";
            replyInput.placeholder = "Write a reply...";
            replyInput.classList.add("reply-input");

            const submitReplyButton = document.createElement("button");
            submitReplyButton.textContent = "Submit Reply";
            submitReplyButton.classList.add("submit-reply-button");

            const cancelReplyButton = document.createElement("button");
            cancelReplyButton.textContent = "Cancel";
            cancelReplyButton.classList.add("cancel-reply-button");

            // ✅ Hide reply section when cancel is clicked
            cancelReplyButton.addEventListener("click", () => {
                replySection.style.display = "none";
                replyInput.value = "";
            });

            // ✅ Submit reply logic
            submitReplyButton.addEventListener("click", async () => {
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert("You must be logged in to submit a reply.");
                    return;
                }

                const replyText = replyInput.value.trim();
                if (!replyText) {
                    alert("Reply cannot be empty.");
                    return;
                }

                try {
                    const userDoc = await window.db.collection("users").doc(user.uid).get();
                    const userData = userDoc.exists ? userDoc.data() : null;

                    if (!userData || !userData.username) {
                        alert("Your profile is missing a username. Please update it before replying.");
                        return;
                    }

                    const repliedTo = commentUserData.username || "UnknownUser";

                    // ✅ Store reply in Firestore
                    await window.db.collection("guestbook").doc(postId).collection("comments").add({
                        author: userData.name || "Anonymous User",
                        username: userData.username || "NoUsername",
                        userId: user.uid,
                        message: `@${repliedTo} ${replyText}`, // ✅ Prefix reply text with username
                        parentCommentId: commentId,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    });

                    // ✅ Clear input and hide reply box
                    replyInput.value = "";
                    replySection.style.display = "none";

                    // ✅ Append the new reply dynamically (same format as comments)
                    const newReplyDiv = document.createElement("div");
                    newReplyDiv.classList.add("comment");
                    newReplyDiv.style.marginLeft = `${(indentLevel + 1) * 20}px`;
                    newReplyDiv.innerHTML = `
            <div style="display: flex; align-items: center;">
                <img src="${userData.profilePicture || 'images/default-avatar.png'}" 
                     alt="Profile Picture" 
                     style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;">
                <p>
                    <strong>
                        <a href="userProfile.html?userId=${user.uid}" class="user-link">
                            ${userData.name || "Anonymous User"} (${userData.username || "NoUsername"})
                        </a>
                    </strong>: ${replyText}
                </p>
            </div>
          `;

                    if (parentElement) {
                        parentElement.appendChild(newReplyDiv);
                    }

                } catch (error) {
                    console.error("Error submitting reply:", error);
                    alert("Failed to submit reply. Please try again.");
                }
            });

            // ✅ Toggle reply section on button click
            replyButton.addEventListener("click", () => {
                replySection.style.display = replySection.style.display === "none" ? "block" : "none";
            });

            // ✅ Append reply input and buttons
            replySection.appendChild(replyInput);
            replySection.appendChild(submitReplyButton);
            replySection.appendChild(cancelReplyButton);

            // ✅ Append buttons to comment
            commentDiv.appendChild(replyButton);
            commentDiv.appendChild(replySection);

            // ✅ Append comment to parent element
            parentElement.appendChild(commentDiv);

            // ✅ Recursively fetch and display replies
            displayComments(postId, parentElement, commentId, indentLevel + 1);
        });
    }

    // Call the function to display entries
    window.onload = displayLatestEntries;

    // Show the edit profile form
    document.getElementById("edit-profile-button").addEventListener("click", () => {
        document.getElementById("edit-profile-section").style.display = "block";
        document.getElementById("profile").style.display = "none";
    });

    // Hide the edit profile form
    document.getElementById("cancel-edit-button").addEventListener("click", () => {
        document.getElementById("edit-profile-section").style.display = "none";
        document.getElementById("profile").style.display = "block";
    });



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
}