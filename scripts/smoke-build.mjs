// Kiểm tra nhanh artifact `dist/` trước khi upload lên Cloudflare Workers Static Assets.
// Dùng: node scripts/smoke-build.mjs [thư-mục-dist] [đường-dẫn-wrangler.jsonc]
// Yêu cầu build với BASE_PATH=/ (artifact production).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(process.argv[2] ?? join(root, 'dist'));
const wranglerPath = resolve(process.argv[3] ?? join(root, 'wrangler.jsonc'));

const FIXTURE_ID = 'TAY_INTERNAL_FIXTURE';
const FIXTURE_ROUTE = 'thu-noi-bo';
const LEGACY_BASE = '/Tieng-Tay-Nha-Minh';
const PAGES = ['index.html', 'lo-trinh/index.html', 'tu-lieu/index.html'];
const TEXT_EXT = /\.(html|css|js|mjs|json|txt|xml|svg|webmanifest|map)$/i;
// Khóa bí mật không bao giờ được xuất hiện trong bundle trình duyệt.
const SECRET_PATTERNS = [
  /service_role/i,
  /sb_secret_[A-Za-z0-9_-]+/,
  /CLOUDFLARE_API_TOKEN/,
  /SUPABASE_SERVICE/i,
];

const errors = [];
const fail = (message) => errors.push(message);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? [full, ...walk(full)] : [full];
  });
}

function readJsonc(path) {
  // Wrangler cho phép comment; bỏ comment dòng/khối nằm ngoài chuỗi rồi parse.
  const text = readFileSync(path, 'utf8');
  const stripped = text.replace(
    /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match, str) => str ?? '',
  );
  return JSON.parse(stripped.replace(/,(\s*[}\]])/g, '$1'));
}

function resolveAsset(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  const target = join(dist, clean);
  if (clean.endsWith('/')) return existsSync(join(target, 'index.html'));
  if (existsSync(target) && statSync(target).isFile()) return true;
  return existsSync(join(target, 'index.html'));
}

// 1. Cấu hình Wrangler: chỉ static assets, route sạch, 404 thật.
if (!existsSync(wranglerPath)) {
  fail(`Thiếu ${wranglerPath}`);
} else {
  const config = readJsonc(wranglerPath);
  const assets = config.assets ?? {};
  if (config.name !== 'hoc-tieng-tay') fail(`wrangler name phải là hoc-tieng-tay (đang là ${config.name})`);
  if (config.main) fail('Không dùng Worker script (main) cho static-only');
  if (assets.directory !== 'dist') fail(`assets.directory phải là dist (đang là ${assets.directory})`);
  if (assets.html_handling !== 'auto-trailing-slash') fail('assets.html_handling phải là auto-trailing-slash');
  if (assets.not_found_handling !== '404-page') {
    fail('assets.not_found_handling phải là 404-page (không dùng single-page-application)');
  }
  if (assets.run_worker_first) fail('Không dùng assets.run_worker_first');
}

// 2. Cấu trúc dist.
if (!existsSync(dist) || !statSync(dist).isDirectory()) {
  fail(`Thiếu thư mục build ${dist}; chạy BASE_PATH=/ npm run build trước`);
} else {
  const files = walk(dist);
  const rel = (file) => relative(dist, file).split('\\').join('/');

  for (const page of PAGES) {
    const file = join(dist, page);
    if (!existsSync(file)) {
      fail(`Thiếu trang ${page}`);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    if (!/<!doctype html>/i.test(html)) fail(`${page}: thiếu doctype`);
    if (!/<html[^>]*\slang="vi"/i.test(html)) fail(`${page}: thiếu <html lang="vi">`);
    if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${page}: thiếu <title>`);
    if (!/<h1[\s>]/i.test(html)) fail(`${page}: thiếu <h1>`);
  }

  // 404 thật: phải có 404.html riêng, không phải bản sao của trang chủ (không SPA fallback).
  const notFound = join(dist, '404.html');
  if (!existsSync(notFound)) {
    fail('Thiếu dist/404.html (cần src/pages/404.astro để Cloudflare trả 404 thật)');
  } else {
    const html = readFileSync(notFound, 'utf8');
    if (!/<html[^>]*\slang="vi"/i.test(html) || !/<h1[\s>]/i.test(html)) fail('404.html không phải trang HTML hợp lệ');
    const index = join(dist, 'index.html');
    if (existsSync(index) && html === readFileSync(index, 'utf8')) fail('404.html trùng index.html');
  }

  // 3. Không có fixture/route nội bộ.
  for (const file of files) {
    const path = rel(file);
    if (path.includes(FIXTURE_ROUTE) || path.includes(FIXTURE_ID)) fail(`Route/fixture nội bộ lọt vào dist: ${path}`);
  }

  // 4. Nội dung văn bản: fixture, base path, bí mật, link nội bộ phải trỏ tới file có thật.
  for (const file of files.filter((f) => statSync(f).isFile() && TEXT_EXT.test(f))) {
    const path = rel(file);
    const text = readFileSync(file, 'utf8');
    if (text.includes(FIXTURE_ID) || text.includes(FIXTURE_ROUTE)) fail(`${path}: nhắc tới fixture nội bộ`);
    if (text.includes(LEGACY_BASE)) fail(`${path}: còn base path ${LEGACY_BASE} (cần BASE_PATH=/)`);
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) fail(`${path}: khớp mẫu bí mật ${pattern}`);
    }
    if (!path.endsWith('.html')) continue;
    for (const [, attr, url] of text.matchAll(/\s(href|src)="([^"]*)"/g)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url) || url === '') continue;
      if (!url.startsWith('/')) {
        fail(`${path}: ${attr}="${url}" là đường dẫn tương đối`);
      } else if (!resolveAsset(url)) {
        fail(`${path}: ${attr}="${url}" không có file tương ứng trong dist`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Smoke build thất bại (${errors.length} lỗi):`);
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`Smoke build OK: ${relative(root, dist) || dist}`);
