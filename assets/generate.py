from PIL import Image, ImageDraw
import math, os

OUT = "/home/jakub/projekty/DiscordWebHooki/assets"
S = 4  # supersampling

NIGHT  = (23, 21, 59)
PURPLE = (78, 44, 110)
CORAL  = (226, 88, 68)
AMBER  = (255, 172, 66)
SUN    = (255, 228, 154)
SUN_HI = (255, 244, 214)

def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def gradient(w, h, stops):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        f = y / (h - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= f <= p1:
                t = (f - p0) / (p1 - p0)
                d.line([(0, y), (w, y)], fill=lerp(c0, c1, t))
                break
    return img

def rays(draw, cx, cy, r_in, r_out, n, color, alpha_img):
    ad = ImageDraw.Draw(alpha_img)
    for i in range(n):
        a = math.radians(i * 360 / n + 11)
        hw_in = math.radians(3.4)
        hw_out = math.radians(1.5)
        pts = []
        for sgn, hw, r in ((1, hw_in, r_in), (1, hw_out, r_out), (-1, hw_out, r_out), (-1, hw_in, r_in)):
            ang = a + sgn * hw
            pts.append((cx + r * math.sin(ang), cy - r * math.cos(ang)))
        ad.polygon(pts, fill=color)

def hand(draw, cx, cy, angle_deg, length, width, color):
    a = math.radians(angle_deg)
    x, y = cx + length * math.sin(a), cy - length * math.cos(a)
    draw.line([(cx, cy), (x, y)], fill=color, width=width)
    r = width / 2
    for px, py in ((cx, cy), (x, y)):
        draw.ellipse([px - r, py - r, px + r, py + r], fill=color)

def build(w, h, cx, cy, sun_r, ray_out, path):
    W, H = w * S, h * S
    base = gradient(W, H, [(0.0, NIGHT), (0.40, PURPLE), (0.70, CORAL), (1.0, AMBER)])

    # rays on a soft layer
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rays(None, cx * S, cy * S, sun_r * S * 1.16, ray_out * S, 12, SUN + (95,), layer)
    base = Image.alpha_composite(base.convert("RGBA"), layer)

    d = ImageDraw.Draw(base)
    R = sun_r * S
    CX, CY = cx * S, cy * S
    # glow halo
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([CX - R * 1.14, CY - R * 1.14, CX + R * 1.14, CY + R * 1.14], fill=SUN + (60,))
    base = Image.alpha_composite(base, glow)
    d = ImageDraw.Draw(base)

    d.ellipse([CX - R, CY - R, CX + R, CY + R], fill=SUN)
    d.ellipse([CX - R * 0.82, CY - R * 0.82, CX + R * 0.82, CY + R * 0.82], fill=SUN_HI)

    # hour ticks
    for i in range(12):
        a = math.radians(i * 30)
        r1, r2 = R * 0.66, R * 0.76
        tw = int(R * (0.075 if i % 3 == 0 else 0.042))
        p1 = (CX + r1 * math.sin(a), CY - r1 * math.cos(a))
        p2 = (CX + r2 * math.sin(a), CY - r2 * math.cos(a))
        d.line([p1, p2], fill=NIGHT, width=tw)

    # 8:30
    hand(d, CX, CY, 255.0, R * 0.40, int(R * 0.105), NIGHT)
    hand(d, CX, CY, 180.0, R * 0.60, int(R * 0.075), NIGHT)
    d.ellipse([CX - R * 0.075, CY - R * 0.075, CX + R * 0.075, CY + R * 0.075], fill=NIGHT)

    out = base.convert("RGB").resize((w, h), Image.LANCZOS)
    out.save(path, "PNG")
    print(path, out.size, f"{os.path.getsize(path)/1024:.0f} KB")

build(1024, 1024, 512, 496, 300, 470, f"{OUT}/icon.png")
build(680, 240, 534, 116, 72, 116, f"{OUT}/banner.png")
