# 글꼴을 화면에 쓰는 글자만큼 나눠(서브셋) 가볍게 만들어요.  python scripts/subset-fonts.py
# (fonttools, brotli 필요: pip install fonttools brotli)
#
# 한글 글꼴은 글자 11,172자를 통째로 담고 있어서 한 벌에 0.7~2.4MB였어요. 세 조각으로 나누고 CSS unicode-range로 이어 붙이면,
# 브라우저는 화면에 실제로 나온 글자가 든 조각만 받아요.
#   - ui     : 영문·숫자·문장부호 + 사이트 글(화면 문구·예시 동화)에 쓰인 한글   → 거의 모든 화면은 이것만 받아요
#              (제목·의성어처럼 몇 글자만 쓰는 손글씨 글꼴은 획이 많아 무거워서, 자주 쓰는 순서로 120자씩 더 잘게 나눠요)
#   - common : 나머지 자주 쓰는 한글 2,350자(KS X 1001)                      → 서버에서 온 동화 글에 새 글자가 있을 때
#   - rest   : 그 밖의 모든 글자                                           → 드문 글자가 나올 때만
# 브랜드 영문 글꼴(Darumadrop One)은 영문·문장부호만 남겨요.
#
# 결과: src/assets/fonts/subset/*.woff2 와 src/styles/fonts.css (손으로 고치지 말고 이 스크립트를 다시 돌려요)
# 사이트 글이 많이 바뀌면 다시 돌려서 ui 조각에 새 글자를 넣어 주세요. (안 돌려도 common 조각이 받아져서 글자는 보여요)
import glob
import io
import os
from collections import Counter

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, 'src', 'assets', 'fonts')
OUT_DIR = os.path.join(FONT_DIR, 'subset')
CSS_PATH = os.path.join(ROOT, 'src', 'styles', 'fonts.css')

HANGUL = range(0xAC00, 0xD7A4)
# 영문·숫자·문장부호와 자주 쓰는 기호예요.
BASE = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | set(range(0x2000, 0x2070)) \
    | set(range(0x2190, 0x2200)) | set(range(0x2460, 0x2500)) | set(range(0x25A0, 0x2700)) \
    | set(range(0x3000, 0x3040)) | set(range(0x3131, 0x3190)) | {0x20A9, 0x2122, 0xFF5E, 0xFF01, 0xFF1F}


def site_hangul():
    """사이트 소스(화면 문구·예시 동화)에 쓰인 한글과 쓰인 횟수예요."""
    used = Counter()
    files = glob.glob(os.path.join(ROOT, 'src', '**', '*.*'), recursive=True) + [os.path.join(ROOT, 'index.html')]
    for path in files:
        if not path.endswith(('.js', '.jsx', '.json', '.css', '.html')):
            continue
        with open(path, encoding='utf-8', errors='ignore') as file:
            used.update(ord(ch) for ch in file.read() if 0xAC00 <= ord(ch) <= 0xD7A3)
    return used


def ks_hangul():
    """KS X 1001에 있는 한글 2,350자예요. (파이썬 euc-kr은 나머지 글자도 8바이트 조합으로 바꿔 주어서, 2바이트인 글자만 골라요)"""
    result = set()
    for code in HANGUL:
        try:
            if len(chr(code).encode('euc-kr')) == 2:
                result.add(code)
        except UnicodeEncodeError:
            pass
    return result


def to_ranges(codes):
    codes = sorted(codes)
    ranges = []
    start = prev = None
    for code in codes:
        if start is None:
            start = prev = code
        elif code == prev + 1:
            prev = code
        else:
            ranges.append((start, prev))
            start = prev = code
    if start is not None:
        ranges.append((start, prev))
    return ', '.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in ranges)


def write_subset(src, codes, out_name):
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    font = TTFont(src)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=sorted(codes))
    subsetter.subset(font)
    buffer = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buffer)
    with open(os.path.join(OUT_DIR, out_name), 'wb') as file:
        file.write(buffer.getvalue())
    return len(buffer.getvalue())


