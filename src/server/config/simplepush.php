<?php

// Put your device token here (without spaces):
$deviceToken = '8ab145a830874aa6ab4fa3330679554add04a6e0dbe732ca31cd84e3bfa0d715';

// Put your private key's passphrase here:
$passphrase = 'dogopass9';

// Put your alert message here:
$message = 'My first push notification!';

////////////////////////////////////////////////////////////////////////////////

$ctx = stream_context_create();

$host = 'ssl://gateway.sandbox.push.apple.com:2195';
stream_context_set_option($ctx, 'ssl', 'local_cert', './dev/source/combined.pem');
// $host = 'ssl://gateway.push.apple.com:2195';
// stream_context_set_option($ctx, 'ssl', 'local_cert', './prod/source/combined.pem');

stream_context_set_option($ctx, 'ssl', 'passphrase', $passphrase);

// Open a connection to the APNS server
$fp = stream_socket_client(
	$host, $err,
	$errstr, 60, STREAM_CLIENT_CONNECT|STREAM_CLIENT_PERSISTENT, $ctx);

if (!$fp)
	exit("Failed to connect: $err $errstr" . PHP_EOL);

echo 'Connected to APNS' . PHP_EOL;

// Create the payload body
$body['aps'] = array(
	"messageFrom" => "Caroline",
	"badge" => 3,
	"sound" => 'ping.aiff',
	'alert' => 'You have a new message'
	);

// Encode the payload as JSON
$payload = json_encode($body);

// Build the binary notification
$msg = chr(0) . pack('n', 32) . pack('H*', $deviceToken) . pack('n', strlen($payload)) . $payload;

echo $msg;

// Send it to the server
$result = fwrite($fp, $msg, strlen($msg));

if (!$result)
	echo 'Message not delivered' . PHP_EOL;
else
	echo 'Message successfully delivered' . PHP_EOL;

// Close the connection to the server
fclose($fp);
