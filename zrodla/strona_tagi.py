"""Filtry i znaczniki szablonów strony www.

Ten sam plik trafia do Mojej Agencji jako `apps/strona/templatetags/strona.py`
(w szablonach: `{% load strona %}`). Nie zależy od niczego poza Django.

Lekki zapis w treściach (żeby w panelu nie trzeba było pisać HTML):
    ==tekst==          wyróżnienie (<mark>)
    **tekst**          pogrubienie
    [tekst](#kotwica)  link do części strony
    [tekst](okno:id)   przycisk otwierający okno (rodo, aml, cookies, nota)
    [tekst](https://…) link zewnętrzny
    [[pole]]           wartość z danych firmy (pusta = znacznik „do uzupełnienia”)
Tekst jest zawsze najpierw zabezpieczany (escape), więc treść z panelu nie może
wstrzyknąć HTML. Przy okazji filtr wstawia twarde spacje po jednoliterowych
wyrazach („w Krakowie”) i między liczbą a jednostką („61 m²”), żeby nie zostawały
na końcu wiersza.
"""

import re

from django import template
from django.utils.html import conditional_escape, escape
from django.utils.safestring import mark_safe

register = template.Library()

NBSP = " "

# Wyrazy, po których nie wolno łamać wiersza (sierotki), dla każdego języka.
_SIEROTKI = {
    "pl": r"[aiouwzAIOUWZ]|na|do|od|po|za|ze|we|że|ku|to|nr|art\.|ust\.|lit\.|§",
    "en": r"[aAI]|an|of|to|in|on|at|by|No\.|Art\.|§",
    "uk": r"[авзійоуАВЗІЙОУ]|до|на|за|від|та|що|не|№|ст\.|§",
}
_JEDNOSTKI = r"m²|zł|%|r\.|km|min|dni|lat|PLN|м²|зл|р\."


def sierotki(tekst, jezyk="pl"):
    wzor = _SIEROTKI.get(jezyk, _SIEROTKI["pl"])
    tekst = re.sub(rf"(?<![\w.])({wzor}) ", rf"\1{NBSP}", tekst)
    tekst = re.sub(rf"(\d) ({_JEDNOSTKI})(?!\w)", rf"\1{NBSP}\2", tekst)
    tekst = re.sub(r"(\d) (\d{3})(?!\d)", rf"\1{NBSP}\2", tekst)
    return tekst


def _link(m):
    tekst, cel = m.group(1), m.group(2)
    if cel.startswith("okno:"):
        return f'<button type="button" class="link" data-open="dlg-{cel[5:]}">{tekst}</button>'
    if cel.startswith("http"):
        return f'<a href="{cel}" rel="noopener" target="_blank">{tekst}</a>'
    return f'<a href="{cel}">{tekst}</a>'


@register.filter
def tekst(wartosc, pola=None):
    """Treść z panelu → bezpieczny HTML z lekkim zapisem (opis na górze pliku)."""
    if wartosc is None:
        return ""
    pola = pola or {}
    wynik = sierotki(str(escape(wartosc)), pola.get("_jezyk", "pl"))
    wynik = re.sub(r"\[\[(\w+)\]\]", lambda m: str(pola.get(m.group(1), m.group(0))), wynik)
    wynik = re.sub(r"==(.+?)==", r"<mark>\1</mark>", wynik)
    wynik = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", wynik)
    wynik = re.sub(r"\[([^\]]+)\]\(((?:#|okno:|https?://)[^)\s]*)\)", _link, wynik)
    return mark_safe(wynik)


@register.filter
def pierwsze(lista, ile):
    return list(lista)[: int(ile)]


@register.filter
def pozostale(lista, ile):
    return list(lista)[int(ile) :]


@register.filter
def tel(numer):
    """Numer telefonu do linku tel: (same cyfry i plus)."""
    return re.sub(r"[^\d+]", "", str(numer or ""))


@register.simple_tag
def formatuj(szablon, **wartosci):
    """{% formatuj "Usługa {n} z {m}" n=1 m=4 %} → „Usługa 1 z 4”."""
    wynik = str(conditional_escape(szablon))
    for klucz, wartosc in wartosci.items():
        wynik = wynik.replace("{" + klucz + "}", str(conditional_escape(wartosc)))
    return mark_safe(wynik)
