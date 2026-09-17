# Ikona Licznika Obrazu: klepsydra na tle "galeryjnym" (fiolet -> morski), z plamka farby.
from PIL import Image, ImageDraw
import math, os
OUT = "/home/jakub/projekty/DiscordWebHooki/assets"; S = 4
TOP, MID, BOT = (28, 20, 60), (60, 40, 120), (20, 140, 150)
CREAM, SAND, INK = (255, 244, 220), (255, 190, 90), (24, 18, 48)
PAINT = [(232, 72, 85), (255, 190, 60), (60, 190, 120), (70, 140, 240)]

def lerp(a, b, t): return tuple(round(a[i] + (b[i]-a[i])*t) for i in range(3))
def gradient(w, h):
    img = Image.new("RGB", (w, h)); d = ImageDraw.Draw(img)
    for y in range(h):
        f = y/(h-1)
        c = lerp(TOP, MID, f/0.5) if f < 0.5 else lerp(MID, BOT, (f-0.5)/0.5)
        d.line([(0, y), (w, y)], fill=c)
    return img

def build(w, h, cx, cy, hh, path):
    W, H = w*S, h*S; img = gradient(W, H).convert("RGBA"); d = ImageDraw.Draw(img)
    CX, CY, HH = cx*S, cy*S, hh*S           # HH = pol wysokosci klepsydry
    HW = HH*0.62                            # pol szerokosci
    T = int(HH*0.11)                        # grubosc ramy
    # rama: gorna i dolna belka
    for sy in (-1, 1):
        y = CY + sy*HH
        d.rounded_rectangle([CX-HW*1.15, y-T/2, CX+HW*1.15, y+T/2], radius=T/2, fill=CREAM)
    # szklo: dwa trojkaty (gorny i dolny) z lekko przezroczystym wypelnieniem
    glass = Image.new("RGBA", (W, H), (0,0,0,0)); g = ImageDraw.Draw(glass)
    neck = HH*0.06
    g.polygon([(CX-HW, CY-HH), (CX+HW, CY-HH), (CX+neck, CY), (CX-neck, CY)], fill=CREAM+(70,))
    g.polygon([(CX-neck, CY), (CX+neck, CY), (CX+HW, CY+HH), (CX-HW, CY+HH)], fill=CREAM+(70,))
    img = Image.alpha_composite(img, glass); d = ImageDraw.Draw(img)
    # kontur szkla
    d.line([(CX-HW, CY-HH), (CX-neck, CY), (CX-HW, CY+HH)], fill=CREAM, width=int(T*0.7), joint="curve")
    d.line([(CX+HW, CY-HH), (CX+neck, CY), (CX+HW, CY+HH)], fill=CREAM, width=int(T*0.7), joint="curve")
    # piasek: gora — malo (juz sie przesypal), dol — duzo
    top_lvl = CY - HH*0.30
    k = (CY - top_lvl)/HH; wtop = neck + (HW-neck)*k
    d.polygon([(CX-wtop, top_lvl), (CX+wtop, top_lvl), (CX+neck, CY), (CX-neck, CY)], fill=SAND)
    bot_lvl = CY + HH*0.45
    k2 = (bot_lvl - CY)/HH; wbot = neck + (HW-neck)*k2
    d.polygon([(CX-wbot, bot_lvl), (CX+wbot, bot_lvl), (CX+HW*0.97, CY+HH), (CX-HW*0.97, CY+HH)], fill=SAND)
    d.polygon([(CX-neck*0.6, CY), (CX+neck*0.6, CY), (CX+neck*0.9, bot_lvl), (CX-neck*0.9, bot_lvl)], fill=SAND)  # struzka
    # plamki farby w rogu — "obraz"
    for i, c in enumerate(PAINT):
        a = math.radians(150 + i*22); r = HH*1.45
        px, py = CX + r*math.cos(a), CY + r*math.sin(a)*0.75
        rr = HH*0.13
        d.ellipse([px-rr, py-rr, px+rr, py+rr], fill=c)
    out = img.convert("RGB").resize((w, h), Image.LANCZOS); out.save(path, "PNG")
    print(path, out.size, f"{os.path.getsize(path)/1024:.0f} KB")

build(1024, 1024, 512, 512, 300, f"{OUT}/icon-obraz.png")
