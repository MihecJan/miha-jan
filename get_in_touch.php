<?php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $validated = validate_request();

    $to = 'miha.jan002@gmail.com';
    $subject = 'New get in touch submission by ' . $validated['name'];
    $body = 'Name: ' . $validated['name'] . "\nEmail: " . $validated['email'] . "\nMessage: " . $validated['message'];

    if (mail($to, $subject, $body)) {
        $template = file_get_contents('email_template.html');
        $template = str_replace('{{ name }}', $validated['name'], $template);
        $template = str_replace('{{ message }}', 'Thank you for contacting me, your email was successfully sent.', $template);

        echo $template;
    } else {
        $template = file_get_contents('email_template.html');
        $template = str_replace('{{ name }}', '', $template);
        $template = str_replace('{{ message }}', 'Failed to send email. Please contact miha.jan002@gmail.com', $template);

        echo $template;
    }
}
else {
    $template = file_get_contents('email_template.html');
    $template = str_replace('{{ name }}', '', $template);
    $template = str_replace('{{ message }}', 'Method not allowed.', $template);

    echo $template;
}

function validate_request() {
    if (!isset($_POST['name'])) {
        echo 'name not set.';
        exit();
    }

    if (!isset($_POST['email'])) {
        echo 'email not set.';
        exit();
    }
    if (!filter_var($_POST['email'], FILTER_VALIDATE_EMAIL)) {
        $template = file_get_contents('email_template.html');
        $template = str_replace('{{ name }}', '', $template);
        $template = str_replace('{{ message }}', 'Invalid email format.', $template);

        echo $template;
        exit();
    }

    if (!isset($_POST['message'])) {
        echo 'message not set.';
        exit();
    }

    $validated['name'] = $_POST['name'];
    $validated['email'] = $_POST['email'];
    $validated['message'] = $_POST['message'];

    return $validated;
}

?>