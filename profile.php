<?php
session_start();
include 'connect.php';

$is_own_profile = false;
$user = null;

if (isset($_GET['username'])) {
    $username = $_GET['username'];
    $stmt = $conn->prepare("SELECT username, email, bio, avatar_path, role, branch, semester FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if (isset($_SESSION['user_email']) && $user && $_SESSION['user_email'] === $user['email']) {
        $is_own_profile = true;
    }
} elseif (isset($_SESSION['user_email'])) {
    $is_own_profile = true;
    $current_user_email = $_SESSION['user_email'];
    $stmt = $conn->prepare("SELECT username, email, bio, avatar_path, role, branch, semester FROM users WHERE email = ?");
    $stmt->bind_param("s", $current_user_email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
} else {
    header("Location: login.html");
    exit();
}

if (!$user) {
    echo "User not found.";
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($user['username']); ?>'s Profile</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@600&display=swap">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body class="profile-page-body">

    <div id="particles-js"></div>

    <div class="profile-container">
        <div class="profile-avatar-wrapper">
            <img src="" alt="Profile Avatar" id="profileAvatarImg" class="profile-avatar">
            <?php if ($is_own_profile): ?>
            <input type="file" id="avatarUploadInput" style="display: none;" accept="image/png, image/jpeg, image/gif">
            <button id="uploadAvatarBtn" class="avatar-control-btn" title="Upload a new avatar">
                <i class="fas fa-upload"></i>
            </button>
            <button id="changeAvatarBtn" class="avatar-control-btn" title="Get a new generated avatar">
                <i class="fas fa-sync-alt"></i>
            </button>
            <?php endif; ?>
        </div>
        
        <h1 id="welcomeHeading"><?php echo htmlspecialchars($user['username']); ?></h1>
        <p id="emailSubheading" class="subheading"><?php echo htmlspecialchars($user['email']); ?></p>
        
        <div class="profile-details subheading" style="margin-top: -20px; margin-bottom: 20px;">
            <span><?php echo htmlspecialchars($user['branch']); ?></span>
            &bull;
            <span>Semester <?php echo htmlspecialchars($user['semester']); ?></span>
        </div>
        
        <?php if ($is_own_profile): ?>
        <div class="profile-page-actions">
            <button id="editProfileBtn" class="btn secondary">Edit Profile</button>
            <a href="index.html" class="btn secondary">Main Page</a>
            <a href="logout.php" class="btn secondary">Logout</a>
        </div>
        <?php else: ?>
        <div class="profile-page-actions">
            <a href="index.html" class="btn secondary">Main Page</a>
        </div>
        <?php endif; ?>

    </div>

    <div id="editProfileModal" class="modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Edit Profile</h2>
            <form id="editProfileForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea id="bio" name="bio" rows="4" placeholder="Tell us a little about yourself..."></textarea>
                </div>
                <button type="submit" class="btn">Update Profile</button>
            </form>
        </div>
    </div>
    
    <script> const serverData = { user: <?php echo json_encode($user); ?>, isOwnProfile: <?php echo json_encode($is_own_profile); ?> }; </script>
    <script src="script.js"></script>
</body>
</html>