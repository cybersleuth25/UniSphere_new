<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];

    $stmt = $conn->prepare("SELECT email FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $token = bin2hex(random_bytes(32));
        $token_hash = hash('sha256', $token);
        $expiry = date("Y-m-d H:i:s", time() + 60 * 30);

        $update = $conn->prepare("UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?");
        $update->bind_param("sss", $token_hash, $expiry, $email);
        $update->execute();

        $reset_url = "reset-password.html?token=" . $token;
        echo json_encode(["success" => true, "message" => "If an account exists, a reset link has been sent.", "reset_url" => $reset_url]);
    } else {
        echo json_encode(["success" => true, "message" => "If an account exists, a reset link has been sent."]);
    }

} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>