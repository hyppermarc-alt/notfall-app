# Notfall-App – Testversion

Passwortgeschützte Testfassung einer Notfall-App (Unfall-Hilfe, Reanimation mit Takt,
stabile Seitenlage, Notrufnummern, Notfallkarte per QR-Code).

Die App ist verschlüsselt (PBKDF2-SHA256 mit 600.000 Runden, AES-256-CBC, HMAC-SHA256)
und wird erst im Browser nach Eingabe des Passworts entschlüsselt. Persönliche Daten
liegen nie in diesem Repository – sie bleiben im Speicher des jeweiligen Handys.

Die Dateien werden aus dem Quellordner mit `tools/build_protected.py` erzeugt und
nicht von Hand bearbeitet.
