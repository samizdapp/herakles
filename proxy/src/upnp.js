import { exec } from "child_process";
import { promisify } from "node:util";
const execProm = promisify(exec);

const listUPNP = async () => {
  return execProm("upnpc -l");
};

export const mapPort = async (privatePort, skipRetry = false) => {
  let success = false,
    publicPort = privatePort - 1;
  let error = null;
  let retry = 2;
  if (process.env.SKIP_UPNP == "true") {
    console.log("skip UPNP");
    return { success: false, publicPort: "" };
  }

  try {
    await listUPNP();
  } catch (e) {
    // upnp completely not available
    return { success: false, publicPort: "" };
  }

  do {
    publicPort++;
    error = await execProm(`upnpc -r ${privatePort} ${publicPort} TCP`)
      .then(({ stdout }) => {
        if (stdout.includes("TCP is redirected to internal")) {
          return null;
        } else {
          return true;
        }
      })
      .catch(async (e) => {
        await new Promise((r) => setTimeout(r, 2000));
        return e;
      });
  } while (error && publicPort - privatePort < 10);

  if (error && !skipRetry) {
    const success = await nukeUPNP();
    if (success) {
      return mapPort(privatePort, true);
    }
  }
  if (error) {
    console.warn("unable to open port", error);
  }

  success = !error;

  return { success, publicPort };
};
export const nukeUPNP = async () => {
  const { error, stdout, stderr } = await execProm("upnpc -l").catch(
    (error) => {
      console.error("error in promise catch", error);
      return { error };
    }
  );
  if (error) {
    console.error("error returned", error);
    return;
  }

  const { stdout: _localIP } = await execProm(
    `upnpc -l | grep "Local LAN ip address" | cut -d: -f2`
  );
  const localIP = _localIP.trim();

  const toClear = stdout
    .split("\n")
    .map((str) => str.trim())
    .map((line) => {
      if (!line) return false;
      try {
        const [_, protocol, __, redirect] = line.split(" ");
        if (["UDP", "TCP"].includes(protocol)) {
          const [port, ipport] = redirect?.split("->");
          const [ip] = ipport.split(":");
          if (ip !== localIP) {
            return { port, protocol };
          }
        }
      } catch (_e) {
        console.warn("error with line:", line, _e);
        return false;
      }

      return false;
    })
    .filter((_) => _);

  for (const { port, protocol } of toClear) {
    console.log("try to clear upnp entry", port, protocol);
    const success = await execProm(`upnpc -d ${port} ${protocol}`)
      .then(() => true)
      .catch((e) => {
        console.warn(e);
        return false;
      });
    if (success) {
      return success;
    }
  }

  return false;
};