def face(family, weight, file_name, codes):
    return (
        '@font-face {\n'
        f"  font-family: '{family}';\n"
        f"  src: url('../assets/fonts/subset/{file_name}') format('woff2');\n"
        '  font-style: normal;\n'
        f'  font-weight: {weight};\n'
        '  font-display: swap;\n'
        f'  unicode-range: {to_ranges(codes)};\n'
        '}\n'
    )


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for old in glob.glob(os.path.join(OUT_DIR, '*.woff2')):
        os.remove(old)
    counts = site_hangul()
    site = set(counts)
    # 자주 쓰는 글자부터예요.
    site_by_use = [code for code, _ in counts.most_common()]
    ks = ks_hangul()
    print(f'사이트 글 한글 {len(site)}자, KS 한글 {len(ks)}자')

    # (글꼴 이름, 굵기, 원본 파일, ui 한글을 몇 자씩 나눌지(None이면 한 조각))
    korean = [
        ('Pretendard', 300, 'Pretendard-Light.woff2', None),
        ('Pretendard', 400, 'Pretendard-Regular.woff2', None),
        ('Pretendard', 500, 'Pretendard-Medium.woff2', None),
        ('Pretendard', 600, 'Pretendard-SemiBold.woff2', None),
        ('Memoment Kkukkukk', 400, 'MemomentKkukkukk.woff2', 120),
        ('Hippie', 400, 'Hippie-KS.woff2', 120),
    ]
    css = [
        '/* 이 파일은 scripts/subset-fonts.py가 만들어요. 손으로 고치지 말고 스크립트를 다시 돌려 주세요.\n'
        '   글꼴마다 ui·common·rest 세 조각으로 나눠, 화면에 나온 글자가 든 조각만 받아요. */\n',
    ]
    total_before = total_ui = 0
    for family, weight, source, chunk in korean:
        src = os.path.join(FONT_DIR, source)
        have = set(TTFont(src).getBestCmap())
        base = os.path.splitext(source)[0]
        ui = (BASE | site) & have
        common = (ks - site) & have
        rest = have - ui - common
        parts = []
        if chunk:
            hangul = [code for code in site_by_use if code in have]
            parts.append(('ui', (BASE & have) | set(hangul[:chunk])))
            for index in range(chunk, len(hangul), chunk):
                parts.append((f'ui{index // chunk + 1}', set(hangul[index:index + chunk])))
        else:
            parts.append(('ui', ui))
        parts += [('common', common), ('rest', rest)]
        sizes = []
        for part, codes in parts:
            if not codes:
                continue
            name = f'{base}-{part}.woff2'
            sizes.append((part, write_subset(src, codes, name)))
            css.append(face(family, weight, name, codes))
        before = os.path.getsize(src)
        total_before += before
        total_ui += sum(size for part, size in sizes if part.startswith('ui'))
        print(f'{source}: {before // 1024}KB → ' + ', '.join(f'{p} {s // 1024}KB' for p, s in sizes))

    # 브랜드 영문 글꼴: 영문·문장부호만 남겨요.
    src = os.path.join(FONT_DIR, 'DarumadropOne-Regular.ttf')
    brand = BASE & set(TTFont(src).getBestCmap())
    brand_size = write_subset(src, brand, 'DarumadropOne-latin.woff2')
    css.append(face('Darumadrop One', 400, 'DarumadropOne-latin.woff2', brand))
    print(f'DarumadropOne-Regular.ttf: {os.path.getsize(src) // 1024}KB → latin {brand_size // 1024}KB')
    print(f'한글 글꼴 합계 {total_before // 1024}KB → 자주 받는 ui 조각 합계 {total_ui // 1024}KB')

    with open(CSS_PATH, 'w', encoding='utf-8', newline='\n') as file:
        file.write('\n'.join(css))


if __name__ == '__main__':
    main()
