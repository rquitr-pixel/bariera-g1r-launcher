## Bariera: Pierwsze Lata — launcher 1.0.3

Poprawki dla nowych osób, które dopiero zainstalowały launcher.

- Launcher sam podaje hasło serwera — nie trzeba go nigdzie wpisywać. Okienko hasła pojawi się tylko awaryjnie, gdy serwer odrzuci wbudowane hasło.
- Instalacja tylko dla bieżącego użytkownika (%LOCALAPPDATA%\Programs), bez uprawnień administratora i bez pytań o folder.
- Launcher szuka klienta G1R:MP w większej liczbie miejsc (Pulpit, Pobrane, Dokumenty, Programs, foldery z „G1R” w nazwie) i zapamiętuje znalezioną ścieżkę.
- Więcej czasu (2 min) na start oficjalnego launchera, gdy ten się aktualizuje.
- Zamiast ogólnego komunikatu jasne polskie podpowiedzi: gra już działa, brak pliku klienta, antywirus zablokował start, zablokowany PowerShell.
- Launcher nie zamyka się przy nieoczekiwanym błędzie. Pokazuje komunikat i zapisuje szczegóły w %APPDATA%\Bariera Pierwsze Lata\launcher.log (bez haseł).

Jeśli Windows pokaże ostrzeżenie SmartScreen: „Więcej informacji” → „Uruchom mimo to”.
