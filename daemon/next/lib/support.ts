import platform from "platform";

export function isSupportedPlatform(p = platform) {
  return p.name?.startsWith(getSupportedPlatform());
}

export function getSupportedPlatform(p = platform) {

  switch (p.os?.family) {
    case "iOS":
      return "Safari";
    default:
      return "Chrome";
  }
}
