const REMOTE = /^(?:https?|libsql|wss?):/i;

export const isRemoteDatabase = (url: string) => REMOTE.test(url);

export type DatabaseLocation = {
  url: string;
  local: boolean;
  // A plain filesystem path whose folder the store creates and locks down.
  localPath: string | undefined;
};

export function databaseLocation(filename: string): DatabaseLocation {
  if (isRemoteDatabase(filename))
    return { url: filename, local: false, localPath: undefined };

  if (filename === ":memory:")
    return { url: "file::memory:", local: true, localPath: undefined };

  if (filename.startsWith("file:"))
    return { url: filename, local: true, localPath: undefined };

  return { url: `file:${filename}`, local: true, localPath: filename };
}
