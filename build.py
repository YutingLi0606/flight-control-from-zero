"""Build the course into one self-contained HTML page.

    python3 build.py   -> index.html (single self-contained page, open in any browser)
"""
import pathlib, sys
here = pathlib.Path(__file__).parent
src = here / "src"
public = True  # this repository holds the open-source version only
exists = lambda f: (src / f).exists()
part1 = ["l01.js", "l02.js", "l03.js", "lest.js"] + [f"l{i:02d}.js" for i in range(4, 11)]
part2 = [f"l{i:02d}.js" for i in range(12, 17) if exists(f"l{i:02d}.js")]
part3 = ["bridge.js"] + [f"rw{i}.js" for i in range(1, 5) if exists(f"rw{i}.js")]
order = ["kit.js"] + part1 + part2 + part3 + ["app.js"]
js = ("window.FC_PUBLIC = true;\n" if public else "") + "\n".join((src / f).read_text(encoding="utf-8") for f in order)
html = (src / "shell.html").read_text(encoding="utf-8").replace("<!--SCRIPTS-->", "<script>\n" + js + "\n</script>")
out = here / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(out, len(html))
