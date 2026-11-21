import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getSiteCmsPath, assertInsideBlog } from './paths.mjs';

export function getSiteCms() {
  const p = getSiteCmsPath();
  assertInsideBlog(p);
  if (!fs.existsSync(p)) {
    return { site_name: { name: '' }, theme: {}, site_ui: {}, guestbook: {} };
  }
  return yaml.load(fs.readFileSync(p, 'utf8')) || {};
}

export function saveSiteCms(data) {
  const p = getSiteCmsPath();
  assertInsideBlog(p);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, yaml.dump(data, { lineWidth: 120, noRefs: true }), 'utf8');
  return getSiteCms();
}
