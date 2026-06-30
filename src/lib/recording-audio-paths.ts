const EXTENSIONS = ["", ".m4a", ".aac", ".opus", ".wav", ".mp3", ".caf", ".raw"];
const KNOWN_EXT = /\.(m4a|aac|opus|wav|mp3|caf|raw)$/i;

const PATH_PATTERNS = (uid: string, name: string) => [
  `${uid}/${name}`,
  `recordings/${uid}/${name}`,
  `recordings/${uid}/audio/${name}`,
  `users/${uid}/recordings/${name}`,
  `users/${uid}/audio/${name}`,
  `audio/${uid}/${name}`,
  `${uid}/recordings/${name}`,
];

export function candidateFileNames(fileName: string): string[] {
  const base = fileName.replace(KNOWN_EXT, "");
  const hasKnownExt = KNOWN_EXT.test(fileName);
  const names: string[] = [];

  if (hasKnownExt) names.push(fileName);

  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (!names.includes(candidate)) names.push(candidate);
  }

  return names;
}

export function candidatePaths(uid: string, fileName: string): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();

  for (const name of candidateFileNames(fileName)) {
    for (const path of PATH_PATTERNS(uid, name)) {
      if (!seen.has(path)) {
        seen.add(path);
        paths.push(path);
      }
    }
  }

  return paths;
}

export function downloadFileNameForPath(storagePath: string, fileName: string): string {
  const fromPath = storagePath.split("/").pop();
  if (fromPath && KNOWN_EXT.test(fromPath)) return fromPath;

  const extFromPath = storagePath.match(KNOWN_EXT)?.[0];
  const base = fileName.replace(KNOWN_EXT, "") || fromPath || "recording";
  return extFromPath ? `${base}${extFromPath}` : `${base}.m4a`;
}
