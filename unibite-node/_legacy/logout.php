<?php

?>
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Αποσύνδεση — UniBite</title>

    <link rel="stylesheet" href="css/variables.css">
    <link rel="stylesheet" href="css/common.css">
</head>
<body>

    <main class="container">

        <section class="card">

            <h1>Αποσύνδεση</h1>

            <p id="logout-status">Αποσύνδεση σε εξέλιξη...</p>

            <div id="logout-alert" class="alert-error" hidden></div>

            <noscript>
                <p>
                    Φαίνεται ότι η JavaScript είναι απενεργοποιημένη.
                    Πατήστε το παρακάτω κουμπί για να αποσυνδεθείτε.
                </p>
            </noscript>

            <button type="button" class="btn-primary" id="manual-logout-btn" hidden>
                Αποσύνδεση
            </button>

            <p>
                Θες να επιστρέψεις; <a href="login.php">Σύνδεση εδώ</a>
            </p>

        </section>
    </main>

    <script src="js/logout.js"></script>
    <script>

        document.addEventListener('DOMContentLoaded', () => {
            window.logout({ autoTrigger: true });
        });

    </script>

</body>
</html>
