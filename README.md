# Bariera: Pierwsze Lata — launcher (G1R:MP)

Launcher serwera RP **Bariera: Pierwsze Lata** (Gothic 1 Remake Multiplayer, G1R:MP 0.1.9).

## Instalacja
1. Pobierz `Bariera-Launcher-Setup.exe` z [najnowszego wydania](https://github.com/rquitr-pixel/bariera-g1r-launcher/releases/latest).
2. Uruchom instalator. Windows może pokazać ostrzeżenie SmartScreen (instalator nie jest podpisany): kliknij **Więcej informacji → Uruchom mimo to**.
3. Wymagany jest zainstalowany oficjalny klient G1R:MP (launcher sam go wyszuka albo wskażesz plik `G1RMP-Launcher-*.exe`).

## Co robi
- pokazuje stan serwera (online, echo, liczba osób na serwerze),
- uruchamia oficjalny klient G1R:MP i łączy z serwerem Bariera,
- pamięta hasło serwera zaszyfrowane na tym komputerze,
- sam się aktualizuje z wydań na GitHubie.

Adres serwera, linki i teksty są w `config/serwer.json` w tym repozytorium — zmiana tam nie wymaga nowego wydania.

## Budowanie
`npm ci && npm run dist:win:public` → `dist-public/Bariera-Launcher-Setup.exe`, `.blockmap`, `latest.yml`.
Wydanie: tag `vX.Y.Z` = wersja z `package.json`, pełne wydanie (nie szkic) z tymi trzema plikami.
