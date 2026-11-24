# AM Nieruchomości – strona www

Strona biura nieruchomości (Kraków i okolice) w trzech językach: polskim, angielskim i ukraińskim.

- Treść: `zrodla/tresc/*.json` (jeden plik na język, dane firmy i układ w `wspolne.json`).
- Wygląd: szablony Django w `zrodla/szablony/`, CSS, JS, zdjęcia i czcionki w `zrodla/statyczne/`.
- Budowanie: `pip install -r zrodla/requirements.txt`, potem `python zbuduj.py`.
  Wynik (`index.html`, `en/`, `uk/`, `static/`) serwuje GitHub Pages. Nie edytuj go ręcznie.

Strona przechodzi do programu Moja Agencja (panel „Strona www”). Opis przeniesienia:
[docs/PRZEKAZANIE-MOJA-AGENCJA.md](docs/PRZEKAZANIE-MOJA-AGENCJA.md).
