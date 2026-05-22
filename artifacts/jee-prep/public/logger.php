<?php
// Allow the React frontend to call this script silently
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
$timestamp = date("Y-m-d H:i:s");

$logEntry = "Time: $timestamp | IP: $ip | Device: $userAgent\n";

// Prefixing with .ht hides the file from being accessed via web browser on standard Apache servers
file_put_contents('.ht_visitor_logs.txt', $logEntry, FILE_APPEND);

echo json_encode(["status" => "success"]);
?>